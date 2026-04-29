import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getMonthlyReport, formatCurrency, SERVICE_TYPES } from '../utils/data.js'
import { useCountUp, formatCurrencyBRL } from '../hooks/useCountUp.js'
import { SkeletonCard } from '../components/Skeleton.jsx'

function AnimCurrency({ value, color }) {
  const v = useCountUp(value ?? 0, 900)
  return <span style={{ fontFamily: 'var(--font-mono)', color: color || 'var(--text)', fontWeight: 800 }}>{formatCurrencyBRL(v)}</span>
}

function AnimInt({ value }) {
  const v = useCountUp(value ?? 0, 700)
  return <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{Math.round(v)}</span>
}

function ProgressBar({ pct, color, delay = 0.2 }) {
  return (
    <div style={{ height: 8, background: 'var(--bg-4)', borderRadius: 99, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct || 0)}%` }}
        transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', background: color || 'var(--accent)', borderRadius: 99 }}
      />
    </div>
  )
}

export default function Relatorio() {
  const [date, setDate] = useState(new Date())
  const report = getMonthlyReport(date.getFullYear(), date.getMonth())

  const monthLabel = format(date, "MMMM 'de' yyyy", { locale: ptBR })
  const monthCap   = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
  const recPct     = report.totalExpected > 0 ? Math.min(100, (report.totalReceived / report.totalExpected) * 100) : 0
  const barColor   = recPct >= 100 ? 'var(--accent)' : recPct >= 60 ? '#FFB347' : '#FF6B6B'
  const pending    = Math.max(0, report.totalExpected - report.totalReceived)

  const handleShare = () => {
    const text = [
      `📊 Relatório — ${monthCap}`,
      ``,
      `💰 Previsto:  ${formatCurrency(report.totalExpected)}`,
      `✅ Recebido:  ${formatCurrency(report.totalReceived)}`,
      `⚠️  Pendente: ${formatCurrency(pending)}`,
      `🪟 Limpezas: ${report.totalVisits}`,
      ``,
      `── Por cliente ──`,
      ...report.clientDetails.map(c =>
        `${c.name} (${SERVICE_TYPES[c.service]?.label}) — ${c.visits}/${c.totalVisits} visitas · ${formatCurrency(c.received)}${c.overdue ? ` · deve ${formatCurrency(c.balance)}` : ''}`
      ),
      ``,
      ...(report.overdueClients.length > 0
        ? [`🔴 Inadimplentes:`, ...report.overdueClients.map(c => `  ${c.name}: ${formatCurrency(c.balance)}`)]
        : ['✅ Todos em dia']),
    ].join('\n')

    if (navigator.share) navigator.share({ title: `Relatório ${monthCap}`, text })
    else { navigator.clipboard?.writeText(text); alert('Copiado para a área de transferência!') }
  }

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }
  const item    = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28 } } }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* Month nav */}
      <div style={S.monthNav}>
        <button style={S.navArrow} onClick={() => setDate(d => subMonths(d, 1))}><ChevronLeft size={18} /></button>
        <span style={S.monthLabel}>{monthCap}</span>
        <button style={S.navArrow} onClick={() => setDate(d => addMonths(d, 1))}><ChevronRight size={18} /></button>
        <button style={S.shareBtn} onClick={handleShare}><Share2 size={16} /></button>
      </div>

      <motion.div style={S.content} variants={stagger} initial="hidden" animate="visible">
        {/* KPI grid */}
        <motion.div variants={item} style={S.kpiGrid}>
          {[
            { label: 'Previsto',  node: <AnimCurrency value={report.totalExpected} />, },
            { label: 'Recebido', node: <AnimCurrency value={report.totalReceived} color="var(--accent)" /> },
            { label: 'Pendente', node: <AnimCurrency value={pending} color={pending > 0 ? '#FF6B6B' : 'var(--text)'} /> },
            { label: 'Limpezas', node: <AnimInt value={report.totalVisits} /> },
          ].map(({ label, node }) => (
            <div key={label} style={S.kpiCard}>
              <span style={S.kpiLabel}>{label}</span>
              <span style={S.kpiValue}>{node}</span>
            </div>
          ))}
        </motion.div>

        {/* Progress */}
        <motion.div variants={item} style={S.progressCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={S.kpiLabel}>Recebimento do mês</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: barColor }}>
              <AnimInt value={Math.round(recPct)} /><span style={{ fontSize: 14 }}>%</span>
            </span>
          </div>
          <ProgressBar pct={recPct} color={barColor} />
        </motion.div>

        {/* Overdue */}
        {report.overdueClients.length > 0 && (
          <motion.div variants={item} style={S.overdueCard}>
            <p style={S.overdueTitle}>⚠ {report.overdueClients.length} cliente{report.overdueClients.length > 1 ? 's' : ''} com pendência</p>
            {report.overdueClients.map(c => (
              <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{c.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#FF6B6B' }}>{formatCurrency(c.balance)}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Per-client */}
        <motion.div variants={item}>
          <p style={{ ...S.kpiLabel, marginBottom: 10 }}>Por cliente</p>
          {report.clientDetails.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>Nenhum cliente cadastrado.</p>
            : report.clientDetails.map((c, idx) => <ClientRow key={c.id} client={c} delay={idx * 0.05} />)
          }
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function ClientRow({ client, delay }) {
  const def = SERVICE_TYPES[client.service]
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24, delay }}
      style={S.clientRow}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ ...S.clientDot, background: def?.color }} />
        <div>
          <p style={S.clientName}>{client.name}</p>
          <p style={S.clientMeta}>{client.visits}/{client.totalVisits} visitas · {client.overdue ? `deve ${formatCurrency(client.balance)}` : 'em dia'}</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: client.overdue ? '#FF6B6B' : 'var(--accent)' }}>{formatCurrency(client.received)}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>de {formatCurrency(client.fee)}</span>
      </div>
    </motion.div>
  )
}

const S = {
  monthNav:    { display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px 0' },
  navArrow:    { width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  monthLabel:  { fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, flex: 1, textAlign: 'center' },
  shareBtn:    { width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  content:     { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  kpiGrid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  kpiCard:     { background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 },
  kpiLabel:    { fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' },
  kpiValue:    { fontSize: 20, letterSpacing: '-0.02em' },
  progressCard:{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px' },
  overdueCard: { background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.18)', borderRadius: 'var(--r-md)', padding: '14px' },
  overdueTitle:{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#FF6B6B' },
  clientRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' },
  clientDot:   { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  clientName:  { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 },
  clientMeta:  { fontSize: 12, color: 'var(--text-3)', marginTop: 2 },
}
