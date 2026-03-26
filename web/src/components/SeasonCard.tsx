import { Link } from 'react-router-dom'
import type { SeasonSummary } from '../api/client'

interface Props {
  season: SeasonSummary
}

export function SeasonCard({ season }: Props) {
  return (
    <Link
      to={`/seasons/${encodeURIComponent(season.name)}`}
      style={{
        display: 'block',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '16px 20px',
        transition: 'border-color 0.15s, transform 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--color-accent)'
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--color-border)'
        el.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{season.display_name}</div>
        <span
          style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 999,
            background: season.race_format === 'double' ? 'rgba(224,0,0,0.15)' : 'rgba(255,255,255,0.07)',
            color: season.race_format === 'double' ? 'var(--color-accent)' : 'var(--color-muted)',
            border: `1px solid ${season.race_format === 'double' ? 'rgba(224,0,0,0.3)' : 'var(--color-border)'}`,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {season.race_format === 'double' ? '2× per round' : 'Single race'}
        </span>
      </div>
      {season.champion && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--color-gold)', fontSize: 14 }}>🏆</span>
          <span style={{ color: 'var(--color-gold)', fontWeight: 600, fontSize: 14 }}>{season.champion}</span>
        </div>
      )}
      <div style={{ marginTop: 10, display: 'flex', gap: 16, color: 'var(--color-muted)', fontSize: 12 }}>
        <span>{season.num_rounds} rounds</span>
        <span>{season.num_drivers} drivers</span>
        <span>{season.score_type === 'position' ? 'Position scoring' : 'Points'}</span>
      </div>
    </Link>
  )
}
