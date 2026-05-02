import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, Trash2, TrendingUp, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getClients, getPaymentsForClient, addPayment, deletePayment, getClientBalance, getClientCycles, getCurrentCycleInfo, formatCurrency, SERVICE_TYPES } from '../utils/data.js'
import ReciboDownload from '../components/Recibo.jsx'
import { useCountUp, formatCurrencyBRL } from '../hooks/useCountUp.js'

function AnimCurrency({ value, color, size = 15 }) {
  const v = useCountUp(value ?? 0, 850)
  return <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: size, color: color || 'var(--text)' }}>{formatCurrencyBRL(v)}</span>
}

function ProgressBar({ pct, color, delay = 0.15 }) {
  return (
    <div style={{ height: 6, background: 'var(--bg-4)', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct || 0)}%` }}
        transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', background: color || 'var(--accent)', borderRadius: 99 }}
      />
    </div>
  )
}

export default function Financeiro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const client = getClients().find(c => c.id === id)
  const [payments, setPayments] = useState(() => getPaymentsForClient(id))
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '' })
  const [confirmDel, setConfirmDel] = useState(null)

  if (!client) { navigate('/clientes'); return null }

  const { charged, paid, balance, overdue, completedCycles } = getClientBalance(client)
  const cycleInfo = getCurrentCycleInfo(client)
  const cycles    = getClientCycles(client)
  const def = SERVICE_TYPES[client.service]
  const paidPct = charged > 0 ? Math.min(100, (paid / charged) * 100) : 0

  const refresh = () => setPayments(getPaymentsForClient(id))

  const handleAdd = () => {
    if (!form.amount || isNaN(parseFloat(form.amount))) return
    addPayment({ clientId: id, amount: parseFloat(form.amount), date: form.date, note: form.note })
    setForm({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '' })
    setShowForm(false)
    refresh()
  }

  const handleDelete = (payId) => {
    deletePayment(payId)
    setConfirmDel(null)
    refresh()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.back} onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
        <div style={{ flex: 1 }}>
          <h1 style={S.title}>Financeiro</h1>
          <p style={S.subtitle}><span style={{ color: def.color }}>●</span> {client.name}</p>
        </div>
        <motion.button style={S.addBtn} onClick={() => setShowForm(v => !v)} whileTap={{ scale: 0.9 }}>
          <Plus size={20} strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Balance cards */}
      <motion.div
        style={S.balanceRow}
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {[
          { label: 'Cobrado',  value: charged,          color: 'var(--text)' },
          { label: 'Pago',     value: paid,             color: 'var(--accent)' },
          { label: 'Saldo',    value: Math.abs(balance), color: overdue ? '#FF6B6B' : 'var(--accent)', sub: overdue ? 'a receber' : 'em dia' },
        ].map(({ label, value, color, sub }) => (
          <motion.div
            key={label}
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.24 } } }}
            style={S.balanceCard}
          >
            <span style={S.balanceLabel}>{label}</span>
            <AnimCurrency value={value} color={color} />
            {sub && <span style={{ fontSize: 10, color, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{sub}</span>}
          </motion.div>
        ))}
      </motion.div>

      {/* Progress */}
      <div style={S.progressCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={S.balanceLabel}>Recebimento</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: overdue ? '#FF6B6B' : 'var(--accent)' }}>
            {Math.round(paidPct)}%
          </span>
        </div>
        <ProgressBar pct={paidPct} color={overdue ? '#FF6B6B' : 'var(--accent)'} />
      </div>

      {/* Cycle dashboard */}
      <div style={S.cycleCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={S.balanceLabel}>Ciclo atual</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: def.color }}>
            #{cycleInfo.cycleIndex + 1}
          </span>
        </div>
        {/* Dot progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {Array.from({ length: cycleInfo.total }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 6, borderRadius: 99,
              background: i < cycleInfo.done ? def.color : 'var(--bg-4)',
              transition: 'background 300ms',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {cycleInfo.done}/{cycleInfo.total} visitas concluídas
          </span>
          {cycleInfo.cycleEndDate && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Fecha {format(parseISO(cycleInfo.cycleEndDate), "d 'de' MMM", { locale: ptBR })}
            </span>
          )}
        </div>
        {/* Cycle history */}
        {cycles.length > 0 && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <span style={S.balanceLabel}>Ciclos cobrados</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {cycles.map((c, i) => {
                const paidSoFar = paid - (cycles.slice(0, i).length * (client.monthlyFee || 0))
                const cyclePaid = paidSoFar >= (client.monthlyFee || 0)
                const cycEndLabel = format(c.dueDate, "d/MM", { locale: ptBR })
                return (
                  <span key={i} style={{
                    fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700,
                    padding: '3px 8px', borderRadius: 5,
                    background: cyclePaid ? 'rgba(78,205,196,0.12)' : 'rgba(255,107,107,0.1)',
                    border: `1px solid ${cyclePaid ? 'rgba(78,205,196,0.25)' : 'rgba(255,107,107,0.2)'}`,
                    color: cyclePaid ? '#4ECDC4' : '#FF6B6B',
                  }}>
                    {cyclePaid ? '✓' : '!'} Ciclo {i + 1} · {cycEndLabel}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={S.formCard}
          >
            <p style={S.formTitle}>Registrar pagamento</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={S.balanceLabel}>Valor (R$)</label>
                <input style={S.input} type="number" inputMode="decimal" placeholder="0,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.balanceLabel}>Data</label>
                <input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <input style={{ ...S.input, marginTop: 10 }} placeholder="Observação (opcional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button style={S.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
              <button style={S.saveBtn} onClick={handleAdd}>Confirmar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      <div style={{ padding: '0 20px 20px' }}>
        <p style={{ ...S.balanceLabel, marginBottom: 12 }}>Histórico</p>
        {payments.length === 0
          ? <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>Nenhum pagamento registrado ainda.</p>
          : payments.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, delay: i * 0.05 }}
              style={S.payRow}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div style={S.payIcon}><TrendingUp size={14} color="var(--accent)" /></div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700 }}>{formatCurrency(p.amount)}</span>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                    {format(parseISO(p.date), "d 'de' MMM yyyy", { locale: ptBR })}{p.note ? ` · ${p.note}` : ''}
                  </p>
                  <div style={{ marginTop: 8 }}>
                    <ReciboDownload
                      payment={p}
                      client={client}
                      receiptNumber={String(payments.length - i).padStart(3, '0')}
                    />
                  </div>
                </div>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, alignSelf: 'flex-start' }} onClick={() => setConfirmDel(p.id)}>
                <Trash2 size={14} color="var(--text-3)" />
              </button>
            </motion.div>
          ))
        }
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={S.overlay} onClick={() => setConfirmDel(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 32 }} style={S.sheet}>
              <p style={S.formTitle}>Remover pagamento?</p>
              <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8 }}>Essa ação não pode ser desfeita.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button style={S.cancelBtn} onClick={() => setConfirmDel(null)}>Cancelar</button>
                <button style={S.confirmDelBtn} onClick={() => handleDelete(confirmDel)}>Remover</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const S = {
  header:      { padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 12 },
  back:        { width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  title:       { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 },
  subtitle:    { fontSize: 13, color: 'var(--text-2)', marginTop: 3 },
  addBtn:      { width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--accent)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', flexShrink: 0 },
  balanceRow:  { display: 'flex', gap: 10, padding: '16px 20px 0' },
  balanceCard: { flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' },
  balanceLabel:{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)' },
  progressCard:{ margin: '12px 20px 0', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 14px' },
  formCard:    { margin: '12px 20px 0', background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-md)', padding: '16px', overflow: 'hidden' },
  formTitle:   { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, marginBottom: 12 },
  input:       { background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--text)', fontSize: 14, width: '100%', colorScheme: 'dark', marginTop: 6 },
  cancelBtn:   { flex: 1, padding: '12px', borderRadius: 'var(--r-md)', background: 'var(--bg-4)', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  saveBtn:     { flex: 1, padding: '12px', borderRadius: 'var(--r-md)', background: 'var(--accent)', border: 'none', color: 'var(--bg)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  payRow:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' },
  payIcon:     { width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200 },
  sheet:       { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '24px 24px 0 0', padding: '24px 20px calc(var(--nav-height) + 16px)', zIndex: 201 },
  confirmDelBtn:{ flex: 1, padding: '12px', borderRadius: 'var(--r-md)', background: '#FF6B6B', border: 'none', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  cycleCard:   { margin: '12px 20px 0', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px' },
}
