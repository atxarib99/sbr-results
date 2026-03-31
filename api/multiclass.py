"""Shared helpers for multiclass season queries."""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def load_points_map(db: AsyncSession, season_id: int) -> dict[int, float] | None:
    """Return {finish_position: points} for the season's global structure, or None."""
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


async def load_points_map_for_class(
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
    return await load_points_map(db, season_id)


async def load_driver_class_map(db: AsyncSession, season_id: int) -> dict[str, str]:
    """Return {raw_driver_name: class_name} for a multiclass season."""
    rows = await db.execute(text(
        "SELECT d.raw_name AS driver, c.name AS class_name "
        "FROM driver_season_class dsc "
        "JOIN drivers d ON d.id = dsc.driver_id "
        "JOIN classes c ON c.id = dsc.class_id "
        "WHERE dsc.season_id = :sid"
    ), {"sid": season_id})
    return {row.driver: row.class_name for row in rows}


async def load_classes_for_season(db: AsyncSession, season_id: int) -> list[tuple[int, str]]:
    """Return [(class_id, class_name), ...] ordered by name."""
    rows = await db.execute(text(
        "SELECT DISTINCT c.id, c.name "
        "FROM driver_season_class dsc "
        "JOIN classes c ON c.id = dsc.class_id "
        "WHERE dsc.season_id = :sid ORDER BY c.name"
    ), {"sid": season_id})
    return [(row.id, row.name) for row in rows]
