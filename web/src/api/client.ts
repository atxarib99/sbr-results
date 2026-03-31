const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

// --- Types ---

export interface GlobalStats {
  total_seasons: number
  total_races: number
  unique_drivers: number
  total_wins_recorded: number
  total_podiums_recorded: number
  most_wins_driver: string | null
  most_wins_count: number
  most_podiums_driver: string | null
  most_podiums_count: number
  most_races_driver: string | null
  most_races_count: number
}

export interface LeaderboardEntry {
  rank: number
  driver: string
  count: number
}

export interface ChampionshipEntry {
  driver: string
  count: number
}

export interface Leaderboard {
  wins: LeaderboardEntry[]
  podiums: LeaderboardEntry[]
  seasons_participated: LeaderboardEntry[]
  championships: ChampionshipEntry[]
}

export interface SeasonSummary {
  name: string
  display_name: string
  race_format: 'single' | 'double'
  score_type: 'points' | 'position'
  num_rounds: number
  num_drivers: number
  champion: string | null
}

export type RoundResult =
  | { result: number | string | null }
  | { feature: number | string | null; reverse: number | string | null }

export interface DriverStanding {
  pos: number | null
  driver: string
  wins: number
  podiums: number
  dns: number
  total: number | null
  rounds: RoundResult[]
}

export interface SingleRaceWinner {
  round: number
  winner: string | null
}

export interface DoubleRaceWinner {
  round: number
  feature_winner: string | null
  reverse_winner: string | null
}

export interface ClassStandings {
  class_name: string
  champion: string | null
  standings: DriverStanding[]
  race_winners: (SingleRaceWinner | DoubleRaceWinner)[]
}

export interface SeasonDetail extends SeasonSummary {
  is_multiclass: boolean
  standings: DriverStanding[]
  race_winners: (SingleRaceWinner | DoubleRaceWinner)[]
  classes: ClassStandings[]
}

export interface DriverSeasonSummary {
  season: string
  display_name: string
  pos: number | null
  wins: number
  podiums: number
  dns: number
  races_entered: number
  rounds: RoundResult[]
}

export interface DriverProfile {
  name: string
  total_wins: number
  total_podiums: number
  championships: number
  seasons_entered: number
  races_entered: number
  win_pct: number
  podium_pct: number
  best_season_by_wins: string | null
  best_season_by_podiums: string | null
  seasons: DriverSeasonSummary[]
}

// --- API Functions ---

export const api = {
  stats: () => get<GlobalStats>('/api/stats'),
  leaderboard: () => get<Leaderboard>('/api/leaderboard'),
  drivers: () => get<string[]>('/api/drivers'),
  driver: (name: string) => get<DriverProfile>(`/api/drivers/${encodeURIComponent(name)}`),
  seasons: () => get<SeasonSummary[]>('/api/seasons'),
  season: (name: string) => get<SeasonDetail>(`/api/seasons/${encodeURIComponent(name)}`),
}
