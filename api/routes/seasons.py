from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..aliases import load_alias_map, resolve_name, resolve_standings, resolve_race_winners
from ..calc import compute_season_data
from ..models import SeasonSummary, SeasonDetail, DriverStanding, ClassStandings

router = APIRouter()


async def _load_points_map(db: AsyncSession, season_id: int) -> dict[int, float] | None:
    """Return {finish_position: points} for the season, or None if not configured."""
    rows = await db.execute(text(
        "SELECT pse.finish_position, pse.points "
        "FROM season_points_structure sps "
        "JOIN points_structure_entries pse ON pse.structure_id = sps.structure_id "
        "WHERE sps.season_id = :sid AND sps.class_id IS NULL"
    ), {"sid": season_id})
    entries = rows.fetchall()
    if not entries:
        return None
    return {int(row.finish_position): float(row.points) for row in entries}


async def _load_driver_class_map(db: AsyncSession, season_id: int) -> dict[str, str]:
    """Return {raw_driver_name: class_name} for a multiclass season."""
    rows = await db.execute(text(
        "SELECT d.raw_name AS driver, c.name AS class_name "
        "FROM driver_season_class dsc "
        "JOIN drivers d ON d.id = dsc.driver_id "
        "JOIN classes c ON c.id = dsc.class_id "
        "WHERE dsc.season_id = :sid"
    ), {"sid": season_id})
    return {row.driver: row.class_name for row in rows}


async def _load_classes_for_season(db: AsyncSession, season_id: int) -> list[tuple[int, str]]:
    """Return [(class_id, class_name), ...] ordered by name."""
    rows = await db.execute(text(
        "SELECT DISTINCT c.id, c.name "
        "FROM driver_season_class dsc "
        "JOIN classes c ON c.id = dsc.class_id "
        "WHERE dsc.season_id = :sid ORDER BY c.name"
    ), {"sid": season_id})
    return [(row.id, row.name) for row in rows]


async def _load_points_map_for_class(
    db: AsyncSession, season_id: int, class_id: int
) -> dict[int, float] | None:
    """Per-class points map, falls back to global (class_id IS NULL) if none configured."""
    rows = await db.execute(text(
        "SELECT pse.finish_position, pse.points "
        "FROM season_points_structure sps "
        "JOIN points_structure_entries pse ON pse.structure_id = sps.structure_id "
        "WHERE sps.season_id = :sid AND sps.class_id = :cid"
    ), {"sid": season_id, "cid": class_id})
    entries = rows.fetchall()
    if entries:
        return {int(row.finish_position): float(row.points) for row in entries}
    return await _load_points_map(db, season_id)


async def _load_results(db: AsyncSession, season_id: int) -> list[dict]:
    """Fetch all race results for a season as plain dicts."""
    rows = await db.execute(text(
        "SELECT d.raw_name AS driver, rr.round_number, rr.sub_type, "
        "       rr.value_numeric, rr.value_flag, rr.is_asterisked "
        "FROM race_results rr "
        "JOIN drivers d ON d.id = rr.driver_id "
        "WHERE rr.season_id = :sid "
        "ORDER BY rr.round_number, rr.sub_type"
    ), {"sid": season_id})
    return [dict(row._mapping) for row in rows]


@router.get("/seasons", response_model=List[SeasonSummary])
async def list_seasons(db: AsyncSession = Depends(get_db)):
    alias_map = await load_alias_map(db)

    rows = await db.execute(text(
        "SELECT s.id, s.name, s.display_name, s.score_type, s.race_format, "
        "       s.champion, "
        "       (SELECT MAX(round_number) FROM rounds WHERE season_id = s.id) AS num_rounds, "
        "       (SELECT COUNT(DISTINCT driver_id) FROM race_results WHERE season_id = s.id) AS num_drivers "
        "FROM seasons s "
        "ORDER BY s.sort_order"
    ))
    seasons = rows.fetchall()

    result = []
    for s in seasons:
        result.append(SeasonSummary(
            name=s.name,
            display_name=s.display_name,
            race_format=s.race_format,
            score_type=s.score_type,
            num_rounds=s.num_rounds or 0,
            num_drivers=s.num_drivers or 0,
            champion=resolve_name(s.champion, alias_map) if s.champion else None,
        ))
    return result


@router.get("/seasons/{name}", response_model=SeasonDetail)
async def get_season(name: str, db: AsyncSession = Depends(get_db)):
    alias_map = await load_alias_map(db)

    # Case-insensitive lookup
    row = await db.execute(text(
        "SELECT * FROM seasons WHERE LOWER(name) = LOWER(:name)"
    ), {"name": name})
    season = row.fetchone()
    if season is None:
        raise HTTPException(status_code=404, detail=f"Season '{name}' not found")

    num_rounds_row = await db.execute(text(
        "SELECT MAX(round_number) AS n FROM rounds WHERE season_id = :sid"
    ), {"sid": season.id})
    num_rounds = num_rounds_row.scalar() or 0

    results = await _load_results(db, season.id)

    def _build_driver_standings(s_list: list[dict]) -> list[DriverStanding]:
        return [
            DriverStanding(
                pos=s["pos"],
                driver=s["driver"],
                wins=s["wins"],
                podiums=s["podiums"],
                dns=s["dns"],
                total=s["total"],
                rounds=s["rounds"],
            )
            for s in s_list
        ]

    if not season.is_multiclass:
        points_map = await _load_points_map(db, season.id)
        standings, race_winners = compute_season_data(
            results,
            score_type=season.score_type,
            race_format=season.race_format,
            has_drop_round=bool(season.has_drop_round),
            num_rounds=num_rounds,
            points_map=points_map,
        )
        resolve_standings(standings, alias_map)
        resolve_race_winners(race_winners, alias_map)
        champion = standings[0]["driver"] if standings else None

        return SeasonDetail(
            name=season.name,
            display_name=season.display_name,
            race_format=season.race_format,
            score_type=season.score_type,
            num_rounds=num_rounds,
            is_multiclass=False,
            champion=champion,
            standings=_build_driver_standings(standings),
            race_winners=race_winners,
            classes=[],
        )

    # Multiclass path
    driver_class_map = await _load_driver_class_map(db, season.id)
    season_classes = await _load_classes_for_season(db, season.id)

    class_standings_list = []
    for class_id, class_name in season_classes:
        class_results = [
            r for r in results
            if driver_class_map.get(r["driver"]) == class_name
        ]
        points_map = await _load_points_map_for_class(db, season.id, class_id)
        standings, race_winners = compute_season_data(
            class_results,
            score_type=season.score_type,
            race_format=season.race_format,
            has_drop_round=bool(season.has_drop_round),
            num_rounds=num_rounds,
            points_map=points_map,
        )
        resolve_standings(standings, alias_map)
        resolve_race_winners(race_winners, alias_map)
        champion = standings[0]["driver"] if standings else None
        class_standings_list.append(ClassStandings(
            class_name=class_name,
            champion=champion,
            standings=_build_driver_standings(standings),
            race_winners=race_winners,
        ))

    return SeasonDetail(
        name=season.name,
        display_name=season.display_name,
        race_format=season.race_format,
        score_type=season.score_type,
        num_rounds=num_rounds,
        is_multiclass=True,
        champion=None,
        standings=[],
        race_winners=[],
        classes=class_standings_list,
    )
