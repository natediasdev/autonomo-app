import {
  addWeeks, startOfWeek, endOfWeek, isWithinInterval,
  format, parseISO, isBefore, isAfter, addDays, setDay,
  startOfMonth, endOfMonth, getMonth, getYear, differenceInWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Storage keys ─────────────────────────────────────────────────────────────

const CLIENTS_KEY     = 'autonomo:clients'
const COMPLETIONS_KEY = 'autonomo:completions'
const PAYMENTS_KEY    = 'autonomo:payments'
const RESCHEDULES_KEY = 'autonomo:reschedules'  // { [clientId:originalDate]: newDate }

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
  catch { return fallback }
}

export const getClients      = ()  => load(CLIENTS_KEY)
export const getCompletions  = ()  => load(COMPLETIONS_KEY)
export const getPayments     = ()  => load(PAYMENTS_KEY)
export const getReschedules  = ()  => load(RESCHEDULES_KEY, {})

export const saveClients     = (v) => localStorage.setItem(CLIENTS_KEY,     JSON.stringify(v))
export const saveCompletions = (v) => localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(v))
export const savePayments    = (v) => localStorage.setItem(PAYMENTS_KEY,    JSON.stringify(v))
export const saveReschedules = (v) => localStorage.setItem(RESCHEDULES_KEY, JSON.stringify(v))

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
    description: '1 limpeza por mês (ext + int no mesmo dia)',
  },
  quinzenal: {
    label: 'Quinzenal',
    color: '#FFB347',
    intervalWeeks: 2,
    description: '1 limpeza a cada 2 semanas (ext + int no mesmo dia)',
  },
  semanal: {
    label: 'Semanal',
    color: '#FF6B9D',
    intervalWeeks: 1,
    description: '1 limpeza por semana (ext + int no mesmo dia)',
  },
}

// ─── Visit date generation ────────────────────────────────────────────────────

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

export function getVisitDates(client, weeksAhead = 12) {
  const def = SERVICE_TYPES[client.service]
  if (!def) return []

  const anchor  = buildAnchor(client)
  const horizon = addWeeks(new Date(), weeksAhead)

  const results = []
  let cursor = new Date(anchor)
  let safety = 0
  while (isBefore(cursor, horizon) && safety < 2000) {
    safety++
    results.push(format(cursor, 'yyyy-MM-dd'))
    cursor = addWeeks(cursor, def.intervalWeeks)
  }
  return results
}

export function getAllVisitDates(client) {
  const def = SERVICE_TYPES[client.service]
  if (!def) return []

  const anchor  = buildAnchor(client)
  const horizon = addWeeks(new Date(), 156) // ~3 years forward
  const results = []
  let cursor = new Date(anchor)
  let safety = 0
  while (isBefore(cursor, horizon) && safety < 2000) {
    safety++
    results.push(format(cursor, 'yyyy-MM-dd'))
    cursor = addWeeks(cursor, def.intervalWeeks)
  }
  return results
}

// ─── Reschedule helpers ───────────────────────────────────────────────────────

// Returns the effective (possibly rescheduled) date for a single original visit.
// Supports chaining: if the effective date was itself rescheduled, follows the chain.
// Max depth = 20 to prevent cycles.
function effectiveDate(clientId, originalDate) {
  const r = getReschedules()
  let current = originalDate
  let depth = 0
  while (r[`${clientId}:${current}`] && depth < 20) {
    current = r[`${clientId}:${current}`]
    depth++
  }
  return current
}

// key: `clientId:originalDate`  value: newDate string
// Isolated reschedule — only moves this single occurrence.
export function rescheduleVisit(clientId, originalDate, newDate) {
  const r = getReschedules()
  // Always write against the true original key so chaining works correctly.
  // Find the original key that points (directly or via chain) to the current effective date.
  const trueOriginal = _findOriginalKey(clientId, originalDate)
  r[`${clientId}:${trueOriginal}`] = newDate
  saveReschedules(r)
}

// Given a date that may be an effective (rescheduled) date, walks back to find
// the original canonical date that produced it.
function _findOriginalKey(clientId, date) {
  const r = getReschedules()
  // If this key already exists as an original → it IS the original.
  if (r[`${clientId}:${date}`] !== undefined) return date
  // Otherwise, check if any key maps to this date — if so, that key is the original.
  const entry = Object.entries(r).find(
    ([k, v]) => k.startsWith(`${clientId}:`) && v === date
  )
  if (entry) return entry[0].replace(`${clientId}:`, '')
  // Not found in reschedules → it's an unmodified original date.
  return date
}

