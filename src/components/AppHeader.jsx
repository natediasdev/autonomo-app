export default function AppHeader() {
  return (
    <div style={S.bar}>
      <div style={S.inner}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          {/* A2-invertido miniatura: fundo lima, acento escuro */}
          <rect width="22" height="22" rx="5.5" fill="#E8FF47"/>
          {/* Ghost A */}
          <polygon points="5,18 7.8,18 11,5.5 9.6,5.5" fill="#080808" opacity="0.14"/>
          <polygon points="17,18 14.2,18 11,5.5 12.4,5.5" fill="#080808" opacity="0.14"/>
          <rect x="7.2" y="12.6" width="7.6" height="1.7" rx="0.6" fill="#080808" opacity="0.14"/>
          {/* Acento / chevron */}
          <polyline points="5.5,16.5 11,5 16.5,16.5" fill="none" stroke="#080808" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={S.name}>AutônomoApp</span>
      </div>
    </div>
  )
}

const S = {
  bar: {
    position: 'sticky', top: 0, zIndex: 50,
    background: 'rgba(6,6,6,0.90)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border)',
    paddingTop: 'var(--safe-top)',
  },
  inner: {
    height: 48, display: 'flex', alignItems: 'center',
    padding: '0 20px', gap: 10,
  },
  name: {
    fontFamily: 'var(--font-display)', fontSize: 15,
    fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)',
  },
}
