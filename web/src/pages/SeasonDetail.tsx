import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type SeasonDetail as SeasonDetailType, type DoubleRaceWinner, type SingleRaceWinner, type ClassStandings } from '../api/client'
import { RaceResultsTable } from '../components/RaceResultsTable'

function isDouble(w: DoubleRaceWinner | SingleRaceWinner): w is DoubleRaceWinner {
  return 'feature_winner' in w
}

const MEDAL = ['🥇', '🥈', '🥉']
const PODIUM_COLORS = ['var(--color-gold)', 'var(--color-silver)', 'var(--color-bronze)']

export function SeasonDetail() {
  const { name } = useParams<{ name: string }>()
  const [season, setSeason] = useState<SeasonDetailType | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!name) return
    api.season(name).then(setSeason).catch(() => setError(true))
  }, [name])

  if (error) return <div style={{ padding: 40, color: 'var(--color-muted)' }}>Season not found.</div>
  if (!season) return <div style={{ padding: 40, color: 'var(--color-muted)' }}>Loading…</div>

  const totalDrivers = season.is_multiclass
    ? season.classes.reduce((sum, cls) => sum + cls.standings.length, 0)
    : season.standings.length

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 20 }}>
        <Link to="/seasons" style={{ color: 'var(--color-muted)' }}>Seasons</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span style={{ color: 'var(--color-text)' }}>{season.display_name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 800 }}>{season.display_name}</h1>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--color-muted)' }}>
            <span>{season.num_rounds} rounds</span>
            <span>·</span>
            <span>{totalDrivers} drivers</span>
            <span>·</span>
            <span>{season.score_type === 'position' ? 'Position scoring' : 'Points scoring'}</span>
            <span>·</span>
            <span
              style={{
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 11,
                background: season.race_format === 'double' ? 'rgba(224,0,0,0.15)' : 'rgba(255,255,255,0.07)',
                color: season.race_format === 'double' ? 'var(--color-accent)' : 'var(--color-muted)',
                border: `1px solid ${season.race_format === 'double' ? 'rgba(224,0,0,0.3)' : 'var(--color-border)'}`,
              }}
            >
              {season.race_format === 'double' ? '2 races per round' : 'Single race per round'}
            </span>
            {season.is_multiclass && (
              <>
                <span>·</span>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    background: 'rgba(100,180,255,0.12)',
                    color: 'var(--color-text)',
                    border: '1px solid rgba(100,180,255,0.25)',
                  }}
                >
                  Multiclass
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Podium callout — non-multiclass */}
      {!season.is_multiclass && season.standings.slice(0, 3).length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
          {season.standings.slice(0, 3).map((s, i) => (
            <div
              key={s.driver}
              style={{
                flex: i === 0 ? '2 1 220px' : '1 1 150px',
                background: 'var(--color-surface)',
                border: `1px solid ${PODIUM_COLORS[i]}`,
                borderRadius: 10,
                padding: '20px 24px',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>{MEDAL[i]}</div>
              <Link
                to={`/drivers/${encodeURIComponent(s.driver)}`}
                style={{ fontWeight: 700, fontSize: i === 0 ? 22 : 18, color: PODIUM_COLORS[i], display: 'block' }}
              >
                {s.driver}
              </Link>
              <div style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 8 }}>
                {s.wins} win{s.wins !== 1 ? 's' : ''} · {s.podiums} podium{s.podiums !== 1 ? 's' : ''}
                {s.total != null && ` · ${s.total} pts`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Per-class champion cards — multiclass */}
      {season.is_multiclass && season.classes.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
          {season.classes.map((cls: ClassStandings) => {
            const top = cls.standings[0]
            if (!top) return null
            return (
              <div
                key={cls.class_name}
                style={{
                  flex: '1 1 200px',
                  background: 'var(--color-surface)',
                  border: `1px solid ${PODIUM_COLORS[0]}`,
                  borderRadius: 10,
                  padding: '20px 24px',
                }}
              >
                <div style={{ color: 'var(--color-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  {cls.class_name} Champion
                </div>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{MEDAL[0]}</div>
                <Link
                  to={`/drivers/${encodeURIComponent(top.driver)}`}
                  style={{ fontWeight: 700, fontSize: 20, color: PODIUM_COLORS[0], display: 'block' }}
                >
                  {top.driver}
                </Link>
                <div style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 8 }}>
                  {top.wins} win{top.wins !== 1 ? 's' : ''} · {top.podiums} podium{top.podiums !== 1 ? 's' : ''}
                  {top.total != null && ` · ${top.total} pts`}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Race-by-race winners — non-multiclass */}
      {!season.is_multiclass && season.race_winners.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            Race Results{season.race_format === 'double' ? ' (Feature / Reverse Grid)' : ''}
          </h2>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {season.race_winners.map(w => (
              <div
                key={w.round}
                style={{
                  flexShrink: 0,
                  minWidth: 140,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '12px 16px',
                }}
              >
                <div style={{ color: 'var(--color-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Round {w.round}
                </div>
                {isDouble(w) ? (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 2 }}>Feature</div>
                    <Link to={`/drivers/${encodeURIComponent(w.feature_winner ?? '')}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-gold)', display: 'block', marginBottom: 8 }}>
                      🏁 {w.feature_winner ?? '—'}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 2 }}>Reverse Grid</div>
                    <Link to={`/drivers/${encodeURIComponent(w.reverse_winner ?? '')}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', display: 'block' }}>
                      🔄 {w.reverse_winner ?? '—'}
                    </Link>
                  </>
                ) : (
                  <Link to={`/drivers/${encodeURIComponent((w as SingleRaceWinner).winner ?? '')}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-gold)' }}>
                    🏁 {(w as SingleRaceWinner).winner ?? '—'}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Race-by-race winners — multiclass (one card per round, per-class winners inside) */}
      {season.is_multiclass && season.classes.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            Race Results{season.race_format === 'double' ? ' (Feature / Reverse Grid)' : ''}
          </h2>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {Array.from({ length: season.num_rounds }, (_, idx) => {
              const roundNum = idx + 1
              return (
                <div
                  key={roundNum}
                  style={{
                    flexShrink: 0,
                    minWidth: 160,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ color: 'var(--color-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                    Round {roundNum}
                  </div>
                  {season.classes.map((cls: ClassStandings) => {
                    const w = cls.race_winners.find(rw => rw.round === roundNum)
                    if (!w) return null
                    return (
                      <div key={cls.class_name} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                          {cls.class_name}
                        </div>
                        {isDouble(w) ? (
                          <>
                            <Link to={`/drivers/${encodeURIComponent(w.feature_winner ?? '')}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-gold)', display: 'block' }}>
                              🏁 {w.feature_winner ?? '—'}
                            </Link>
                            <Link to={`/drivers/${encodeURIComponent(w.reverse_winner ?? '')}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', display: 'block' }}>
                              🔄 {w.reverse_winner ?? '—'}
                            </Link>
                          </>
                        ) : (
                          <Link to={`/drivers/${encodeURIComponent((w as SingleRaceWinner).winner ?? '')}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-gold)', display: 'block' }}>
                            🏁 {(w as SingleRaceWinner).winner ?? '—'}
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Full standings table — non-multiclass */}
      {!season.is_multiclass && (
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Full Standings</h2>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <RaceResultsTable
              standings={season.standings}
              raceFormat={season.race_format}
              scoreType={season.score_type}
              numRounds={season.num_rounds}
            />
          </div>
        </section>
      )}

      {/* Per-class standings tables — multiclass */}
      {season.is_multiclass && season.classes.map((cls: ClassStandings) => (
        <section key={cls.class_name} style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{cls.class_name} Standings</h2>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <RaceResultsTable
              standings={cls.standings}
              raceFormat={season.race_format}
              scoreType={season.score_type}
              numRounds={season.num_rounds}
            />
          </div>
        </section>
      ))}
    </div>
  )
}
