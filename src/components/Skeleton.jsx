export function SkeletonCard({ lines = 2 }) {
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <Skeleton height={12} width="40%" />
      <Skeleton height={18} width="70%" />
      {lines > 1 && <Skeleton height={11} width="30%" />}
    </div>
  )
}

export function Skeleton({ width = '100%', height = 16, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 6, ...style }} />
}
