import {
  addWeeks, subWeeks, startOfWeek, endOfWeek, isWithinInterval,
  format, parseISO, isBefore, setDay,
  startOfMonth, endOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Storage keys ─────────────────────────────────────────────────────────────

const CLIENTS_KEY     = 'autonomo:clients'
const COMPLETIONS_KEY = 'autonomo:completions'
const PAYMENTS_KEY    = 'autonomo:payments'
const RESCHEDULES_KEY = 'autonomo:reschedules'
const NOTES_KEY       = 'autonomo:notes'
const OCCASIONS_KEY   = 'autonomo:occasions'   // manual visits for ocasional clients

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
  catch { return fallback }
}

export const getClients      = () => load(CLIENTS_KEY)
export const getCompletions  = () => load(COMPLETIONS_KEY)
export const getPayments     = () => load(PAYMENTS_KEY)
export const getReschedules  = () => load(RESCHEDULES_KEY, {})
export const getNotes        = () => load(NOTES_KEY, {})
export const getOccasions    = () => load(OCCASIONS_KEY, [])  // [{ id, clientId, date, fee, note }]

export const saveClients     = (v) => localStorage.setItem(CLIENTS_KEY,     JSON.stringify(v))
export const saveCompletions = (v) => localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(v))
export const savePayments    = (v) => localStorage.setItem(PAYMENTS_KEY,    JSON.stringify(v))
export const saveReschedules = (v) => localStorage.setItem(RESCHEDULES_KEY, JSON.stringify(v))
export const saveNotes       = (v) => localStorage.setItem(NOTES_KEY,       JSON.stringify(v))
export const saveOccasions   = (v) => localStorage.setItem(OCCASIONS_KEY,   JSON.stringify(v))

// ─── Constants ────────────────────────────────────────────────────────────────

export const WEEKDAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça'   },
  { value: 3, label: 'Quarta'  },
  { value: 4, label: 'Quinta'  },
  { value: 5, label: 'Sexta'   },
  { value: 6, label: 'Sábado'  },
  { value: 0, label: 'Domingo' },
]

export const SERVICE_TYPES = {
  mensal: {
    label: 'Mensal',
    color: '#4ECDC4',
    intervalWeeks: 4,
    description: '1 limpeza por mês',
  },
  quinzenal: {
    label: 'Quinzenal',
    color: '#FFB347',
    intervalWeeks: 2,
    description: '1 limpeza a cada 2 semanas',
  },
  semanal: {
    label: 'Semanal',
    color: '#FF6B9D',
    intervalWeeks: 1,
    description: '1 limpeza por semana',
  },
  // ── NEW ──
  ocasional: {
    label: 'Ocasional',
    color: '#A78BFA',
    intervalWeeks: null,     // no automatic cadence
    description: 'Visitas avulsas agendadas manualmente',
  },
}

// ─── Visit date generation (recurring clients only) ───────────────────────────

function buildAnchor(client) {
  const def   = SERVICE_TYPES[client.service]
  const start = typeof client.startDate === 'string'
    ? parseISO(client.startDate) : new Date(client.startDate)

  let anchor = new Date(start)
  if (client.preferredWeekday != null) {
    anchor = setDay(start, client.preferredWeekday, { weekStartsOn: 1 })
    if (isBefore(anchor, start)) anchor = addWeeks(anchor, def.intervalWeeks)
  }
  return anchor
}

// Returns canonical original dates for recurring clients.
// For ocasional clients always returns [].
export function getAllVisitDates(client) {
  if (client.service === 'ocasional') return []
  const def = SERVICE_TYPES[client.service]
  if (!def || !def.intervalWeeks) return []

  const anchor  = buildAnchor(client)
  // Respect pause: only generate visits outside paused periods
  const pauses  = client.pauses || []   // [{ from: 'yyyy-MM-dd', to: 'yyyy-MM-dd' }]
  const horizon = addWeeks(new Date(), 156)
  const results = []
  let cursor = new Date(anchor)
  let safety = 0

  while (isBefore(cursor, horizon) && safety < 2000) {
    safety++
    const dateStr = format(cursor, 'yyyy-MM-dd')
    const paused  = pauses.some(p => dateStr >= p.from && dateStr <= p.to)
    if (!paused) results.push(dateStr)
    cursor = addWeeks(cursor, def.intervalWeeks)
  }
  return results
}

