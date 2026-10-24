import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, Trash2, TrendingUp, X, PauseCircle, PlayCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  getClients, getPaymentsForClient, addPayment, deletePayment,
  getClientBalance, getClientCycles, getCurrentCycleInfo,
  getOccasionsForClient, addOccasion, deleteOccasion, toggleOccasionDone,
  pauseClient, resumeClient, isClientPaused,
  formatCurrency, SERVICE_TYPES,
} from '../utils/data.js'
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

  const [payments,  setPayments]  = useState(() => getPaymentsForClient(id))
  const [occasions, setOccasions] = useState(() => getOccasionsForClient(id))
  const [showPayForm,  setShowPayForm]  = useState(false)
  const [showOccForm,  setShowOccForm]  = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '' })
  const [occForm, setOccForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), fee: '', note: '' })
  const [confirmDel,    setConfirmDel]    = useState(null)   // { type: 'payment'|'occasion', id }
  const [confirmPause,  setConfirmPause]  = useState(false)
  const [paused, setPaused] = useState(() => isClientPaused(client))

  if (!client) { navigate('/clientes'); return null }

  const isOcasional = client.service === 'ocasional'
  const def = SERVICE_TYPES[client.service]

  const { charged, paid, balance, overdue, totalCycles } = getClientBalance(client)
  const cycleInfo = getCurrentCycleInfo(client)
  const cycles    = isOcasional ? [] : getClientCycles(client)
  const paidPct   = charged > 0 ? Math.min(100, (paid / charged) * 100) : 0

  const refresh = () => {
    setPayments(getPaymentsForClient(id))
    setOccasions(getOccasionsForClient(id))
    setPaused(isClientPaused(getClients().find(c => c.id === id)))
  }

  const handleAddPayment = () => {
    if (!payForm.amount || isNaN(parseFloat(payForm.amount))) return
    addPayment({ clientId: id, amount: parseFloat(payForm.amount), date: payForm.date, note: payForm.note })
    setPayForm({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '' })
    setShowPayForm(false)
    refresh()
  }

  const handleAddOccasion = () => {
    if (!occForm.date) return
    addOccasion({ clientId: id, date: occForm.date, fee: parseFloat(occForm.fee) || 0, note: occForm.note })
    setOccForm({ date: format(new Date(), 'yyyy-MM-dd'), fee: '', note: '' })
    setShowOccForm(false)
    refresh()
  }

  const handleDelete = () => {
    if (!confirmDel) return
    if (confirmDel.type === 'payment')  deletePayment(confirmDel.id)
    if (confirmDel.type === 'occasion') deleteOccasion(confirmDel.id)
    setConfirmDel(null)
    refresh()
  }

  const handleToggleOcc = (occId) => {
    toggleOccasionDone(occId)
    refresh()
  }

  const handlePauseResume = () => {
    if (paused) resumeClient(id)
    else pauseClient(id)
    setConfirmPause(false)
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
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Pause/Resume — only for recurring clients */}
          {!isOcasional && (
            <motion.button
              style={{ ...S.iconActionBtn, background: paused ? 'rgba(167,139,250,0.12)' : 'var(--bg-3)', borderColor: paused ? 'rgba(167,139,250,0.3)' : 'var(--border)' }}
              onClick={() => setConfirmPause(true)}
              whileTap={{ scale: 0.9 }}
              title={paused ? 'Retomar cliente' : 'Pausar cliente'}
            >
              {paused
                ? <PlayCircle size={18} color="#A78BFA" />
                : <PauseCircle size={18} color="var(--text-2)" />}
            </motion.button>
          )}
          {/* Add payment */}
          <motion.button style={S.addBtn} onClick={() => { setShowPayForm(v => !v); setShowOccForm(false) }} whileTap={{ scale: 0.9 }}>
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>
          {/* Add occasion — only for ocasional clients */}
          {isOcasional && (
            <motion.button
              style={{ ...S.addBtn, background: def.color }}
              onClick={() => { setShowOccForm(v => !v); setShowPayForm(false) }}
              whileTap={{ scale: 0.9 }}
              title="Agendar visita avulsa"
            >
              <Plus size={18} strokeWidth={2.5} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Paused banner */}
      {paused && (
        <div style={S.pausedBanner}>
          <PauseCircle size={14} color="#A78BFA" />
          <span>Cliente pausado — sem cobranças enquanto inativo</span>
        </div>
      )}

      {/* Balance cards */}
      <motion.div style={S.balanceRow} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        {[
          { label: 'Cobrado',  value: charged,           color: 'var(--text)' },
          { label: 'Pago',     value: paid,              color: 'var(--accent)' },
          { label: 'Saldo',    value: Math.abs(balance), color: overdue ? 'var(--danger)' : totalCycles === 0 && !isOcasional ? 'var(--text-2)' : 'var(--accent)', sub: overdue ? 'a receber' : (totalCycles === 0 && !isOcasional) ? 'aguardando' : 'em dia' },
        ].map(({ label, value, color, sub }) => (
          <motion.div key={label} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.24 } } }} style={S.balanceCard}>
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
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: overdue ? 'var(--danger)' : 'var(--accent)' }}>
            {Math.round(paidPct)}%
          </span>
        </div>
        <ProgressBar pct={paidPct} color={overdue ? 'var(--danger)' : 'var(--accent)'} />
      </div>

      {/* Cycle dashboard — recurring only */}
      {!isOcasional && (
        <div style={S.cycleCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={S.balanceLabel}>Ciclo atual</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: def.color }}>
              #{cycleInfo.cycleIndex + 1}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {Array.from({ length: cycleInfo.total }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 99, background: i < cycleInfo.done ? def.color : 'var(--bg-4)', transition: 'background 300ms' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{cycleInfo.done}/{cycleInfo.total} visitas concluídas</span>
            {cycleInfo.cycleEndDate && (
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Fecha {format(parseISO(cycleInfo.cycleEndDate), "d 'de' MMM", { locale: ptBR })}
              </span>
            )}
          </div>
          {cycles.length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <span style={S.balanceLabel}>Ciclos cobrados</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {(() => {
                  let remaining = paid
                  return cycles.map((c, i) => {
                    const fee = client.monthlyFee || 0
                    const cyclePaid = remaining >= fee - 0.005
                    remaining = Math.max(0, remaining - fee)
                    const startLabel = format(parseISO(c.firstVisit), 'd/MM', { locale: ptBR })
                    const endLabel   = format(parseISO(c.lastVisit),  'd/MM', { locale: ptBR })
                    const isActive   = c.isActive
                    return (
                      <span key={i} style={{
                        fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700,
                        padding: '3px 8px', borderRadius: 5,
                        background: cyclePaid ? 'rgba(78,205,196,0.12)' : isActive ? 'var(--accent-dim)' : 'var(--danger-dim)',
                        border: `1px solid ${cyclePaid ? 'rgba(78,205,196,0.25)' : isActive ? 'var(--accent-border)' : 'var(--danger-border)'}`,
                        color: cyclePaid ? '#4ECDC4' : isActive ? 'var(--accent)' : 'var(--danger)',
                      }}>
                        {cyclePaid ? '✓' : isActive ? '●' : '!'} Ciclo {i + 1} · {startLabel}–{endLabel}
                      </span>
                    )
                  })
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ocasional visits list */}
      {isOcasional && (
        <div style={{ padding: '0 20px', marginTop: 12 }}>
          <p style={{ ...S.balanceLabel, marginBottom: 12 }}>Visitas agendadas</p>
          {occasions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
              Nenhuma visita agendada. Use o botão + roxo para adicionar.
            </p>
          ) : (
            occasions
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((o, i) => (
                <motion.div key={o.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22, delay: i * 0.05 }} style={{ ...S.payRow, opacity: o.done ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <button
                      onClick={() => handleToggleOcc(o.id)}
                      style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: o.done ? 'var(--accent-dim)' : 'var(--bg-3)', border: `1px solid ${o.done ? 'var(--accent-border)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <span style={{ fontSize: 13 }}>{o.done ? '✓' : '○'}</span>
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, textDecoration: o.done ? 'line-through' : 'none' }}>
                          {o.fee > 0 ? formatCurrency(o.fee) : 'Sem valor'}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                        {format(parseISO(o.date), "d 'de' MMM yyyy", { locale: ptBR })}{o.note ? ` · ${o.note}` : ''}
                      </p>
                    </div>
                  </div>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }} onClick={() => setConfirmDel({ type: 'occasion', id: o.id })}>
                    <Trash2 size={14} color="var(--text-3)" />
                  </button>
                </motion.div>
              ))
          )}
        </div>
      )}

      {/* Add occasion form */}
      <AnimatePresence>
        {showOccForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={S.formCard}>
            <p style={S.formTitle}>Agendar visita avulsa</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={S.balanceLabel}>Data</label>
                <input style={S.input} type="date" value={occForm.date} onChange={e => setOccForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.balanceLabel}>Valor (R$)</label>
                <input style={S.input} type="number" inputMode="decimal" placeholder="0,00" value={occForm.fee} onChange={e => setOccForm(f => ({ ...f, fee: e.target.value }))} />
              </div>
            </div>
            <input style={{ ...S.input, marginTop: 10 }} placeholder="Observação (opcional)" value={occForm.note} onChange={e => setOccForm(f => ({ ...f, note: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button style={S.cancelBtn} onClick={() => setShowOccForm(false)}>Cancelar</button>
              <button style={{ ...S.saveBtn, background: def.color }} onClick={handleAddOccasion}>Agendar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add payment form */}
      <AnimatePresence>
        {showPayForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={S.formCard}>
            <p style={S.formTitle}>Registrar pagamento</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={S.balanceLabel}>Valor (R$)</label>
                <input style={S.input} type="number" inputMode="decimal" placeholder="0,00" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.balanceLabel}>Data</label>
                <input style={S.input} type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <input style={{ ...S.input, marginTop: 10 }} placeholder="Observação (opcional)" value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button style={S.cancelBtn} onClick={() => setShowPayForm(false)}>Cancelar</button>
              <button style={S.saveBtn} onClick={handleAddPayment}>Confirmar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment history */}
      <div style={{ padding: '0 20px 20px', marginTop: 12 }}>
        <p style={{ ...S.balanceLabel, marginBottom: 12 }}>Histórico de pagamentos</p>
        {payments.length === 0
          ? <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>Nenhum pagamento registrado ainda.</p>
          : payments.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22, delay: i * 0.05 }} style={S.payRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div style={S.payIcon}><TrendingUp size={14} color="var(--accent)" /></div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700 }}>{formatCurrency(p.amount)}</span>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                    {format(parseISO(p.date), "d 'de' MMM yyyy", { locale: ptBR })}{p.note ? ` · ${p.note}` : ''}
                  </p>
                  <div style={{ marginTop: 8 }}>
                    <ReciboDownload payment={p} client={client} receiptNumber={String(payments.length - i).padStart(3, '0')} />
                  </div>
                </div>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, alignSelf: 'flex-start' }} onClick={() => setConfirmDel({ type: 'payment', id: p.id })}>
                <Trash2 size={14} color="var(--text-3)" />
              </button>
            </motion.div>
          ))
        }
      </div>

      {/* Confirm delete sheet */}
      <AnimatePresence>
        {confirmDel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={S.overlay} onClick={() => setConfirmDel(null)} />
            <div style={S.sheetWrapper}>
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 32 }} style={S.sheet}>
                <p style={S.formTitle}>Remover {confirmDel.type === 'payment' ? 'pagamento' : 'visita'}?</p>
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8 }}>Essa ação não pode ser desfeita.</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button style={S.cancelBtn} onClick={() => setConfirmDel(null)}>Cancelar</button>
                  <button style={S.confirmDelBtn} onClick={handleDelete}>Remover</button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm pause/resume sheet */}
      <AnimatePresence>
        {confirmPause && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={S.overlay} onClick={() => setConfirmPause(false)} />
            <div style={S.sheetWrapper}>
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 32 }} style={S.sheet}>
                <p style={S.formTitle}>{paused ? 'Retomar cliente?' : 'Pausar cliente?'}</p>
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8 }}>
                  {paused
                    ? 'As visitas voltarão a ser geradas a partir de hoje. Nenhuma cobrança retroativa.'
                    : 'O cliente sairá da agenda e não acumulará cobranças enquanto pausado.'}
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button style={S.cancelBtn} onClick={() => setConfirmPause(false)}>Cancelar</button>
                  <button style={{ ...S.saveBtn, background: paused ? 'var(--accent)' : '#A78BFA' }} onClick={handlePauseResume}>
                    {paused ? 'Retomar' : 'Pausar'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const S = {
  header:       { padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 12 },
  back:         { width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  title:        { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text)' },
  subtitle:     { fontSize: 13, color: 'var(--text-2)', marginTop: 3 },
  addBtn:       { width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--accent)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', flexShrink: 0 },
  iconActionBtn:{ width: 36, height: 36, borderRadius: 'var(--r-sm)', border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  pausedBanner: { margin: '10px 20px 0', padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#A78BFA', fontWeight: 600 },
  balanceRow:   { display: 'flex', gap: 10, padding: '16px 20px 0' },
  balanceCard:  { flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' },
  balanceLabel: { fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)' },
  progressCard: { margin: '12px 20px 0', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 14px' },
  cycleCard:    { margin: '12px 20px 0', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px' },
  formCard:     { margin: '12px 20px 0', background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-md)', padding: '16px', overflow: 'hidden' },
  formTitle:    { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' },
  input:        { background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--text)', fontSize: 14, width: '100%', colorScheme: 'dark light', marginTop: 6 },
  cancelBtn:    { flex: 1, padding: '12px', borderRadius: 'var(--r-md)', background: 'var(--bg-4)', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  saveBtn:      { flex: 1, padding: '12px', borderRadius: 'var(--r-md)', background: 'var(--accent)', border: 'none', color: 'var(--bg)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  payRow:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' },
  payIcon:      { width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  overlay:      { position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 200 },
  sheetWrapper: { position: 'fixed', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 201, pointerEvents: 'none' },
  sheet:        { width: '100%', maxWidth: 480, background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '24px 24px 0 0', padding: '24px 20px calc(var(--nav-height) + 16px)', pointerEvents: 'auto' },
  confirmDelBtn:{ flex: 1, padding: '12px', borderRadius: 'var(--r-md)', background: 'var(--danger)', border: 'none', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
}
