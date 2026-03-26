from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..aliases import load_alias_map, resolve_name
from ..calc import compute_season_data
from ..models import GlobalStats, Leaderboard, LeaderboardEntry, ChampionshipEntry

router = APIRouter()


def _make_ranked(items: list[tuple[str, int]]) -> list[LeaderboardEntry]:
    """Convert a sorted (driver, count) list to ranked LeaderboardEntry list."""
    result = []
    prev_count = None
    rank = 0
    skip = 0
    for drv, count in items:
        skip += 1
        if count != prev_count:
            rank = skip
        prev_count = count
        result.append(LeaderboardEntry(rank=rank, driver=drv, count=count))
    return result


@router.get("/stats", response_model=GlobalStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    alias_map = await load_alias_map(db)

    # Season counts
    seasons_row = await db.execute(text("SELECT COUNT(*) FROM seasons"))
    total_seasons = seasons_row.scalar() or 0

    # Total races = sum of rounds, doubled for double-format seasons
    races_row = await db.execute(text(
        "SELECT s.race_format, COUNT(r.round_number) AS cnt "
        "FROM seasons s "
        "JOIN rounds r ON r.season_id = s.id "
        "GROUP BY s.id, s.race_format"
    ))
    total_races = 0
    for row in races_row:
        total_races += row.cnt * 2 if row.race_format == "double" else row.cnt

    # Unique drivers (resolved display names)
    drivers_row = await db.execute(text(
        "SELECT DISTINCT d.raw_name "
        "FROM drivers d "
        "JOIN race_results rr ON rr.driver_id = d.id"
    ))
    unique_display = {resolve_name(r.raw_name, alias_map) for r in drivers_row}
    unique_drivers = len(unique_display)

    # Wins and podiums per driver — derived from race_results
    # We need all results to run calc, so load season metadata and compute
    wins_by_display:    dict[str, int] = {}
    podiums_by_display: dict[str, int] = {}
    races_by_display:   dict[str, int] = {}

    seasons_meta = await db.execute(text(
        "SELECT id, score_type, race_format, has_drop_round FROM seasons"
    ))
    all_seasons = seasons_meta.fetchall()

    for season in all_seasons:
        results_rows = await db.execute(text(
            "SELECT d.raw_name AS driver, rr.round_number, rr.sub_type, "
            "       rr.value_numeric, rr.value_flag, rr.is_asterisked "
            "FROM race_results rr "
            "JOIN drivers d ON d.id = rr.driver_id "
            "WHERE rr.season_id = :sid"
        ), {"sid": season.id})
        results = [dict(r._mapping) for r in results_rows]
        if not results:
            continue

        nr_row = await db.execute(text(
            "SELECT MAX(round_number) AS n FROM rounds WHERE season_id = :sid"
        ), {"sid": season.id})
        num_rounds = nr_row.scalar() or 0

        pm_rows = await db.execute(text(
            "SELECT pse.finish_position, pse.points "
            "FROM season_points_structure sps "
            "JOIN points_structure_entries pse ON pse.structure_id = sps.structure_id "
            "WHERE sps.season_id = :sid AND sps.class_id IS NULL"
        ), {"sid": season.id})
        pm_entries = pm_rows.fetchall()
        points_map = {int(r.finish_position): float(r.points) for r in pm_entries} or None

        standings, _ = compute_season_data(
            results,
            score_type=season.score_type,
            race_format=season.race_format,
            has_drop_round=bool(season.has_drop_round),
            num_rounds=num_rounds,
            points_map=points_map,
        )

        # Collect rounds for race counting
        driver_rounds_entered: dict[str, set[int]] = {}
        for row in results:
            if row["value_numeric"] is not None or row["value_flag"] in ("dns", "dnf"):
                raw = row["driver"]
                driver_rounds_entered.setdefault(raw, set()).add(row["round_number"])

        for s in standings:
            raw = s["driver"]
            display = resolve_name(raw, alias_map)
            wins_by_display[display]    = wins_by_display.get(display, 0)    + s["wins"]
            podiums_by_display[display] = podiums_by_display.get(display, 0) + s["podiums"]
            races_by_display[display]   = (
                races_by_display.get(display, 0) + len(driver_rounds_entered.get(raw, set()))
            )

    total_wins    = sum(wins_by_display.values())
    total_podiums = sum(podiums_by_display.values())

    wins_sorted    = sorted(wins_by_display.items(),    key=lambda x: -x[1])
    podiums_sorted = sorted(podiums_by_display.items(), key=lambda x: -x[1])
    races_sorted   = sorted(races_by_display.items(),   key=lambda x: -x[1])

    return GlobalStats(
        total_seasons=total_seasons,
        total_races=total_races,
        unique_drivers=unique_drivers,
        total_wins_recorded=total_wins,
        total_podiums_recorded=total_podiums,
        most_wins_driver=wins_sorted[0][0]    if wins_sorted    else None,
        most_wins_count=wins_sorted[0][1]     if wins_sorted    else 0,
        most_podiums_driver=podiums_sorted[0][0] if podiums_sorted else None,
        most_podiums_count=podiums_sorted[0][1]  if podiums_sorted else 0,
        most_races_driver=races_sorted[0][0]  if races_sorted   else None,
        most_races_count=races_sorted[0][1]   if races_sorted   else 0,
    )


@router.get("/leaderboard", response_model=Leaderboard)
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    alias_map = await load_alias_map(db)

    wins_by_display:    dict[str, int] = {}
    podiums_by_display: dict[str, int] = {}
    seasons_by_display: dict[str, int] = {}
    champs_by_display:  dict[str, int] = {}

    seasons_meta = await db.execute(text(
        "SELECT id, score_type, race_format, has_drop_round FROM seasons"
    ))
    all_seasons = seasons_meta.fetchall()

    for season in all_seasons:
        results_rows = await db.execute(text(
            "SELECT d.raw_name AS driver, rr.round_number, rr.sub_type, "
            "       rr.value_numeric, rr.value_flag, rr.is_asterisked "
            "FROM race_results rr "
            "JOIN drivers d ON d.id = rr.driver_id "
            "WHERE rr.season_id = :sid"
        ), {"sid": season.id})
        results = [dict(r._mapping) for r in results_rows]
        if not results:
            continue

        nr_row = await db.execute(text(
            "SELECT MAX(round_number) AS n FROM rounds WHERE season_id = :sid"
        ), {"sid": season.id})
        num_rounds = nr_row.scalar() or 0

        pm_rows = await db.execute(text(
            "SELECT pse.finish_position, pse.points "
            "FROM season_points_structure sps "
            "JOIN points_structure_entries pse ON pse.structure_id = sps.structure_id "
            "WHERE sps.season_id = :sid AND sps.class_id IS NULL"
        ), {"sid": season.id})
        pm_entries = pm_rows.fetchall()
        points_map = {int(r.finish_position): float(r.points) for r in pm_entries} or None

        standings, _ = compute_season_data(
            results,
            score_type=season.score_type,
            race_format=season.race_format,
            has_drop_round=bool(season.has_drop_round),
            num_rounds=num_rounds,
            points_map=points_map,
        )

        # Track participating drivers and season champion
        season_participants: set[str] = set()
        for s in standings:
            raw = s["driver"]
            display = resolve_name(raw, alias_map)
            season_participants.add(display)
            wins_by_display[display]    = wins_by_display.get(display, 0)    + s["wins"]
            podiums_by_display[display] = podiums_by_display.get(display, 0) + s["podiums"]

        for display in season_participants:
            seasons_by_display[display] = seasons_by_display.get(display, 0) + 1

        if standings:
            champ_raw     = standings[0]["driver"]
            champ_display = resolve_name(champ_raw, alias_map)
            champs_by_display[champ_display] = champs_by_display.get(champ_display, 0) + 1

    wins_ranked    = _make_ranked(sorted(wins_by_display.items(),    key=lambda x: -x[1]))
    podiums_ranked = _make_ranked(sorted(podiums_by_display.items(), key=lambda x: -x[1]))
    seasons_ranked = _make_ranked(sorted(seasons_by_display.items(), key=lambda x: -x[1]))

    champ_entries = sorted(
        [ChampionshipEntry(driver=drv, count=cnt) for drv, cnt in champs_by_display.items()],
        key=lambda x: -x.count,
    )

    return Leaderboard(
        wins=wins_ranked,
        podiums=podiums_ranked,
        seasons_participated=seasons_ranked,
        championships=champ_entries,
    )
