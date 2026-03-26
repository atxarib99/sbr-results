"""Championship standings and race winner calculations.

All functions take raw DB rows (as plain dicts) and return plain dicts.
Alias resolution is NOT applied here — callers handle that separately.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any


# ── Display value helpers ─────────────────────────────────────────────────────

def _display(value_numeric, value_flag) -> int | float | str | None:
    """Convert decomposed DB values into a display-friendly value."""
    if value_flag is not None:
        return value_flag.upper()  # 'DNS', 'DNF', 'DNP'
    if value_numeric is not None:
        v = float(value_numeric)
        return int(v) if v == int(v) else v
    return None


def _championship_score(
    value_numeric,
    value_flag: str | None,
    score_type: str,
    points_map: dict[int, float] | None,
) -> float:
    """Return championship points for a single race result."""
    if value_flag in ("dns", "dnf") or value_numeric is None:
        return 0.0
    if score_type == "points":
        return float(value_numeric)
    # position season — convert finish position to points via points_map
    pos = int(float(value_numeric))
    return float(points_map.get(pos, 0)) if points_map else 0.0


# ── Internal race winner detection ────────────────────────────────────────────

def _per_race_podiums(
    results: list[dict],
    score_type: str,
) -> dict[tuple[int, str], list[str]]:
    """
    Returns {(round_number, sub_type): [p1_driver, p2_driver, p3_driver]}
    sorted best-first (position 1 first for position seasons,
    highest points first for points seasons).

    Only numeric results are considered; DNS/DNF are ignored.
    """
    buckets: dict[tuple[int, str], list[tuple[float, str]]] = defaultdict(list)
    for row in results:
        if row["value_flag"] in ("dns", "dnf", "dnp") or row["value_numeric"] is None:
            continue
        key = (row["round_number"], row["sub_type"])
        buckets[key].append((float(row["value_numeric"]), row["driver"]))

    out: dict[tuple[int, str], list[str]] = {}
    for key, entries in buckets.items():
        # Position seasons: lowest number wins. Points seasons: highest wins.
        entries.sort(key=lambda x: x[0] if score_type == "position" else -x[0])
        out[key] = [drv for _, drv in entries[:3]]

    return out


# ── Public calculation functions ──────────────────────────────────────────────

def compute_season_data(
    results: list[dict],
    score_type: str,
    race_format: str,
    has_drop_round: bool,
    num_rounds: int,
    points_map: dict[int, float] | None = None,
) -> tuple[list[dict], list[dict]]:
    """
    Compute standings and race winners for a season.

    Parameters
    ----------
    results
        List of dicts from DB query, each with keys:
        driver (raw_name), round_number, sub_type,
        value_numeric, value_flag, is_asterisked.
    score_type
        'points' | 'position'
    race_format
        'single' | 'double'
    has_drop_round
        If True, each driver's worst-scoring round is excluded from their total.
    num_rounds
        Total number of rounds in the season (from the rounds table).
    points_map
        {finish_position: points} — required for position seasons.
        If None for a position season, raw position values are summed and
        sorted ascending (lower sum = better).

    Returns
    -------
    (standings, race_winners)
    standings  : list of dicts sorted best-first, each has keys:
                 driver, pos, wins, podiums, dns, total, rounds
    race_winners : list of dicts per round (single or double format)
    """
    # Build {driver: {round_num: {sub_type: row}}}
    driver_rounds: dict[str, dict[int, dict[str, dict]]] = defaultdict(
        lambda: defaultdict(dict)
    )
    for row in results:
        driver_rounds[row["driver"]][row["round_number"]][row["sub_type"]] = row

    # Pre-compute per-race podiums for wins/podiums counting
    podiums_map = _per_race_podiums(results, score_type)

    standings: list[dict] = []

    for driver, rounds_by_num in driver_rounds.items():
        dns_count = 0
        round_scores: list[tuple[int, float]] = []  # (round_num, score)

        for rn in sorted(rounds_by_num):
            round_total = 0.0
            for sub_type, row in rounds_by_num[rn].items():
                if row["value_flag"] in ("dns", "dnf"):
                    dns_count += 1
                round_total += _championship_score(
                    row["value_numeric"], row["value_flag"], score_type, points_map
                )
            round_scores.append((rn, round_total))

        # Drop worst round
        if has_drop_round and len(round_scores) > 1:
            worst = min(range(len(round_scores)), key=lambda i: round_scores[i][1])
            round_scores.pop(worst)

        total_pts = sum(s for _, s in round_scores)

        # Wins = count of (round, sub_type) where this driver is at index 0
        # Podiums = count of (round, sub_type) where this driver is in top 3
        wins = 0
        podiums = 0
        for rn, sub_races in rounds_by_num.items():
            for sub_type in sub_races:
                ranked = podiums_map.get((rn, sub_type), [])
                if ranked and ranked[0] == driver:
                    wins += 1
                if driver in ranked:
                    podiums += 1

        # Build rounds output for the API response
        rounds_out = _build_rounds_output(rounds_by_num, race_format, num_rounds)

        # Represent total as int if it's a whole number
        total_display: int | float | None
        if score_type == "points" or points_map is not None:
            total_display = int(total_pts) if total_pts == int(total_pts) else total_pts
        else:
            # No points_map for position season: show None, sort by raw sum ascending
            total_display = None

        standings.append({
            "driver":  driver,
            "pos":     None,   # filled in after sort
            "wins":    wins,
            "podiums": podiums,
            "dns":     dns_count,
            "total":   total_display,
            "_sort_key": _sort_key(total_pts, score_type, points_map, rounds_by_num),
        })

    # Sort descending in all cases.
    # Points / position-with-map: higher total = better.
    # Position-without-map: _sort_key = -raw_sum, so higher (less negative) = lower sum = better.
    standings.sort(key=lambda s: s["_sort_key"], reverse=True)

    for i, s in enumerate(standings):
        s["pos"] = i + 1
        del s["_sort_key"]

    race_winners = compute_race_winners(results, score_type, race_format, num_rounds)
    return standings, race_winners


def _sort_key(
    total_pts: float,
    score_type: str,
    points_map: dict | None,
    rounds_by_num: dict,
) -> float:
    """Return the value used to sort a driver in championship order."""
    if score_type == "points" or points_map is not None:
        return total_pts
    # Position season without points_map: lower raw position sum = better.
    # Return negative so we can use reverse=True uniformly, OR return raw sum
    # and sort with reverse=False — we handle this in the caller.
    raw_sum = sum(
        float(row["value_numeric"])
        for sub_races in rounds_by_num.values()
        for row in sub_races.values()
        if row["value_numeric"] is not None and row["value_flag"] is None
    )
    # Return as negative so sort(reverse=True) still works (highest = best = lowest position sum)
    return -raw_sum


def _build_rounds_output(
    rounds_by_num: dict[int, dict[str, dict]],
    race_format: str,
    num_rounds: int,
) -> list[dict]:
    """Build the per-round list in the shape expected by the API."""
    output = []
    for rn in range(1, num_rounds + 1):
        sub = rounds_by_num.get(rn, {})
        if race_format == "double":
            fr = sub.get("feature")
            rr = sub.get("reverse")
            output.append({
                "feature": _display(
                    fr["value_numeric"] if fr else None,
                    fr["value_flag"]    if fr else None,
                ),
                "reverse": _display(
                    rr["value_numeric"] if rr else None,
                    rr["value_flag"]    if rr else None,
                ),
            })
        else:
            row = sub.get("single")
            output.append({"result": _display(
                row["value_numeric"] if row else None,
                row["value_flag"]    if row else None,
            )})
    return output


def compute_race_winners(
    results: list[dict],
    score_type: str,
    race_format: str,
    num_rounds: int,
) -> list[dict]:
    """
    Return per-round race winner dicts.
    Single format: [{round: N, winner: str | None}]
    Double format: [{round: N, feature_winner: str | None, reverse_winner: str | None}]
    """
    podiums = _per_race_podiums(results, score_type)

    winners = []
    for rn in range(1, num_rounds + 1):
        if race_format == "double":
            fw = podiums.get((rn, "feature"), [])
            rw = podiums.get((rn, "reverse"), [])
            winners.append({
                "round":          rn,
                "feature_winner": fw[0] if fw else None,
                "reverse_winner": rw[0] if rw else None,
            })
        else:
            w = podiums.get((rn, "single"), [])
            winners.append({"round": rn, "winner": w[0] if w else None})

    return winners


def compute_driver_season_stats(
    results: list[dict],
    score_type: str,
    race_format: str,
    has_drop_round: bool,
    num_rounds: int,
    points_map: dict[int, float] | None = None,
) -> dict[str, dict]:
    """
    Compute per-driver statistics for a season.
    Returns {raw_driver_name: {pos, wins, podiums, dns, total, races_entered, rounds}}
    """
    standings, _ = compute_season_data(
        results, score_type, race_format, has_drop_round, num_rounds, points_map
    )
    # Also count races_entered (rounds with at least one numeric/dns/dnf result)
    entered_by_driver: dict[str, int] = defaultdict(int)
    driver_rounds_map: dict[str, dict[int, dict[str, dict]]] = defaultdict(
        lambda: defaultdict(dict)
    )
    for row in results:
        driver_rounds_map[row["driver"]][row["round_number"]][row["sub_type"]] = row

    for driver, rounds_by_num in driver_rounds_map.items():
        for rn, sub_races in rounds_by_num.items():
            for row in sub_races.values():
                if row["value_numeric"] is not None or row["value_flag"] in ("dns", "dnf"):
                    entered_by_driver[driver] += 1
                    break  # count round once even in double format

    return {
        s["driver"]: {**s, "races_entered": entered_by_driver.get(s["driver"], 0)}
        for s in standings
    }