export function clearReschedule(clientId, originalDate) {
  const r = getReschedules()
  // Clear the chain starting from the original key
  const trueOriginal = _findOriginalKey(clientId, originalDate)
  delete r[`${clientId}:${trueOriginal}`]
  saveReschedules(r)
}

// ─── Skip visit in cascade (+7 days on failed visit AND all subsequent visits) ─
//
// Example: original series [18/04, 02/05, 16/05, 30/05]
// Skip 02/05 → effective series becomes [18/04, 09/05, 23/05, 06/06]
// The skipped visit and every visit after it shifts +7 days.
//
// Implementation: we write one reschedule entry per affected original date.
// Existing reschedules on affected dates are offset by +7 on top of their
// current effective date (so cascades stack correctly on multiple skips).

export function skipVisitToNextWeek(clientId, originalDate) {
  const client = getClients().find(c => c.id === clientId)
  if (!client) return

  const all = getAllVisitDates(client)
  const idx = all.indexOf(originalDate)
  if (idx === -1) return

  // All original dates from the skipped visit onwards
  const affected = all.slice(idx)

  const r = getReschedules()
  affected.forEach((orig) => {
    const key = `${clientId}:${orig}`
    // Shift the current effective date by +7 days
    const current = r[key] || orig
    r[key] = format(addWeeks(parseISO(current), 1), 'yyyy-MM-dd')
  })
  saveReschedules(r)
}

// ─── Week view ────────────────────────────────────────────────────────────────

