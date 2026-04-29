import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from './AppHeader.jsx'

function IconAgenda({ active }) {
  const c = active ? 'var(--accent)' : 'var(--text-3)'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3"/>
      <path d="M3 9h18"/><path d="M8 2v4M16 2v4"/>
      <circle cx="8"  cy="14" r="1.2" fill={c} stroke="none"/>
      <circle cx="12" cy="14" r="1.2" fill={c} stroke="none"/>
      <circle cx="16" cy="14" r="1.2" fill={c} stroke="none"/>
      <circle cx="8"  cy="18" r="1.2" fill={c} stroke="none"/>
      <circle cx="12" cy="18" r="1.2" fill={c} stroke="none"/>
    </svg>
  )
}

function IconClientes({ active }) {
  const c = active ? 'var(--accent)' : 'var(--text-3)'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3.5"/>
      <path d="M2 20c0-4 3.1-7 7-7s7 3 7 7"/>
      <circle cx="17" cy="8" r="2.5" strokeOpacity={active ? 1 : 0.4}/>
      <path d="M21 20c0-2.5-1.8-4.5-4-5" strokeOpacity={active ? 1 : 0.4}/>
    </svg>
  )
}

function IconRelatorio({ active }) {
  const c = active ? 'var(--accent)' : 'var(--text-3)'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18"/>
      <rect x="5"  y="12" width="3" height="8" rx="1"/>
      <rect x="10" y="7"  width="3" height="13" rx="1"/>
      <rect x="15" y="3"  width="3" height="17" rx="1"/>
    </svg>
  )
}

const NAV = [
  { path: '/',          label: 'Agenda',    Icon: IconAgenda    },
  { path: '/clientes',  label: 'Clientes',  Icon: IconClientes  },
  { path: '/relatorio', label: 'Relatório', Icon: IconRelatorio },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isActive = (p) => p === '/' ? pathname === '/' : pathname.startsWith(p)

  return (
    <div style={S.root}>
      <AppHeader />
      <main style={S.main}>{children}</main>
      <nav style={S.nav}>
        {NAV.map(({ path, label, Icon }) => {
          const active = isActive(path)
          return (
            <button key={path} onClick={() => navigate(path)} style={{ ...S.btn, color: active ? 'var(--accent)' : 'var(--text-3)' }}>
              <div style={{ position: 'relative' }}>
                {active && (
                  <motion.div layoutId="nav-dot" style={S.dot}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                )}
                <Icon active={active} />
              </div>
              <span style={{ ...S.label, fontWeight: active ? 700 : 400, color: active ? 'var(--accent)' : 'var(--text-3)' }}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

const S = {
  root:  { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', maxWidth: 480, margin: '0 auto' },
  main:  { flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom))' },
  nav:   { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, height: 'calc(var(--nav-height) + var(--safe-bottom))', paddingBottom: 'var(--safe-bottom)', background: 'rgba(6,6,6,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 100 },
  btn:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms' },
  label: { fontSize: 10, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'color 200ms' },
  dot:   { position: 'absolute', top: -5, right: -4, width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' },
}
