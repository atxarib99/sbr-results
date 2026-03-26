import { Link } from 'react-router-dom'

interface Props {
  name: string
  wins?: number
  podiums?: number
  seasons?: number
}

export function DriverCard({ name, wins = 0, podiums = 0, seasons = 0 }: Props) {
  const initials = name
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')

  return (
    <Link
      to={`/drivers/${encodeURIComponent(name)}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '14px 16px',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'var(--color-surface2)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 13,
          color: 'var(--color-muted)',
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 3 }}>
          {wins}W · {podiums}P · {seasons} seasons
        </div>
      </div>
    </Link>
  )
}
