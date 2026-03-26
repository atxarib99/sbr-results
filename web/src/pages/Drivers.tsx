import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { DriverCard } from '../components/DriverCard'

export function Drivers() {
  const [drivers, setDrivers] = useState<string[]>([])
  const [lb, setLb] = useState<Record<string, { wins: number; podiums: number; seasons: number }>>({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([api.drivers(), api.leaderboard()]).then(([drvs, l]) => {
      setDrivers(drvs)
      const map: Record<string, { wins: number; podiums: number; seasons: number }> = {}
      for (const e of l.wins) map[e.driver] = { ...map[e.driver], wins: e.count, podiums: 0, seasons: 0 }
      for (const e of l.podiums) map[e.driver] = { ...map[e.driver], podiums: e.count }
      for (const e of l.seasons_participated) map[e.driver] = { ...map[e.driver], seasons: e.count }
      setLb(map)
    })
  }, [])

  const query = search.trim().toLowerCase()
  const shown = drivers.filter(d => !query || d.toLowerCase().includes(query))

  // Sort by wins desc
  shown.sort((a, b) => (lb[b]?.wins ?? 0) - (lb[a]?.wins ?? 0))

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 800 }}>Drivers</h1>
        <p style={{ color: 'var(--color-muted)', margin: '0 0 20px', fontSize: 14 }}>{drivers.length} drivers across all seasons</p>
        <input
          type="text"
          placeholder="Search driver…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '10px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            color: 'var(--color-text)',
            fontSize: 14,
            outline: 'none',
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {shown.map(d => (
          <DriverCard
            key={d}
            name={d}
            wins={lb[d]?.wins ?? 0}
            podiums={lb[d]?.podiums ?? 0}
            seasons={lb[d]?.seasons ?? 0}
          />
        ))}
      </div>
      {shown.length === 0 && (
        <div style={{ color: 'var(--color-muted)', padding: '40px 0', textAlign: 'center' }}>No drivers found.</div>
      )}
    </div>
  )
}
