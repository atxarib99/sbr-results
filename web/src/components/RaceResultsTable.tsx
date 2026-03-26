import { Link } from 'react-router-dom'
import type { DriverStanding, RoundResult } from '../api/client'

interface Props {
  standings: DriverStanding[]
  raceFormat: 'single' | 'double'
  scoreType: 'points' | 'position'
  numRounds: number
}

function cellStyle(val: number | string | null | undefined, scoreType: 'points' | 'position') {
  if (val === null || val === undefined) return { color: '#444', background: 'transparent' }
  if (val === 'DNS' || val === 'DNF') return { color: '#555', background: 'transparent' }
  if (typeof val === 'number') {
    if (scoreType === 'position') {
      if (val === 1) return { color: 'var(--color-gold)', fontWeight: 700, background: 'rgba(245,197,24,0.08)' }
      if (val === 2) return { color: 'var(--color-silver)', fontWeight: 600, background: 'transparent' }
      if (val === 3) return { color: 'var(--color-bronze)', fontWeight: 600, background: 'transparent' }
    }
  }
  return { color: 'var(--color-text)', background: 'transparent' }
}

function posBorderColor(pos: number | null) {
  if (pos === 1) return 'var(--color-gold)'
  if (pos === 2) return 'var(--color-silver)'
  if (pos === 3) return 'var(--color-bronze)'
  return 'transparent'
}

function displayVal(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '—'
  return String(val)
}

function getFeature(r: RoundResult): number | string | null {
  if ('feature' in r) return r.feature
  return r.result
}

function getReverse(r: RoundResult): number | string | null {
  if ('reverse' in r) return r.reverse
  return null
}

export function RaceResultsTable({ standings, raceFormat, scoreType, numRounds }: Props) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--color-surface2)' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', width: 48 }}>POS</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Driver</th>
            <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--color-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}>W</th>
            <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--color-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}>P</th>
            {Array.from({ length: numRounds }, (_, i) => (
              raceFormat === 'double' ? (
                <th key={i} colSpan={2} style={{ padding: '10px 4px', textAlign: 'center', color: 'var(--color-muted)', fontWeight: 600, fontSize: 11, borderLeft: '1px solid var(--color-border)' }}>
                  R{i + 1}
                </th>
              ) : (
                <th key={i} style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--color-muted)', fontWeight: 600, fontSize: 11 }}>
                  R{i + 1}
                </th>
              )
            ))}
            <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total</th>
          </tr>
          {raceFormat === 'double' && (
            <tr style={{ background: 'var(--color-surface)' }}>
              <th colSpan={4} />
              {Array.from({ length: numRounds }, (_, i) => (
                <>
                  <th key={`f${i}`} style={{ padding: '4px 4px', textAlign: 'center', color: '#555', fontWeight: 400, fontSize: 10, borderLeft: '1px solid var(--color-border)' }}>Feat</th>
                  <th key={`r${i}`} style={{ padding: '4px 4px', textAlign: 'center', color: '#555', fontWeight: 400, fontSize: 10 }}>Rev</th>
                </>
              ))}
              <th />
            </tr>
          )}
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr
              key={s.driver}
              style={{
                borderBottom: '1px solid var(--color-border)',
                borderLeft: `3px solid ${posBorderColor(s.pos)}`,
              }}
            >
              <td style={{ padding: '9px 12px', color: 'var(--color-muted)', fontWeight: 700, fontSize: 13 }}>
                {s.pos ?? '—'}
              </td>
              <td style={{ padding: '9px 12px', fontWeight: 500 }}>
                <Link
                  to={`/drivers/${encodeURIComponent(s.driver)}`}
                  style={{ color: 'var(--color-text)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-accent)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
                >
                  {s.driver}
                </Link>
              </td>
              <td style={{ padding: '9px 8px', textAlign: 'center', color: 'var(--color-gold)', fontWeight: 700 }}>{s.wins || '—'}</td>
              <td style={{ padding: '9px 8px', textAlign: 'center', color: 'var(--color-muted)' }}>{s.podiums || '—'}</td>
              {Array.from({ length: numRounds }, (_, i) => {
                const round = s.rounds[i]
                if (raceFormat === 'double') {
                  const fv = round ? getFeature(round) : null
                  const rv = round ? getReverse(round) : null
                  return (
                    <>
                      <td key={`f${i}`} style={{ padding: '9px 4px', textAlign: 'center', borderLeft: '1px solid var(--color-border)', ...cellStyle(fv, scoreType) }}>
                        {displayVal(fv)}
                      </td>
                      <td key={`r${i}`} style={{ padding: '9px 4px', textAlign: 'center', ...cellStyle(rv, scoreType) }}>
                        {displayVal(rv)}
                      </td>
                    </>
                  )
                } else {
                  const rv = round ? getFeature(round) : null
                  return (
                    <td key={i} style={{ padding: '9px 8px', textAlign: 'center', ...cellStyle(rv, scoreType) }}>
                      {displayVal(rv)}
                    </td>
                  )
                }
              })}
              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: s.pos === 1 ? 'var(--color-gold)' : 'var(--color-text)' }}>
                {s.total ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
