import { Link } from 'react-router-dom'
import type { LeaderboardEntry, ChampionshipEntry } from '../api/client'

const MEDAL = ['🥇', '🥈', '🥉']

function rankColor(rank: number) {
  if (rank === 1) return 'var(--color-gold)'
  if (rank === 2) return 'var(--color-silver)'
  if (rank === 3) return 'var(--color-bronze)'
  return 'var(--color-text)'
}

interface Props {
  title: string
  entries: LeaderboardEntry[] | ChampionshipEntry[]
}

function isLeaderboardEntry(e: LeaderboardEntry | ChampionshipEntry): e is LeaderboardEntry {
  return 'rank' in e
}

export function Leaderboard({ title, entries }: Props) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--color-border)',
          fontWeight: 600,
          fontSize: 14,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-muted)',
        }}
      >
        {title}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {entries.slice(0, 15).map((entry, i) => {
            const rank = isLeaderboardEntry(entry) ? entry.rank : i + 1
            const count = isLeaderboardEntry(entry) ? entry.count : entry.count
            return (
              <tr
                key={entry.driver}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--color-surface2)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <td style={{ padding: '10px 20px', width: 48, color: rankColor(rank), fontWeight: 700, fontSize: 14 }}>
                  {rank <= 3 ? MEDAL[rank - 1] : `#${rank}`}
                </td>
                <td style={{ padding: '10px 4px' }}>
                  <Link
                    to={`/drivers/${encodeURIComponent(entry.driver)}`}
                    style={{ color: 'var(--color-text)', fontWeight: 500 }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-accent)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
                  >
                    {entry.driver}
                  </Link>
                </td>
                <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, color: rank <= 3 ? rankColor(rank) : 'var(--color-muted)', fontSize: 15 }}>
                  {count}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
