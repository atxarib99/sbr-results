import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type DriverProfile } from '../api/client'

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '16px 20px',
      }}
    >
      <div style={{ color: 'var(--color-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function resultStrip(rounds: { result?: number | string | null; feature?: number | string | null; reverse?: number | string | null }[]) {
  const vals = rounds.flatMap(r => {
    if ('feature' in r) return [r.feature, r.reverse]
    return [r.result]
  })
  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {vals.map((v, i) => {
        let bg = '#2a2a2a'
        let color = '#555'
        if (typeof v === 'number') {
          bg = 'rgba(255,255,255,0.05)'
          color = 'var(--color-text)'
          if (v === 1) { bg = 'rgba(245,197,24,0.2)'; color = 'var(--color-gold)' }
          else if (v === 2) { bg = 'rgba(192,192,192,0.15)'; color = 'var(--color-silver)' }
          else if (v === 3) { bg = 'rgba(205,127,50,0.15)'; color = 'var(--color-bronze)' }
        }
        return (
          <span key={i} style={{
            display: 'inline-block',
            width: 24,
            height: 24,
            lineHeight: '24px',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 3,
            background: bg,
            color,
          }}>
            {v === null || v === undefined ? '' : String(v).replace('DNS', 'D').replace('DNF', 'F')}
          </span>
        )
      })}
    </div>
  )
}

export function DriverDetail() {
  const { name } = useParams<{ name: string }>()
  const [driver, setDriver] = useState<DriverProfile | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!name) return
    api.driver(name).then(setDriver).catch(() => setError(true))
  }, [name])

  if (error) return <div style={{ padding: 40, color: 'var(--color-muted)' }}>Driver not found.</div>
  if (!driver) return <div style={{ padding: 40, color: 'var(--color-muted)' }}>Loading…</div>

  const bestWinSeason = driver.seasons.find(s => s.season === driver.best_season_by_wins)
  const bestPodSeason = driver.seasons.find(s => s.season === driver.best_season_by_podiums)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 20 }}>
        <Link to="/drivers" style={{ color: 'var(--color-muted)' }}>Drivers</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span style={{ color: 'var(--color-text)' }}>{driver.name}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800 }}>{driver.name}</h1>
          {driver.championships > 0 && (
            <span style={{
              fontSize: 13,
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(245,197,24,0.15)',
              color: 'var(--color-gold)',
              border: '1px solid rgba(245,197,24,0.3)',
              fontWeight: 600,
            }}>
              🏆 {driver.championships}× Champion
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, marginBottom: 40 }}>
        <StatBox label="Total Wins" value={driver.total_wins} />
        <StatBox label="Total Podiums" value={driver.total_podiums} />
        <StatBox label="Races Entered" value={driver.races_entered} />
        <StatBox label="Win %" value={`${driver.win_pct}%`} />
        <StatBox label="Podium %" value={`${driver.podium_pct}%`} />
        <StatBox label="Seasons" value={driver.seasons_entered} />
      </div>

      {/* Career highlights */}
      {(driver.best_season_by_wins || driver.best_season_by_podiums) && (
        <div style={{ marginBottom: 40, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {driver.best_season_by_wins && bestWinSeason && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '16px 20px', flex: '1 1 200px' }}>
              <div style={{ color: 'var(--color-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Best Season (Wins)</div>
              <Link to={`/seasons/${encodeURIComponent(driver.best_season_by_wins)}`} style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-gold)' }}>
                {bestWinSeason.display_name}
              </Link>
              <div style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>{bestWinSeason.wins} wins · {bestWinSeason.podiums} podiums</div>
            </div>
          )}
          {driver.best_season_by_podiums && bestPodSeason && driver.best_season_by_podiums !== driver.best_season_by_wins && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '16px 20px', flex: '1 1 200px' }}>
              <div style={{ color: 'var(--color-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Best Season (Podiums)</div>
              <Link to={`/seasons/${encodeURIComponent(driver.best_season_by_podiums)}`} style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-silver)' }}>
                {bestPodSeason.display_name}
              </Link>
              <div style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>{bestPodSeason.wins} wins · {bestPodSeason.podiums} podiums</div>
            </div>
          )}
        </div>
      )}

      {/* Season breakdown table */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Season by Season</h2>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)' }}>
                {['Season', 'POS', 'Wins', 'Podiums', 'Races', 'DNS', 'Results'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Results' ? 'left' : h === 'Season' ? 'left' : 'center', color: 'var(--color-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {driver.seasons.map(s => (
                <tr key={s.season} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                    <Link to={`/seasons/${encodeURIComponent(s.season)}`} style={{ color: 'var(--color-text)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-accent)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
                    >
                      {s.display_name}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: s.pos === 1 ? 'var(--color-gold)' : s.pos === 2 ? 'var(--color-silver)' : s.pos === 3 ? 'var(--color-bronze)' : 'var(--color-text)' }}>
                    {s.pos ?? '—'}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--color-gold)', fontWeight: 700 }}>{s.wins || '—'}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>{s.podiums || '—'}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--color-muted)' }}>{s.races_entered}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--color-muted)' }}>{s.dns || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>{resultStrip(s.rounds as any)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