export function getVisitDates(client, weeksAhead = 12) {
  if (client.service === 'ocasional') return []
  const def = SERVICE_TYPES[client.service]
  if (!def || !def.intervalWeeks) return []

  const anchor  = buildAnchor(client)
  const pauses  = client.pauses || []
  const horizon = addWeeks(new Date(), weeksAhead)
  const results = []
  let cursor = new Date(anchor)
  let safety = 0

  while (isBefore(cursor, horizon) && safety < 2000) {
    safety++
    const dateStr = format(cursor, 'yyyy-MM-dd')
    const paused  = pauses.some(p => dateStr >= p.from && dateStr <= p.to)
    if (!paused) results.push(dateStr)
    cursor = addWeeks(cursor, def.intervalWeeks)
  }
  return results
}

// ─── Effective date resolution ────────────────────────────────────────────────

function effectiveDate(clientId, originalDate) {
  const r = getReschedules()
  return r[`${clientId}:${originalDate}`] || originalDate
}

// ─── Isolated reschedule — calendar icon ─────────────────────────────────────

export function rescheduleVisit(clientId, originalDate, newDate) {
  const r = getReschedules()
  r[`${clientId}:${originalDate}`] = newDate
  saveReschedules(r)
}

export function clearReschedule(clientId, originalDate) {
  const r = getReschedules()
  delete r[`${clientId}:${originalDate}`]
  saveReschedules(r)
}

// ─── Cascade skip — arrow icon (+7 days on target + all subsequent) ───────────

export function skipVisitToNextWeek(clientId, originalDate) {
  const client = getClients().find(c => c.id === clientId)
  if (!client || client.service === 'ocasional') return

  const all = getAllVisitDates(client)
  const idx = all.indexOf(originalDate)
  if (idx === -1) return

  const r = getReschedules()
  for (let i = idx; i < all.length; i++) {
    const orig = all[i]
    const key  = `${clientId}:${orig}`
    const cur  = r[key] || orig
    r[key] = format(addWeeks(parseISO(cur), 1), 'yyyy-MM-dd')
  }
  saveReschedules(r)
}

// ─── Cascade undo — X on "movido" badge (-7 days on target + all subsequent) ──

export function undoCascadeSkip(clientId, originalDate) {
  const client = getClients().find(c => c.id === clientId)
  if (!client || client.service === 'ocasional') return

  const all = getAllVisitDates(client)
  const idx = all.indexOf(originalDate)
  if (idx === -1) return

  const r = getReschedules()
  for (let i = idx; i < all.length; i++) {
    const orig   = all[i]
    const key    = `${clientId}:${orig}`
    const cur    = r[key] || orig
    const undone = format(subWeeks(parseISO(cur), 1), 'yyyy-MM-dd')
    if (undone === orig) delete r[key]
    else r[key] = undone
  }
  saveReschedules(r)
}

// ─── Pause / Resume (recurring clients only) ─────────────────────────────────
//
// A pause period = { from: 'yyyy-MM-dd', to: 'yyyy-MM-dd' }.
// Visits whose original date falls within a pause are excluded from the series.
// No charges accumulate during a pause.
// Resuming simply closes the latest open pause (to = today).

export function pauseClient(clientId, fromDate) {
  const clients = getClients()
  const idx = clients.findIndex(c => c.id === clientId)
  if (idx === -1) return
  const pauses = clients[idx].pauses || []
  // Don't double-add if already paused
  const alreadyPaused = pauses.some(p => !p.to)
  if (alreadyPaused) return
  pauses.push({ from: fromDate || format(new Date(), 'yyyy-MM-dd'), to: null })
  clients[idx] = { ...clients[idx], pauses }
  saveClients(clients)
}