export function getWeekAppointments(weekOffset = 0) {
  const clients     = getClients()
  const completions = getCompletions()
  const now         = new Date()
  const weekStart   = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 })
  const weekEnd     = endOfWeek(addWeeks(now, weekOffset),   { weekStartsOn: 1 })

  const appointments = []

  clients.forEach((client) => {
    const dates = getVisitDates(client, 20)

    dates.forEach((originalDate) => {
      const displayDate = effectiveDate(client.id, originalDate)
      const date = parseISO(displayDate)
      if (!isWithinInterval(date, { start: weekStart, end: weekEnd })) return

      const id = `${client.id}:${originalDate}`
      const rescheduled = displayDate !== originalDate

      appointments.push({
        id,
        clientId:      client.id,
        clientName:    client.name,
        clientPhone:   client.phone,
        service:       client.service,
        originalDate,
        date:          displayDate,
        rescheduled,
        done:          completions.includes(id),
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
    id, name, phone, service, startDate,
    monthlyFee:       parseFloat(monthlyFee) || 0,
    preferredWeekday: preferredWeekday != null ? Number(preferredWeekday) : null,
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
  if (data.monthlyFee  !== undefined) data.monthlyFee  = parseFloat(data.monthlyFee) || 0
  if (data.preferredWeekday !== undefined)
    data.preferredWeekday = data.preferredWeekday != null ? Number(data.preferredWeekday) : null
  clients[idx] = { ...clients[idx], ...data }
  saveClients(clients)
  return clients[idx]
}

export function deleteClient(id) {
  saveClients(getClients().filter((c) => c.id !== id))
  savePayments(getPayments().filter((p) => p.clientId !== id))
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

// ─── Cycle engine ─────────────────────────────────────────────────────────────
//
// BILLING RULE: charge as soon as a cycle's FIRST visit arrives.
// Uses effective dates (post-reschedule/skip) for all timing logic.
// Completions always use the original date as key.

const CYCLE_SIZES = { semanal: 4, quinzenal: 2, mensal: 1 }

export function getClientCycles(client) {
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

    // Cycle hasn't started yet — stop
    if (firstVisit > today) break

    const isActive  = firstVisit <= today && lastVisit >= today
    const isOverdue = lastVisit < today

    cycles.push({
      index: i / N,
      visits: originalVisits,       // originals for completion lookup
      effectiveVisits,              // effective for display / timing logic
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
  const N           = CYCLE_SIZES[client.service] || 1
  const all         = getAllVisitDates(client)
  const today       = format(new Date(), 'yyyy-MM-dd')
  const completions = getCompletions()

  let lastIdx = 0
  for (let i = 0; i < all.length; i += N) {
    const originalVisits  = all.slice(i, i + N)
    const effectiveVisits = originalVisits.map(v => effectiveDate(client.id, v))

    const cycleStart = effectiveVisits[0]
    const cycleEnd   = effectiveVisits[effectiveVisits.length - 1]

    if (cycleEnd >= today) {
      const done = originalVisits.filter(v =>
        completions.includes(`${client.id}:${v}`)
      ).length
      return {
        cycleIndex:     i / N,
        total:          originalVisits.length,
        done,
        visits:         originalVisits,
        cycleEndDate:   cycleEnd,
        cycleStartDate: cycleStart,
      }
    }
    lastIdx = i
  }

  // Fallback: last cycle
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
  const fee    = client.monthlyFee || 0
  const cycles = getClientCycles(client)
  const charged = cycles.length * fee

  const paid    = getPaymentsForClient(client.id).reduce((s, p) => s + p.amount, 0)
  const balance = charged - paid
  const overdue = cycles.length > 0 && balance > 0.005

  return {
    charged,
    paid,
    balance,
    overdue,
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
    const fee    = client.monthlyFee || 0
    const cycles = getClientCycles(client)
    const cyclesThisMonth = cycles.filter(
      c => c.firstVisit >= mStartStr && c.firstVisit <= mEndStr
    )
    totalExpectedMonth += cyclesThisMonth.length * fee

    const payments = getPaymentsForClient(client.id)
    totalReceivedMonth += payments
      .filter((p) => {
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
  const dates = getVisitDates(client, 12)
  const today = format(new Date(), 'yyyy-MM-dd')
  const next  = dates.find(d => effectiveDate(clientId, d) >= today)
  if (!next) return null
  return { date: effectiveDate(clientId, next) }
}

// ─── Visit Notes ──────────────────────────────────────────────────────────────

const NOTES_KEY = 'autonomo:notes'

function getNotes() { return load(NOTES_KEY, {}) }
function saveNotes(v) { localStorage.setItem(NOTES_KEY, JSON.stringify(v)) }

export function getVisitNote(clientId, originalDate) {
  return getNotes()[`${clientId}:${originalDate}`] || ''
}

export function saveVisitNote(clientId, originalDate, text) {
  const notes = getNotes()
  if (text.trim()) {
    notes[`${clientId}:${originalDate}`] = text.trim()
  } else {
    delete notes[`${clientId}:${originalDate}`]
  }
  saveNotes(notes)
}

// ─── Monthly Report ───────────────────────────────────────────────────────────

export function getMonthlyReport(year, month) {
  const clients  = getClients()
  const payments = getPayments()
  const notes    = getNotes()
  const mStart   = new Date(year, month, 1)
  const mEnd     = new Date(year, month + 1, 0, 23, 59, 59)

  let totalExpected   = 0
  let totalReceived   = 0
  let totalVisits     = 0
  let overdueClients  = []
  const clientDetails = []

  clients.forEach((client) => {
    const fee = client.monthlyFee || 0
    totalExpected += fee

    const monthPayments = payments.filter((p) => {
      if (p.clientId !== client.id) return false
      try {
        const d = parseISO(p.date)
        return d >= mStart && d <= mEnd
      } catch { return false }
    })
    const received = monthPayments.reduce((s, p) => s + p.amount, 0)
    totalReceived += received

    const completions = getCompletions()
    const visitDates  = getVisitDates(client, 16)
    const monthVisits = visitDates.filter((orig) => {
      const effective = effectiveDate(client.id, orig)
      try {
        const d = parseISO(effective)
        return d >= mStart && d <= mEnd
      } catch { return false }
    })

    const doneVisits = monthVisits.filter(orig =>
      completions.includes(`${client.id}:${orig}`)
    )
    totalVisits += doneVisits.length

    const { balance, overdue } = getClientBalance(client)
    if (overdue) overdueClients.push({ name: client.name, balance })

    clientDetails.push({
      id:          client.id,
      name:        client.name,
      service:     client.service,
      fee,
      received,
      visits:      doneVisits.length,
      totalVisits: monthVisits.length,
      overdue,
      balance,
    })
  })

  return {
    year, month,
    totalExpected,
    totalReceived,
    totalVisits,
    overdueClients,
    clientDetails,
  }
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

export function buildWhatsAppConfirmUrl(client, visitDate) {
  const dateLabel = format(parseISO(visitDate), "EEEE, d 'de' MMMM", { locale: ptBR })
  const msg = `Olá ${client.name}! 😊 Passando para confirmar a limpeza dos vidros na ${dateLabel}. Qualquer imprevisto é só me avisar!`
  const phone = client.phone?.replace(/\D/g, '')
  if (!phone) return null
  return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
}
