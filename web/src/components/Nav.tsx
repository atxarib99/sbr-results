import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/seasons', label: 'Seasons' },
  { to: '/drivers', label: 'Drivers' },
]

export function Nav() {
  const { pathname } = useLocation()

  return (
    <nav
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 0, height: 56 }}>
        <Link
          to="/"
          style={{
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '-0.02em',
            color: 'var(--color-accent)',
            marginRight: 40,
          }}
        >
          SBR<span style={{ color: 'var(--color-text)' }}>·STATS</span>
        </Link>
        <div style={{ display: 'flex', gap: 4 }}>
          {links.map(l => {
            const active = l.to === '/' ? pathname === '/' : pathname.startsWith(l.to)
            return (
              <Link
                key={l.to}
                to={l.to}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--color-text)' : 'var(--color-muted)',
                  background: active ? 'var(--color-surface2)' : 'transparent',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {l.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
