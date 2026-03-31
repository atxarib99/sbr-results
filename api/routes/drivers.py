from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..aliases import load_alias_map, resolve_name
from ..calc import compute_driver_season_stats
from ..models import DriverProfile, DriverSeasonSummary
from ..multiclass import (
    load_points_map,
    load_points_map_for_class,
    load_driver_class_map,
    load_classes_for_season,
)

router = APIRouter()


@router.get("/drivers", response_model=List[str])
async def list_drivers(db: AsyncSession = Depends(get_db)):
    alias_map = await load_alias_map(db)

    rows = await db.execute(text(
        "SELECT DISTINCT d.raw_name "
        "FROM drivers d "
        "JOIN race_results rr ON rr.driver_id = d.id "
        "ORDER BY d.raw_name"
    ))
    names = [resolve_name(row.raw_name, alias_map) for row in rows]
    # Deduplicate and sort (multiple raw names may resolve to the same display name)
    return sorted(set(names))


@router.get("/drivers/{name}", response_model=DriverProfile)
async def get_driver(name: str, db: AsyncSession = Depends(get_db)):
    alias_map = await load_alias_map(db)

    # Build reverse map: display_name → set of raw_names
    # (multiple raw names may alias to the same display name)
    display_to_raws: dict[str, set[str]] = {}
    for raw, display in alias_map.items():
        display_to_raws.setdefault(display, set()).add(raw)

    # Find which raw names correspond to the requested display name.
    # Search is case-insensitive.
    name_lower = name.lower()
    matched_display: str | None = None
    raw_names: set[str] = set()

    # Check if it matches a known alias display name
    for display, raws in display_to_raws.items():
        if display.lower() == name_lower:
            matched_display = display
            raw_names = raws
            break

    # Check if it matches a raw name directly (no alias configured)
    if matched_display is None:
        raw_row = await db.execute(text(
            "SELECT raw_name FROM drivers WHERE LOWER(raw_name) = LOWER(:n)"
        ), {"n": name})
        raw_match = raw_row.fetchone()
        if raw_match:
            matched_display = raw_match.raw_name
            raw_names = {raw_match.raw_name}

    if matched_display is None:
        raise HTTPException(status_code=404, detail=f"Driver '{name}' not found")

    display_name = matched_display

    # Load all seasons in order
    seasons_rows = await db.execute(text(
        "SELECT id, name, display_name, score_type, race_format, has_drop_round, is_multiclass "
        "FROM seasons ORDER BY sort_order"
    ))
    all_seasons = seasons_rows.fetchall()

    # For each season, fetch this driver's results (matching any of their raw names)
    raw_names_list = list(raw_names)
    season_summaries: list[DriverSeasonSummary] = []
    total_wins = 0
    total_podiums = 0
    total_races = 0
    championships = 0

    for season in all_seasons:
        # Fetch all results for this season (all drivers) for standings computation
        all_results = await db.execute(text(
            "SELECT d.raw_name AS driver, rr.round_number, rr.sub_type, "
            "       rr.value_numeric, rr.value_flag, rr.is_asterisked "
            "FROM race_results rr "
            "JOIN drivers d ON d.id = rr.driver_id "
            "WHERE rr.season_id = :sid "
            "ORDER BY rr.round_number, rr.sub_type"
        ), {"sid": season.id})
        results = [dict(row._mapping) for row in all_results]

        # Check if this driver participated at all
        driver_results = [r for r in results if r["driver"] in raw_names]
        if not driver_results:
            continue

        # Get num_rounds
        nr_row = await db.execute(text(
            "SELECT MAX(round_number) AS n FROM rounds WHERE season_id = :sid"
        ), {"sid": season.id})
        num_rounds = nr_row.scalar() or 0

        if season.is_multiclass:
            # Determine which class this driver belongs to in this season
            driver_class_map = await load_driver_class_map(db, season.id)
            driver_class: str | None = None
            for raw in raw_names:
                if raw in driver_class_map:
                    driver_class = driver_class_map[raw]
                    break
            if driver_class is None:
                continue  # driver not classified in this multiclass season

            season_classes = await load_classes_for_season(db, season.id)
            class_id = next((cid for cid, cname in season_classes if cname == driver_class), None)
            points_map = await load_points_map_for_class(db, season.id, class_id) if class_id else None

            # Only rank against drivers in the same class
            class_results = [r for r in results if driver_class_map.get(r["driver"]) == driver_class]
            stats = compute_driver_season_stats(
                class_results,
                score_type=season.score_type,
                race_format=season.race_format,
                has_drop_round=bool(season.has_drop_round),
                num_rounds=num_rounds,
                points_map=points_map,
            )
        else:
            points_map = await load_points_map(db, season.id)
            stats = compute_driver_season_stats(
                results,
                score_type=season.score_type,
                race_format=season.race_format,
                has_drop_round=bool(season.has_drop_round),
                num_rounds=num_rounds,
                points_map=points_map,
            )

        # Merge stats from all raw names that match this driver
        # (in case same person used different names in the same season)
        merged: dict | None = None
        for raw in raw_names:
            if raw in stats:
                if merged is None:
                    merged = dict(stats[raw])
                else:
                    # Accumulate wins, podiums, dns; keep lowest pos
                    merged["wins"]    += stats[raw]["wins"]
                    merged["podiums"] += stats[raw]["podiums"]
                    merged["dns"]     += stats[raw]["dns"]
                    merged["races_entered"] += stats[raw]["races_entered"]
                    if stats[raw]["pos"] is not None:
                        if merged["pos"] is None or stats[raw]["pos"] < merged["pos"]:
                            merged["pos"] = stats[raw]["pos"]

        if merged is None:
            continue

        total_wins    += merged["wins"]
        total_podiums += merged["podiums"]
        total_races   += merged["races_entered"]

        if merged["pos"] == 1:
            championships += 1

        season_summaries.append(DriverSeasonSummary(
            season=season.name,
            display_name=season.display_name,
            pos=merged["pos"],
            wins=merged["wins"],
            podiums=merged["podiums"],
            dns=merged["dns"],
            races_entered=merged["races_entered"],
            rounds=merged["rounds"],
        ))

    win_pct    = round(total_wins    / total_races * 100, 1) if total_races > 0 else 0.0
    podium_pct = round(total_podiums / total_races * 100, 1) if total_races > 0 else 0.0

    best_by_wins    = max(season_summaries, key=lambda s: s.wins,    default=None)
    best_by_podiums = max(season_summaries, key=lambda s: s.podiums, default=None)

    return DriverProfile(
        name=display_name,
        total_wins=total_wins,
        total_podiums=total_podiums,
        championships=championships,
        seasons_entered=len(season_summaries),
        races_entered=total_races,
        win_pct=win_pct,
        podium_pct=podium_pct,
        best_season_by_wins=(
            best_by_wins.season if best_by_wins and best_by_wins.wins > 0 else None
        ),
        best_season_by_podiums=(
            best_by_podiums.season if best_by_podiums and best_by_podiums.podiums > 0 else None
        ),
        seasons=season_summaries,
    )
