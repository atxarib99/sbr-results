"""Pydantic response models for the SBR API."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel


# --- Stats ---

class GlobalStats(BaseModel):
    total_seasons: int
    total_races: int
    unique_drivers: int
    total_wins_recorded: int
    total_podiums_recorded: int
    most_wins_driver: Optional[str]
    most_wins_count: int
    most_podiums_driver: Optional[str]
    most_podiums_count: int
    most_races_driver: Optional[str]
    most_races_count: int


# --- Leaderboard ---

class LeaderboardEntry(BaseModel):
    rank: int
    driver: str
    count: int


class ChampionshipEntry(BaseModel):
    driver: str
    count: int


class Leaderboard(BaseModel):
    wins: List[LeaderboardEntry]
    podiums: List[LeaderboardEntry]
    seasons_participated: List[LeaderboardEntry]
    championships: List[ChampionshipEntry]


# --- Seasons ---

class RaceResult(BaseModel):
    result: Optional[Union[int, str]]  # int score/position, or "DNS"/"DNF"/None


class DoubleRoundResult(BaseModel):
    feature: Optional[Union[int, str]]
    reverse: Optional[Union[int, str]]


class DriverStanding(BaseModel):
    pos: Optional[int]
    driver: str
    wins: int
    podiums: int
    dns: int
    total: Optional[int]
    rounds: List[Dict[str, Any]]  # {result: ...} or {feature: ..., reverse: ...}


class SingleRaceWinner(BaseModel):
    round: int
    winner: Optional[str]


class DoubleRaceWinner(BaseModel):
    round: int
    feature_winner: Optional[str]
    reverse_winner: Optional[str]


class SeasonSummary(BaseModel):
    name: str
    display_name: str
    race_format: str  # "single" | "double"
    score_type: str   # "points" | "position"
    num_rounds: int
    num_drivers: int
    champion: Optional[str]


class ClassStandings(BaseModel):
    class_name: str
    champion: Optional[str]
    standings: List[DriverStanding]
    race_winners: List[Dict[str, Any]]


class SeasonDetail(BaseModel):
    name: str
    display_name: str
    race_format: str
    score_type: str
    num_rounds: int
    is_multiclass: bool
    champion: Optional[str]
    standings: List[DriverStanding]
    race_winners: List[Dict[str, Any]]
    classes: List[ClassStandings]


# --- Drivers ---

class DriverSeasonSummary(BaseModel):
    season: str
    display_name: str
    pos: Optional[int]
    wins: int
    podiums: int
    dns: int
    races_entered: int
    rounds: List[Dict[str, Any]]


class DriverProfile(BaseModel):
    name: str
    total_wins: int
    total_podiums: int
    championships: int
    seasons_entered: int
    races_entered: int
    win_pct: float
    podium_pct: float
    best_season_by_wins: Optional[str]
    best_season_by_podiums: Optional[str]
    seasons: List[DriverSeasonSummary]