export function resumeClient(clientId, toDate) {
  const clients = getClients()
  const idx = clients.findIndex(c => c.id === clientId)
  if (idx === -1) return
  const pauses = (clients[idx].pauses || []).map(p =>
    !p.to ? { ...p, to: toDate || format(new Date(), 'yyyy-MM-dd') } : p
  )
  clients[idx] = { ...clients[idx], pauses }
  saveClients(clients)
}

export function isClientPaused(client) {
  return (client.pauses || []).some(p => !p.to)
}

// ─── Occasional visits ────────────────────────────────────────────────────────
//
// Each occasion = { id, clientId, date, fee, note, done }
// The "done" flag drives completion display (same as toggleCompletion for recurring).

export function getOccasionsForClient(clientId) {
  return getOccasions()
    .filter(o => o.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function addOccasion({ clientId, date, fee, note = '' }) {
  const occasions = getOccasions()
  const id = `occ_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const occasion = {
    id, clientId,
    date: date || format(new Date(), 'yyyy-MM-dd'),
    fee:  parseFloat(fee) || 0,
    note,
    done: false,
    createdAt: new Date().toISOString(),
  }
  occasions.push(occasion)
  saveOccasions(occasions)
  return occasion
}

export function deleteOccasion(id) {
  saveOccasions(getOccasions().filter(o => o.id !== id))
}

export function toggleOccasionDone(id) {
  const occasions = getOccasions()
  const idx = occasions.findIndex(o => o.id === id)
  if (idx === -1) return
  occasions[idx] = { ...occasions[idx], done: !occasions[idx].done }
  saveOccasions(occasions)
  return occasions[idx]
}

// ─── Week view ────────────────────────────────────────────────────────────────

export function getWeekAppointments(weekOffset = 0) {
  const clients     = getClients()
  const completions = getCompletions()
  const occasions   = getOccasions()
  const now         = new Date()
  const weekStart   = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 })
  const weekEnd     = endOfWeek(addWeeks(now, weekOffset),   { weekStartsOn: 1 })

  const appointments = []

  clients.forEach((client) => {
    // ── Ocasional: show occasions that fall in this week ──
    if (client.service === 'ocasional') {
      occasions
        .filter(o => o.clientId === client.id)
        .forEach(o => {
          try {
            const d = parseISO(o.date)
            if (!isWithinInterval(d, { start: weekStart, end: weekEnd })) return
          } catch { return }

          appointments.push({
            id:          o.id,
            clientId:    client.id,
            clientName:  client.name,
            clientPhone: client.phone,
            service:     'ocasional',
            originalDate: o.date,
            date:         o.date,
            rescheduled:  false,
            done:         o.done,
            isOccasion:   true,
            fee:          o.fee,
          })
        })
      return
    }

    // ── Recurring: skip paused clients ──
    if (isClientPaused(client)) return

    const dates = getVisitDates(client, 28)
    dates.forEach((originalDate) => {
      const displayDate = effectiveDate(client.id, originalDate)
      let d
      try { d = parseISO(displayDate) } catch { return }
      if (!isWithinInterval(d, { start: weekStart, end: weekEnd })) return

      const id = `${client.id}:${originalDate}`
      appointments.push({
        id,
        clientId:    client.id,
        clientName:  client.name,
        clientPhone: client.phone,
        service:     client.service,
        originalDate,
        date:        displayDate,
        rescheduled: displayDate !== originalDate,
        done:        completions.includes(id),
        isOccasion:  false,
      })
    })
  })

  appointments.sort((a, b) => a.date.localeCompare(b.date))
  return { appointments, weekStart, weekEnd }
}

export function toggleCompletion(id) {
  const completions = getCompletions()
  const idx = completions.indexOf(id)
  if (idx === -1) completions.push(id)
  else completions.splice(idx, 1)
  saveCompletions(completions)
  return [...completions]
}

// ─── Client CRUD ──────────────────────────────────────────────────────────────

export function createClient({ name, phone, service, startDate, monthlyFee, preferredWeekday }) {
  const clients = getClients()
  const id = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const client = {
    id, name, phone, service,
    startDate:        service !== 'ocasional' ? startDate : null,
    monthlyFee:       service !== 'ocasional' ? (parseFloat(monthlyFee) || 0) : 0,
    preferredWeekday: (service !== 'ocasional' && preferredWeekday != null) ? Number(preferredWeekday) : null,
    pauses:           [],
    createdAt: new Date().toISOString(),
  }
  clients.push(client)
  saveClients(clients)
  return client
}

export function updateClient(id, data) {
  const clients = getClients()
  const idx = clients.findIndex((c) => c.id === id)
  if (idx === -1) return null
  if (data.monthlyFee !== undefined)
    data.monthlyFee = parseFloat(data.monthlyFee) || 0
  if (data.preferredWeekday !== undefined)
    data.preferredWeekday = data.preferredWeekday != null ? Number(data.preferredWeekday) : null
  clients[idx] = { ...clients[idx], ...data }
  saveClients(clients)
  return clients[idx]
}

export function deleteClient(id) {
  saveClients(getClients().filter((c) => c.id !== id))
  savePayments(getPayments().filter((p) => p.clientId !== id))
  saveOccasions(getOccasions().filter((o) => o.clientId !== id))
  const r = getReschedules()
  Object.keys(r).forEach(k => { if (k.startsWith(`${id}:`)) delete r[k] })
  saveReschedules(r)
}

// ─── Financial ────────────────────────────────────────────────────────────────

export function getPaymentsForClient(clientId) {
  return getPayments()
    .filter((p) => p.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function addPayment({ clientId, amount, date, note = '' }) {
  const payments = getPayments()
  const payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    clientId,
    amount: parseFloat(amount) || 0,
    date:   date || format(new Date(), 'yyyy-MM-dd'),
    note,
    createdAt: new Date().toISOString(),
  }
  payments.push(payment)
  savePayments(payments)
  return payment
}

export function deletePayment(id) {
  savePayments(getPayments().filter((p) => p.id !== id))
}

// ─── Cycle engine (recurring only) ───────────────────────────────────────────
//
// Ocasional clients have no cycles — their balance = sum of occasion fees - payments.

const CYCLE_SIZES = { semanal: 4, quinzenal: 2, mensal: 1 }

export function getClientCycles(client) {
  if (client.service === 'ocasional') return []

  const N     = CYCLE_SIZES[client.service] || 1
  const fee   = client.monthlyFee || 0
  const all   = getAllVisitDates(client)
  const today = format(new Date(), 'yyyy-MM-dd')

  const cycles = []
  for (let i = 0; i < all.length; i += N) {
    const originalVisits  = all.slice(i, i + N)
    const effectiveVisits = originalVisits.map(v => effectiveDate(client.id, v))

    const firstVisit = effectiveVisits[0]
    const lastVisit  = effectiveVisits[effectiveVisits.length - 1]

    if (firstVisit > today) break

    const isActive  = firstVisit <= today && lastVisit >= today
    const isOverdue = lastVisit < today

    cycles.push({
      index: i / N,
      visits: originalVisits,
      effectiveVisits,
      firstVisit,
      lastVisit,
      dueDate: parseISO(lastVisit),
      fee,
      isActive,
      isOverdue,
    })
  }
  return cycles
}

export function getCurrentCycleInfo(client) {
  if (client.service === 'ocasional') {
    // For ocasional: show total occasions and done count
    const occasions = getOccasionsForClient(client.id)
    return {
      cycleIndex:     0,
      total:          occasions.length,
      done:           occasions.filter(o => o.done).length,
      visits:         [],
      cycleEndDate:   null,
      cycleStartDate: null,
      isOcasional:    true,
    }
  }

  const N           = CYCLE_SIZES[client.service] || 1
  const all         = getAllVisitDates(client)
  const today       = format(new Date(), 'yyyy-MM-dd')
  const completions = getCompletions()

  let lastIdx = 0
  for (let i = 0; i < all.length; i += N) {
    const originalVisits  = all.slice(i, i + N)
    const effectiveVisits = originalVisits.map(v => effectiveDate(client.id, v))
    const cycleStart      = effectiveVisits[0]
    const cycleEnd        = effectiveVisits[effectiveVisits.length - 1]

    if (cycleEnd >= today) {
      const done = originalVisits.filter(v =>
        completions.includes(`${client.id}:${v}`)
      ).length
      return { cycleIndex: i / N, total: originalVisits.length, done, visits: originalVisits, cycleEndDate: cycleEnd, cycleStartDate: cycleStart }
    }
    lastIdx = i
  }

  const originalVisits  = all.slice(lastIdx, lastIdx + N)
  const effectiveVisits = originalVisits.map(v => effectiveDate(client.id, v))
  const done = originalVisits.filter(v =>
    completions.includes(`${client.id}:${v}`)
  ).length
  return {
    cycleIndex:     lastIdx / N,
    total:          originalVisits.length,
    done,
    visits:         originalVisits,
    cycleEndDate:   effectiveVisits[effectiveVisits.length - 1] || null,
    cycleStartDate: effectiveVisits[0] || null,
  }
}

export function getClientBalance(client) {
  const payments = getPaymentsForClient(client.id)
  const paid     = payments.reduce((s, p) => s + p.amount, 0)

  // Ocasional: charged = sum of occasion fees for done occasions
  if (client.service === 'ocasional') {
    const occasions = getOccasionsForClient(client.id)
    const charged   = occasions.reduce((s, o) => s + (o.fee || 0), 0)
    const balance   = charged - paid
    const overdue   = charged > 0 && balance > 0.005
    return { charged, paid, balance, overdue, activeCycles: 0, completedCycles: 0, totalCycles: 0, isOcasional: true }
  }

  const fee    = client.monthlyFee || 0
  const cycles = getClientCycles(client)
  const charged = cycles.length * fee
  const balance = charged - paid
  const overdue = cycles.length > 0 && balance > 0.005

  return {
    charged, paid, balance, overdue,
    activeCycles:    cycles.filter(c => c.isActive).length,
    completedCycles: cycles.filter(c => c.isOverdue).length,
    totalCycles:     cycles.length,
  }
}

export function getFinancialSummary() {
  const clients   = getClients()
  const now       = new Date()
  const mStart    = startOfMonth(now)
  const mEnd      = endOfMonth(now)
  const mStartStr = format(mStart, 'yyyy-MM-dd')
  const mEndStr   = format(mEnd,   'yyyy-MM-dd')

  let totalExpectedMonth = 0, totalReceivedMonth = 0, totalDebt = 0, overdueCount = 0

  clients.forEach((client) => {
    if (client.service === 'ocasional') {
      // Ocasional: expected this month = sum of occasion fees in this month
      const occ = getOccasionsForClient(client.id)
      const occThisMonth = occ.filter(o => o.date >= mStartStr && o.date <= mEndStr)
      totalExpectedMonth += occThisMonth.reduce((s, o) => s + (o.fee || 0), 0)
    } else {
      const fee    = client.monthlyFee || 0
      const cycles = getClientCycles(client)
      const cyclesThisMonth = cycles.filter(
        c => c.firstVisit >= mStartStr && c.firstVisit <= mEndStr
      )
      totalExpectedMonth += cyclesThisMonth.length * fee
    }

    const payments = getPaymentsForClient(client.id)
    totalReceivedMonth += payments
      .filter(p => {
        try { return isWithinInterval(parseISO(p.date), { start: mStart, end: mEnd }) }
        catch { return false }
      })
      .reduce((s, p) => s + p.amount, 0)

    const { balance, overdue } = getClientBalance(client)
    if (overdue) { totalDebt += balance; overdueCount++ }
  })

  return { totalExpectedMonth, totalReceivedMonth, totalDebt, overdueCount }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDatePtBR(dateStr) {
  return format(parseISO(dateStr), "EEEE, d 'de' MMMM", { locale: ptBR })
}

export function formatShortDate(dateStr) {
  return format(parseISO(dateStr), 'd MMM', { locale: ptBR })
}

export function formatWeekRange(start, end) {
  return `${format(start, "d 'de' MMM", { locale: ptBR })} – ${format(end, "d 'de' MMM", { locale: ptBR })}`
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

export function getNextVisit(clientId) {
  const client = getClients().find((c) => c.id === clientId)
  if (!client) return null
  if (client.service === 'ocasional') {
    const today = format(new Date(), 'yyyy-MM-dd')
    const next  = getOccasionsForClient(clientId).find(o => o.date >= today)
    return next ? { date: next.date } : null
  }
  const dates = getVisitDates(client, 28)
  const today = format(new Date(), 'yyyy-MM-dd')
  const next  = dates.find(d => effectiveDate(clientId, d) >= today)
  if (!next) return null
  return { date: effectiveDate(clientId, next) }
}

// ─── Visit Notes ──────────────────────────────────────────────────────────────

export function getVisitNote(clientId, originalDate) {
  return getNotes()[`${clientId}:${originalDate}`] || ''
}

export function saveVisitNote(clientId, originalDate, text) {
  const notes = getNotes()
  if (text.trim()) notes[`${clientId}:${originalDate}`] = text.trim()
  else delete notes[`${clientId}:${originalDate}`]
  saveNotes(notes)
}

// ─── Monthly Report ───────────────────────────────────────────────────────────

export function getMonthlyReport(year, month) {
  const clients  = getClients()
  const payments = getPayments()
  const mStart   = new Date(year, month, 1)
  const mEnd     = new Date(year, month + 1, 0, 23, 59, 59)
  const mStartStr = format(mStart, 'yyyy-MM-dd')
  const mEndStr   = format(mEnd,   'yyyy-MM-dd')

  let totalExpected  = 0
  let totalReceived  = 0
  let totalVisits    = 0
  let overdueClients = []
  const clientDetails = []

  clients.forEach((client) => {
    const monthPayments = payments.filter(p => {
      if (p.clientId !== client.id) return false
      try { const d = parseISO(p.date); return d >= mStart && d <= mEnd }
      catch { return false }
    })
    const received = monthPayments.reduce((s, p) => s + p.amount, 0)
    totalReceived += received

    let fee = 0
    let visitsCount = 0
    let totalVisitsCount = 0

    if (client.service === 'ocasional') {
      const occ = getOccasionsForClient(client.id)
      const occMonth = occ.filter(o => o.date >= mStartStr && o.date <= mEndStr)
      fee = occMonth.reduce((s, o) => s + (o.fee || 0), 0)
      totalVisitsCount = occMonth.length
      visitsCount      = occMonth.filter(o => o.done).length
    } else {
      fee = client.monthlyFee || 0
      const completions = getCompletions()
      const visitDates  = getVisitDates(client, 28)
      const monthVisits = visitDates.filter(orig => {
        const eff = effectiveDate(client.id, orig)
        try { const d = parseISO(eff); return d >= mStart && d <= mEnd }
        catch { return false }
      })
      totalVisitsCount = monthVisits.length
      visitsCount      = monthVisits.filter(o => completions.includes(`${client.id}:${o}`)).length
    }

    totalExpected += fee
    totalVisits   += visitsCount

    const { balance, overdue } = getClientBalance(client)
    if (overdue) overdueClients.push({ name: client.name, balance })

    clientDetails.push({
      id:          client.id,
      name:        client.name,
      service:     client.service,
      fee,
      received,
      visits:      visitsCount,
      totalVisits: totalVisitsCount,
      overdue,
      balance,
    })
  })

  return { year, month, totalExpected, totalReceived, totalVisits, overdueClients, clientDetails }
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

export function buildWhatsAppConfirmUrl(client, visitDate) {
  const dateLabel = format(parseISO(visitDate), "EEEE, d 'de' MMMM", { locale: ptBR })
  const msg = `Olá ${client.name}! 😊 Passando para confirmar a limpeza dos vidros na ${dateLabel}. Qualquer imprevisto é só me avisar!`
  const phone = client.phone?.replace(/\D/g, '')
  if (!phone) return null
  return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
}
