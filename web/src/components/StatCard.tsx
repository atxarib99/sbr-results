interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, accent }: Props) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${accent ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 8,
        padding: '20px 24px',
      }}
    >
      <div style={{ color: 'var(--color-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: accent ? 'var(--color-accent)' : 'var(--color-text)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>{sub}</div>
      )}
    </div>
  )
}
