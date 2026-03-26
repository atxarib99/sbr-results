"""Driver name alias resolution.

The database stores raw xlsx names (e.g. "ARI").
The driver_aliases + canonical_players tables map those to display names.
If a raw name has no alias row it is returned as-is.
"""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def load_alias_map(db: AsyncSession) -> dict[str, str]:
    """Return {raw_name: display_name} for every configured alias."""
    result = await db.execute(text(
        "SELECT da.raw_name, cp.display_name "
        "FROM driver_aliases da "
        "JOIN canonical_players cp ON cp.id = da.player_id"
    ))
    return {row.raw_name: row.display_name for row in result}


def resolve_name(raw_name: str, alias_map: dict[str, str]) -> str:
    """Return the display name for raw_name, or raw_name itself if no alias exists."""
    return alias_map.get(raw_name, raw_name)


def resolve_standings(standings: list[dict], alias_map: dict[str, str]) -> list[dict]:
    """Apply alias resolution to the 'driver' field of every standing in-place."""
    for s in standings:
        s["driver"] = resolve_name(s["driver"], alias_map)
    return standings


def resolve_race_winners(race_winners: list[dict], alias_map: dict[str, str]) -> list[dict]:
    """Apply alias resolution to winner fields in race winner dicts in-place."""
    for rw in race_winners:
        if "winner" in rw and rw["winner"] is not None:
            rw["winner"] = resolve_name(rw["winner"], alias_map)
        if "feature_winner" in rw and rw["feature_winner"] is not None:
            rw["feature_winner"] = resolve_name(rw["feature_winner"], alias_map)
        if "reverse_winner" in rw and rw["reverse_winner"] is not None:
            rw["reverse_winner"] = resolve_name(rw["reverse_winner"], alias_map)
    return race_winners
