import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type GlobalStats, type Leaderboard, type SeasonSummary } from '../api/client'
import { StatCard } from '../components/StatCard'
import { Leaderboard as LeaderboardComp } from '../components/Leaderboard'

type Tab = 'wins' | 'podiums' | 'seasons_participated' | 'championships'

const TABS: { key: Tab; label: string }[] = [
  { key: 'wins', label: 'Wins' },
  { key: 'podiums', label: 'Podiums' },
  { key: 'seasons_participated', label: 'Seasons' },
  { key: 'championships', label: 'Championships' },
]

export function Home() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [lb, setLb] = useState<Leaderboard | null>(null)
  const [seasons, setSeasons] = useState<SeasonSummary[]>([])
  const [tab, setTab] = useState<Tab>('wins')
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([api.stats(), api.leaderboard(), api.seasons()])
      .then(([s, l, ss]) => { setStats(s); setLb(l); setSeasons(ss) })
      .catch(() => setError(true))
  }, [])

  if (error) return <div style={{ padding: 40, color: 'var(--color-muted)' }}>Failed to load data.</div>
  if (!stats || !lb) return <div style={{ padding: 40, color: 'var(--color-muted)' }}>Loading…</div>

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', fontWeight: 600, marginBottom: 12 }}>
          All-Time Statistics
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em' }}>
          SBR Sim Racing League
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 16, margin: 0 }}>
          {stats.total_seasons} seasons · {stats.total_races} total races · {stats.unique_drivers} unique drivers
        </p>
      </div>

      {/* Big stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 56 }}>
        <StatCard label="Total Seasons" value={stats.total_seasons} />
        <StatCard label="Total Races" value={stats.total_races} />
        <StatCard label="Unique Drivers" value={stats.unique_drivers} />
        <StatCard label="Total Wins" value={stats.total_wins_recorded} />
        <StatCard label="Total Podiums" value={stats.total_podiums_recorded} />
        <StatCard
          label="Most Dominant"
          value={stats.most_wins_driver ?? '—'}
          sub={`${stats.most_wins_count} wins`}
          accent
        />
        <StatCard
          label="Most Podiums"
          value={stats.most_podiums_driver ?? '—'}
          sub={`${stats.most_podiums_count} podiums`}
        />
        <StatCard
          label="Most Active"
          value={stats.most_races_driver ?? '—'}
          sub={`${stats.most_races_count} races`}
        />
      </div>

      {/* Leaderboards */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>All-Time Leaderboard</h2>
          <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', padding: 4, borderRadius: 8, border: '1px solid var(--color-border)' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 5,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: tab === t.key ? 600 : 400,
                  background: tab === t.key ? 'var(--color-surface2)' : 'transparent',
                  color: tab === t.key ? 'var(--color-text)' : 'var(--color-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <LeaderboardComp
          title={TABS.find(t => t.key === tab)!.label}
          entries={lb[tab]}
        />
      </section>

      {/* Season Timeline */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>All Seasons</h2>
          <Link to="/seasons" style={{ color: 'var(--color-accent)', fontSize: 14 }}>View all →</Link>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {seasons.map(s => (
            <Link
              key={s.name}
              to={`/seasons/${encodeURIComponent(s.name)}`}
              style={{
                flexShrink: 0,
                width: 160,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '14px 16px',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
            >
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.display_name}
              </div>
              {s.champion && (
                <div style={{ color: 'var(--color-gold)', fontSize: 12, fontWeight: 600 }}>🏆 {s.champion}</div>
              )}
              <div style={{ color: 'var(--color-muted)', fontSize: 11, marginTop: 6 }}>{s.num_rounds} rounds</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
