import { useEffect, useState } from 'react'
import { api, type SeasonSummary } from '../api/client'
import { SeasonCard } from '../components/SeasonCard'

export function Seasons() {
  const [seasons, setSeasons] = useState<SeasonSummary[]>([])
  const [filter, setFilter] = useState<'all' | 'single' | 'double'>('all')

  useEffect(() => {
    api.seasons().then(setSeasons)
  }, [])

  const shown = filter === 'all' ? seasons : seasons.filter(s => s.race_format === filter)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>Seasons</h1>
          <p style={{ color: 'var(--color-muted)', margin: '6px 0 0', fontSize: 14 }}>{seasons.length} seasons total</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', padding: 4, borderRadius: 8, border: '1px solid var(--color-border)' }}>
          {(['all', 'single', 'double'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px',
                borderRadius: 5,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: filter === f ? 600 : 400,
                background: filter === f ? 'var(--color-surface2)' : 'transparent',
                color: filter === f ? 'var(--color-text)' : 'var(--color-muted)',
                textTransform: 'capitalize',
              }}
            >
              {f === 'all' ? 'All' : f === 'single' ? 'Single race' : '2× rounds'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {shown.map(s => <SeasonCard key={s.name} season={s} />)}
      </div>
    </div>
  )
}
