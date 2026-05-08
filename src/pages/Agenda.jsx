import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, CalendarClock, X, MessageCircle, StickyNote, SkipForward } from 'lucide-react'
import { format, parseISO, isToday, addDays, startOfWeek, addWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  getWeekAppointments, toggleCompletion, formatWeekRange,
  getFinancialSummary, formatCurrency, SERVICE_TYPES,
  rescheduleVisit, clearReschedule, skipVisitToNextWeek,
  getVisitNote, saveVisitNote,
  buildWhatsAppConfirmUrl, getClients,
} from '../utils/data.js'
import { useCountUp, formatCurrencyBRL } from '../hooks/useCountUp.js'
import { SkeletonCard } from '../components/Skeleton.jsx'

// ─── Animated currency tile ───────────────────────────────────────────────────

function AnimatedCurrency({ value, color }) {
  const animated = useCountUp(value ?? 0, 900)
  return (
    <span style={{ fontFamily: 'var(--font-mono)', color: color || 'var(--text)', fontWeight: 700 }}>
      {formatCurrencyBRL(animated)}
    </span>
  )
}

// ─── Animated progress bar ────────────────────────────────────────────────────

function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 4, background: 'var(--bg-4)', borderRadius: 99, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct || 0)}%` }}
        transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', background: color || 'var(--accent)', borderRadius: 99 }}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Agenda() {
  const [weekOffset, setWeekOffset]   = useState(0)
  const [completions, setCompletions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('autonomo:completions') || '[]') } catch { return [] }
  })
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [noteTarget, setNoteTarget]             = useState(null)
  const [refresh, setRefresh]                   = useState(0)
  const [loading]                               = useState(false)

  const { appointments, weekStart, weekEnd } = getWeekAppointments(weekOffset)
  const summary = getFinancialSummary()

  const grouped = appointments.reduce((acc, appt) => {
    if (!acc[appt.date]) acc[appt.date] = []
    acc[appt.date].push(appt)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort()

  const handleToggle = useCallback((id) => {
    setCompletions(toggleCompletion(id))
  }, [])

  const handleReschedule = (newDate) => {
    const { clientId, originalDate } = rescheduleTarget
    if (newDate === originalDate) clearReschedule(clientId, originalDate)
    else rescheduleVisit(clientId, originalDate, newDate)
    setRescheduleTarget(null)
    setRefresh(r => r + 1)
  }

  const handleNoteSave = (text) => {
    saveVisitNote(noteTarget.clientId, noteTarget.originalDate, text)
    setNoteTarget(null)
    setRefresh(r => r + 1)
  }

  const isDone    = (id) => completions.includes(id)
  const totalDone = appointments.filter(a => isDone(a.id)).length
  const totalAll  = appointments.length
  const donePct   = totalAll > 0 ? (totalDone / totalAll) * 100 : 0

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <p style={S.subtitle}>
            {weekOffset === 0 ? 'Esta semana' : weekOffset === 1 ? 'Próxima semana' : weekOffset === -1 ? 'Semana passada' : formatWeekRange(weekStart, weekEnd)}
          </p>
        </div>
        {totalAll > 0 && (
          <div style={S.progressWrap}>
            <span style={S.progressText}>{totalDone}/{totalAll}</span>
            <ProgressBar pct={donePct} />
          </div>
        )}
      </div>

      {/* Financial summary */}
      {weekOffset === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          style={S.summaryStrip}
        >
          <SummaryTile label="Previsto/mês"  node={<AnimatedCurrency value={summary.totalExpectedMonth} />} />
          <div style={S.divider} />
          <SummaryTile label="Recebido/mês"  node={<AnimatedCurrency value={summary.totalReceivedMonth} color="var(--accent)" />} />
          <div style={S.divider} />
          <SummaryTile
            label={`${summary.overdueCount} inadimpl.`}
            node={<AnimatedCurrency value={summary.totalDebt} color={summary.totalDebt > 0 ? '#FF6B6B' : 'var(--text)'} />}
          />
        </motion.div>
      )}

      {/* Week nav */}
      <div style={S.weekNav}>
        <button style={S.navArrow} onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={18} /></button>
        <span style={S.weekLabel}>{formatWeekRange(weekStart, weekEnd)}</span>
        <button style={S.navArrow} onClick={() => setWeekOffset(w => w + 1)}><ChevronRight size={18} /></button>
      </div>

      {/* Content */}
      <div style={S.content}>
        {loading ? (
          [0,1,2].map(i => <SkeletonCard key={i} />)
        ) : dates.length === 0 ? (
          <EmptyAgenda weekOffset={weekOffset} />
        ) : (
          <motion.div
            key={weekOffset + '-' + refresh}
            initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {dates.map(date => (
              <motion.div
                key={date}
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28 } } }}
              >
                <DayGroup
                  date={date}
                  appointments={grouped[date]}
                  onToggle={handleToggle}
                  isDone={isDone}
                  onReschedule={setRescheduleTarget}
                  onClearReschedule={(cId, orig) => { clearReschedule(cId, orig); setRefresh(r => r + 1) }}
                  onNote={setNoteTarget}
                  onSkip={(cId, orig) => { skipVisitToNextWeek(cId, orig); setRefresh(r => r + 1) }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Sheets */}
      <AnimatePresence>
        {rescheduleTarget && (
          <Sheet key="reschedule" onClose={() => setRescheduleTarget(null)}>
            <RescheduleContent
              target={rescheduleTarget}
              weekStart={startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 })}
              onConfirm={handleReschedule}
              onClose={() => setRescheduleTarget(null)}
            />
          </Sheet>
        )}
        {noteTarget && (
          <Sheet key="note" onClose={() => setNoteTarget(null)}>
            <NoteContent target={noteTarget} onSave={handleNoteSave} onClose={() => setNoteTarget(null)} />
          </Sheet>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Summary tile ─────────────────────────────────────────────────────────────

function SummaryTile({ label, node }) {
  return (
    <div style={S.summaryTile}>
      <span style={S.summaryLabel}>{label}</span>
      <span style={S.summaryValue}>{node}</span>
    </div>
  )
}

// ─── Day group ────────────────────────────────────────────────────────────────

function DayGroup({ date, appointments, onToggle, isDone, onReschedule, onClearReschedule, onNote, onSkip }) {
  const parsed    = parseISO(date)
  const today     = isToday(parsed)
  const dayLabel  = format(parsed, 'EEEE', { locale: ptBR })
  const dateLabel = format(parsed, "d 'de' MMMM", { locale: ptBR })

  return (
    <div style={S.dayGroup}>
      <div style={S.dayHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...S.dayName, color: today ? 'var(--accent)' : 'var(--text)' }}>
            {dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}
          </span>
          {today && <span style={S.todayBadge}>Hoje</span>}
        </div>
        <span style={S.dayDate}>{dateLabel}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {appointments.map(appt => (
          <AppointmentCard
            key={appt.id}
            appt={appt}
            done={isDone(appt.id)}
            onToggle={() => onToggle(appt.id)}
            onReschedule={() => onReschedule({ id: appt.id, clientId: appt.clientId, originalDate: appt.originalDate, currentDate: appt.date })}
            onClearReschedule={() => onClearReschedule(appt.clientId, appt.originalDate)}
            onNote={() => onNote({ clientId: appt.clientId, originalDate: appt.originalDate, clientName: appt.clientName, date: appt.date })}
            onSkip={() => onSkip(appt.clientId, appt.originalDate)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Appointment card ─────────────────────────────────────────────────────────

function AppointmentCard({ appt, done, onToggle, onReschedule, onClearReschedule, onNote, onSkip }) {
  const def    = SERVICE_TYPES[appt.service]
  const note   = getVisitNote(appt.clientId, appt.originalDate)
  const client = getClients().find(c => c.id === appt.clientId)
  const waUrl  = client ? buildWhatsAppConfirmUrl(client, appt.date) : null

  return (
    <motion.div
      layout
      style={{ ...S.card, opacity: done ? 0.42 : 1, borderColor: done ? 'var(--border)' : `${def.color}25` }}
      transition={{ duration: 0.2 }}
    >
      <div style={{ ...S.accentBar, background: def.color }} />
      <div style={S.cardBody}>
        <div style={S.cardTop}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
            <span style={{ ...S.serviceTag, color: def.color }}>{def.label}</span>
            {appt.rescheduled && (
              <span style={S.rescheduledTag}>
                <CalendarClock size={10} />movido
                <button style={S.clearBtn} onClick={onClearReschedule}><X size={9} /></button>
              </span>
            )}
            {note && <span style={S.noteChip}><StickyNote size={10} />obs</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" style={S.iconBtn}>
                <MessageCircle size={16} color="#25D366" />
              </a>
            )}
            {!done && (
              <motion.button
                style={S.iconBtn} onClick={onSkip}
                title="Limpeza falhada — mover para próxima semana"
                whileTap={{ scale: 0.85 }}
              >
                <SkipForward size={16} color="var(--text-3)" />
              </motion.button>
            )}
            <button style={S.iconBtn} onClick={onNote}>
              <StickyNote size={16} color={note ? 'var(--accent)' : 'var(--text-3)'} />
            </button>
            <button style={S.iconBtn} onClick={onReschedule}>
              <CalendarClock size={16} color={appt.rescheduled ? 'var(--accent)' : 'var(--text-3)'} />
            </button>
            <motion.button
              style={S.iconBtn} onClick={onToggle}
              whileTap={{ scale: 0.85 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {done
                ? <CheckCircle2 size={22} color="var(--accent)" strokeWidth={2} />
                : <Circle size={22} color="var(--text-3)" strokeWidth={1.5} />}
            </motion.button>
          </div>
        </div>
        <p style={{ ...S.clientName, textDecoration: done ? 'line-through' : 'none' }}>{appt.clientName}</p>
        {note && <p style={S.notePreview}>{note}</p>}
      </div>
    </motion.div>
  )
}

// ─── Bottom sheet wrapper ─────────────────────────────────────────────────────

function Sheet({ children, onClose }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={S.overlay} onClick={onClose}
      />
      {/* Wrapper handles centering — motion.div only handles y animation */}
      <div style={S.sheetWrapper}>
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          style={S.sheet}
        >
          {children}
        </motion.div>
      </div>
    </>
  )
}

// ─── Note sheet content ───────────────────────────────────────────────────────

function NoteContent({ target, onSave, onClose }) {
  const [text, setText] = useState(getVisitNote(target.clientId, target.originalDate))
  const dateLabel = format(parseISO(target.date), "d 'de' MMMM", { locale: ptBR })

  return (
    <>
      <div style={S.sheetHeader}>
        <div>
          <p style={S.sheetTitle}>Observação</p>
          <p style={S.sheetSub}>{target.clientName} · {dateLabel}</p>
        </div>
        <button style={S.sheetClose} onClick={onClose}><X size={18} /></button>
      </div>
      <textarea
        style={S.noteInput} value={text} onChange={e => setText(e.target.value)} rows={5} autoFocus
        placeholder="Ex: Janela travada. Evitar varanda. Ligar antes de chegar..."
      />
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {text && <button style={S.clearNoteBtn} onClick={() => onSave('')}>Apagar</button>}
        <button style={S.saveBtn} onClick={() => onSave(text)}>Salvar</button>
      </div>
    </>
  )
}

// ─── Reschedule sheet content ─────────────────────────────────────────────────

function RescheduleContent({ target, weekStart, onConfirm, onClose }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE d', { locale: ptBR }) }
  })
  return (
    <>
      <div style={S.sheetHeader}>
        <div>
          <p style={S.sheetTitle}>Mover visita</p>
          <p style={S.sheetSub}>Só afeta esta ocorrência</p>
        </div>
        <button style={S.sheetClose} onClick={onClose}><X size={18} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {days.map(({ date, label }) => {
          const isCurrent  = date === target.currentDate
          const isOriginal = date === target.originalDate
          return (
            <button key={date} onClick={() => onConfirm(date)} style={{
              ...S.dayOption,
              borderColor: isCurrent ? 'var(--accent)' : 'var(--border)',
              background:  isCurrent ? 'var(--accent-dim)' : 'var(--bg-3)',
              color:       isCurrent ? 'var(--accent)' : 'var(--text)',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{label}</span>
              {isOriginal && !isCurrent && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>original</span>}
              {isCurrent && <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700 }}>atual</span>}
            </button>
          )
        })}
      </div>
      {target.currentDate !== target.originalDate && (
        <button style={{ ...S.clearNoteBtn, marginTop: 12, width: '100%' }} onClick={() => onConfirm(target.originalDate)}>
          Voltar ao dia original
        </button>
      )}
    </>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyAgenda({ weekOffset }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={S.empty}>
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ marginBottom: 8 }}>
        <rect x="8" y="8" width="40" height="40" rx="5" stroke="var(--text-3)" strokeWidth="2" />
        <line x1="8" y1="28" x2="48" y2="28" stroke="var(--text-3)" strokeWidth="2" />
        <line x1="28" y1="8" x2="28" y2="48" stroke="var(--text-3)" strokeWidth="2" />
        <line x1="36" y1="20" x2="44" y2="12" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="30" y="14" width="10" height="4" rx="2" transform="rotate(-45 30 14)" fill="var(--accent)" opacity="0.8" />
      </svg>
      <p style={S.emptyTitle}>Nenhuma limpeza</p>
      <p style={S.emptyText}>{weekOffset === 0 ? 'Sem agendamentos para esta semana. Adicione clientes para começar.' : 'Sem agendamentos nessa semana.'}</p>
    </motion.div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  header:       { padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  subtitle:     { fontSize: 13, color: 'var(--text-2)', fontWeight: 300 },
  progressWrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, minWidth: 80 },
  progressText: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)' },
  summaryStrip: {
    margin: '14px 20px 0', background: 'var(--bg-2)',
    border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
    display: 'flex', alignItems: 'stretch',
  },
  summaryTile:  { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 6px', gap: 4 },
  summaryLabel: { fontSize: 9, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', fontWeight: 700 },
  summaryValue: { fontSize: 13, fontWeight: 800 },
  divider:      { width: 1, background: 'var(--border)', margin: '10px 0' },
  weekNav:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' },
  navArrow:     { width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  weekLabel:    { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' },
  content:      { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0 },
  dayGroup:     { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 },
  dayHeader:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  dayName:      { fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 },
  todayBadge:   { fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bg)', background: 'var(--accent)', padding: '2px 7px', borderRadius: 4 },
  dayDate:      { fontSize: 12, color: 'var(--text-3)' },
  card:         { background: 'var(--bg-2)', border: '1px solid', borderRadius: 'var(--r-md)', display: 'flex', overflow: 'hidden' },
  accentBar:    { width: 3, flexShrink: 0 },
  cardBody:     { flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 5 },
  cardTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  serviceTag:   { fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  rescheduledTag: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 4, padding: '1px 5px', fontWeight: 600 },
  noteChip:     { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--accent)', fontWeight: 600 },
  clearBtn:     { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 0 0 2px', color: 'var(--accent)' },
  iconBtn:      { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 },
  clientName:   { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' },
  notePreview:  { fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, background: 'var(--bg-3)', borderRadius: 6, padding: '6px 10px', borderLeft: '2px solid var(--accent)' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200 },
  sheetWrapper: { position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 201, pointerEvents: 'none' },
  sheet:        { width: '100%', maxWidth: 480, background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '24px 24px 0 0', padding: '20px 20px calc(var(--nav-height) + 16px)', pointerEvents: 'auto' },
  sheetHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sheetTitle:   { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 },
  sheetSub:     { fontSize: 13, color: 'var(--text-2)', marginTop: 3 },
  sheetClose:   { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', flexShrink: 0 },
  noteInput:    { width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px', color: 'var(--text)', fontSize: 15, resize: 'none', lineHeight: 1.6, fontFamily: 'var(--font-body)', colorScheme: 'dark' },
  clearNoteBtn: { padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'none', border: '1px solid var(--border)', color: '#FF6B6B', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  saveBtn:      { flex: 1, padding: '12px', borderRadius: 'var(--r-md)', background: 'var(--accent)', border: 'none', color: 'var(--bg)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  dayOption:    { padding: '12px 4px', borderRadius: 'var(--r-sm)', border: '1px solid', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  empty:        { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 32px', gap: 10, textAlign: 'center' },
  emptyTitle:   { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 },
  emptyText:    { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 300 },
}
