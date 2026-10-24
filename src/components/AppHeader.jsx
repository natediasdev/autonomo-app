import { useTheme } from '../hooks/useTheme.js'

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

export default function AppHeader() {
  const { theme, toggle } = useTheme()

  return (
    <div style={S.bar}>
      <div style={S.inner}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect width="22" height="22" rx="5.5" fill="var(--accent)"/>
          <polygon points="5,18 7.8,18 11,5.5 9.6,5.5" fill="var(--bg)" opacity="0.18"/>
          <polygon points="17,18 14.2,18 11,5.5 12.4,5.5" fill="var(--bg)" opacity="0.18"/>
          <rect x="7.2" y="12.6" width="7.6" height="1.7" rx="0.6" fill="var(--bg)" opacity="0.18"/>
          <polyline points="5.5,16.5 11,5 16.5,16.5" fill="none" stroke="var(--bg)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={S.name}>AutônomoApp</span>

        <button
          onClick={toggle}
          style={S.themeBtn}
          title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </div>
  )
}

const S = {
  bar: {
    position: 'sticky', top: 0, zIndex: 50,
    background: 'rgba(var(--bg-rgb, 6,6,6),0.90)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border)',
    paddingTop: 'var(--safe-top)',
    backgroundColor: 'var(--bg-2)',
  },
  inner: {
    height: 48, display: 'flex', alignItems: 'center',
    padding: '0 20px', gap: 10,
  },
  name: {
    fontFamily: 'var(--font-display)', fontSize: 15,
    fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)',
    flex: 1,
  },
  themeBtn: {
    width: 34, height: 34, borderRadius: 'var(--r-sm)',
    background: 'var(--bg-3)', border: '1px solid var(--border)',
    color: 'var(--text-2)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
    transition: 'background 150ms, color 150ms',
  },
}
