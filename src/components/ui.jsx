import { motion, AnimatePresence } from 'framer-motion'
import { useCountUp } from '../hooks/useCountUp.js'

// ─── Animated currency / number display ──────────────────────────────────────

export function AnimatedCurrency({ value, style }) {
  const animated = useCountUp(value ?? 0, 800)
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
  }).format(animated)

  return (
    <span style={{ fontFamily: 'var(--font-mono)', ...style }}>
      {formatted}
    </span>
  )
}

export function AnimatedNumber({ value, suffix = '', style }) {
  const animated = useCountUp(value ?? 0, 700)
  return (
    <span style={{ fontFamily: 'var(--font-mono)', ...style }}>
      {Math.round(animated)}{suffix}
    </span>
  )
}

// ─── Animated progress bar ────────────────────────────────────────────────────

export function ProgressBar({ pct, color, height = 8, delay = 0.1 }) {
  const clamped = Math.min(100, Math.max(0, pct || 0))
  return (
    <div style={{ height, background: 'var(--bg-4)', borderRadius: 99, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', background: color || 'var(--accent)', borderRadius: 99 }}
      />
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ width = '100%', height = 16, style }) {
  return <div className="skeleton" style={{ width, height, ...style }} />
}

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

// ─── Page shell with entrance animation ──────────────────────────────────────

export function PageShell({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// ─── List item stagger wrapper ────────────────────────────────────────────────

export function StaggerList({ children, style }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, style }) {
  return (
    <motion.div
      variants={{
        hidden:  { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
      }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

// Stylized calendar for Agenda nav
export function IconAgenda({ size = 22, color = 'currentColor', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M3 9h18" />
      <path d="M8 2v4M16 2v4" />
      <circle cx="8"  cy="14" r="1" fill={color} stroke="none" />
      <circle cx="12" cy="14" r="1" fill={color} stroke="none" />
      <circle cx="16" cy="14" r="1" fill={color} stroke="none" />
      <circle cx="8"  cy="18" r="1" fill={color} stroke="none" />
      <circle cx="12" cy="18" r="1" fill={color} stroke="none" />
    </svg>
  )
}

// Stylized user card for Clientes nav
export function IconClientes({ size = 22, color = 'currentColor', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3.5" />
      <path d="M2 20c0-4 3.1-7 7-7h0c3.9 0 7 3 7 7" />
      <path d="M17 11c1.1 0 2 .9 2 2s-.9 2-2 2" strokeOpacity="0.5" />
      <path d="M20 20c0-2.2-1.3-4-3-4.7" strokeOpacity="0.5" />
    </svg>
  )
}

// Stylized bar chart for Relatório nav
export function IconRelatorio({ size = 22, color = 'currentColor', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18" />
      <rect x="5"  y="12" width="3" height="8" rx="1" />
      <rect x="10" y="7"  width="3" height="13" rx="1" />
      <rect x="15" y="3"  width="3" height="17" rx="1" />
    </svg>
  )
}

// Empty state: window squeegee for Agenda
export function IconEmptyAgenda({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      {/* Window frame */}
      <rect x="8" y="8" width="40" height="40" rx="5" stroke="var(--text-3)" strokeWidth="2" />
      {/* Horizontal divider */}
      <line x1="8" y1="28" x2="48" y2="28" stroke="var(--text-3)" strokeWidth="2" />
      {/* Vertical divider */}
      <line x1="28" y1="8" x2="28" y2="48" stroke="var(--text-3)" strokeWidth="2" />
      {/* Squeegee handle */}
      <line x1="36" y1="20" x2="44" y2="12" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="30" y="14" width="10" height="4" rx="2" transform="rotate(-45 30 14)" fill="var(--accent)" opacity="0.7" />
    </svg>
  )
}

// Empty state: person outline for Clientes
export function IconEmptyClientes({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="20" r="10" stroke="var(--text-3)" strokeWidth="2" strokeDasharray="4 2" />
      <path d="M10 48c0-9.9 8.1-18 18-18s18 8.1 18 18" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
      <line x1="28" y1="36" x2="28" y2="42" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="25" y1="39" x2="28" y2="36" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="31" y1="39" x2="28" y2="36" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// Sticky note SVG for empty observations
export function IconNote({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8" />
      <path d="M14 2v6h6" />
      <path d="M14 2l6 6v10a2 2 0 0 1-2 2h-2" />
      <line x1="8" y1="10" x2="12" y2="10" />
      <line x1="8" y1="14" x2="12" y2="14" />
    </svg>
  )
}
