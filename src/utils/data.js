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
const RESCHEDULES_KEY = 'autonomo:reschedules'  // { [originalDate:clientId]: newDate }

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

// date-fns uses 0=Sun … 6=Sat; we expose Mon–Sun for the UI
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

// ─── Schedule generation ──────────────────────────────────────────────────────
//
// If the client has a preferredWeekday, we anchor the first occurrence to that
// weekday within the same week as startDate, then repeat every intervalWeeks.

// ─── Visit date generation ────────────────────────────────────────────────────
//
// Projects ALL visits from startDate forward (index 0 = first visit ever).
// This is the canonical sequence — cycles are derived by chunking this list.
// weeksBack lets callers look into the past for cycle calculations.

export function getVisitDates(client, weeksAhead = 12, weeksBack = 0) {
  const def = SERVICE_TYPES[client.service]
  if (!def) return []

  const start = typeof client.startDate === 'string'
    ? parseISO(client.startDate) : new Date(client.startDate)

  // Anchor: respect preferredWeekday within the same week as startDate
  let anchor = new Date(start)
  if (client.preferredWeekday != null) {
    anchor = setDay(start, client.preferredWeekday, { weekStartsOn: 1 })
    if (isBefore(anchor, start)) anchor = addWeeks(anchor, def.intervalWeeks)
  }

  const past    = addWeeks(new Date(), -weeksBack)
  const horizon = addWeeks(new Date(), weeksAhead)

  const results = []
  let cursor = new Date(anchor)
  let safety = 0
  while (isBefore(cursor, horizon) && safety < 500) {
    safety++
    if (!isBefore(cursor, past)) {
      results.push(format(cursor, 'yyyy-MM-dd'))
    }
    cursor = addWeeks(cursor, def.intervalWeeks)
  }
  return results
}

// Returns ALL visits from the very beginning (for cycle math)
export function getAllVisitDates(client) {
  const def = SERVICE_TYPES[client.service]
  if (!def) return []

  const start = typeof client.startDate === 'string'
    ? parseISO(client.startDate) : new Date(client.startDate)

  let anchor = new Date(start)
  if (client.preferredWeekday != null) {
    anchor = setDay(start, client.preferredWeekday, { weekStartsOn: 1 })
    if (isBefore(anchor, start)) anchor = addWeeks(anchor, def.intervalWeeks)
  }

  // Project 3 years forward (enough for any practical use)
  const horizon = addWeeks(new Date(), 156)
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

// ─── Reschedule (one-off date override) ───────────────────────────────────────

// key: `clientId:originalDate`  value: newDate string
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

// Returns the effective date for a visit (may be overridden by a reschedule)
function effectiveDate(clientId, originalDate) {
  const r = getReschedules()
  return r[`${clientId}:${originalDate}`] || originalDate
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
    // We look ±4 extra weeks to catch rescheduled visits that land in this window
    const dates = getVisitDates(client, 16)

    dates.forEach((originalDate) => {
      const displayDate = effectiveDate(client.id, originalDate)
      const date = parseISO(displayDate)
      if (!isWithinInterval(date, { start: weekStart, end: weekEnd })) return

      const id = `${client.id}:${originalDate}`   // ID always uses original date
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
  // Clean up reschedules for this client
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

// ─── Cycle engine ────────────────────────────────────────────────────────────
//
// A billing cycle = a fixed group of N visits starting from client.startDate.
//   semanal:   N=4 visits (4 weeks = ~1 month)
//   quinzenal: N=2 visits (2×2 weeks = ~1 month)
//   mensal:    N=1 visit  (1×4 weeks = ~1 month)
//
// Cycles are numbered from 0: cycle 0 = visits[0..N-1], cycle 1 = visits[N..2N-1], etc.
// A cycle is "due" when its LAST scheduled visit date has passed (regardless of completion).
// This means: 5 Saturdays in a month → visits 1-4 = cycle 0, visit 5 = cycle 1 (not billed yet).
//
// Inadimplência persists across months: if cycle 0 was not paid, it stays overdue forever.

const CYCLE_SIZES = { semanal: 4, quinzenal: 2, mensal: 1 }

// Returns array of cycles for a client: each cycle has { index, visits[], dueDate, charged }
export function getClientCycles(client) {
  const N   = CYCLE_SIZES[client.service] || 1
  const fee = client.monthlyFee || 0
  const all = getAllVisitDates(client)
  const now = new Date()

  const cycles = []
  for (let i = 0; i < all.length; i += N) {
    const visits   = all.slice(i, i + N)
    const dueDate  = parseISO(visits[visits.length - 1]) // last visit of cycle
    const isDue    = !isAfter(dueDate, now)              // past = chargeable
    if (!isDue) break                                    // future cycles not billed yet
    cycles.push({ index: i / N, visits, dueDate, fee })
  }
  return cycles
}

// Current cycle info: which cycle are we in, how many visits done
export function getCurrentCycleInfo(client) {
  const N    = CYCLE_SIZES[client.service] || 1
  const all  = getAllVisitDates(client)
  const now  = new Date()
  const completions = getCompletions()

  // Find the cycle whose window contains today
  for (let i = 0; i < all.length; i += N) {
    const visits   = all.slice(i, i + N)
    const cycleEnd = parseISO(visits[visits.length - 1])
    // This cycle is "current" if today <= cycleEnd or it's the last defined cycle
    if (!isAfter(now, cycleEnd) || i + N >= all.length) {
      const done = visits.filter(v => completions.includes(`${client.id}:${v}`)).length
      return {
        cycleIndex:  i / N,
        total:       visits.length,
        done,
        visits,
        cycleEndDate: visits[visits.length - 1],
      }
    }
  }
  return { cycleIndex: 0, total: N, done: 0, visits: [], cycleEndDate: null }
}

export function getClientBalance(client) {
  const fee    = client.monthlyFee || 0
  const cycles = getClientCycles(client)
  const charged = cycles.length * fee

  const paid    = getPaymentsForClient(client.id).reduce((s, p) => s + p.amount, 0)
  const balance = charged - paid

  return {
    charged,
    paid,
    balance,
    overdue:        balance > 0.005,
    completedCycles: cycles.length,
  }
}

export function getFinancialSummary() {
  const clients = getClients()
  const now     = new Date()
  const mStart  = startOfMonth(now)
  const mEnd    = endOfMonth(now)

  let totalExpectedMonth = 0, totalReceivedMonth = 0, totalDebt = 0, overdueCount = 0

  clients.forEach((client) => {
    const fee    = client.monthlyFee || 0
    // Cycles whose dueDate falls this month = expected revenue this month
    const cycles = getClientCycles(client)
    const cyclesThisMonth = cycles.filter(c => {
      try { return isWithinInterval(c.dueDate, { start: mStart, end: mEnd }) }
      catch { return false }
    })
    totalExpectedMonth += cyclesThisMonth.length * fee

    const payments = getPaymentsForClient(client.id)
    totalReceivedMonth += payments
      .filter((p) => { try { return isWithinInterval(parseISO(p.date), { start: mStart, end: mEnd }) } catch { return false } })
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
  const dates = getVisitDates(client, 8)
  if (!dates[0]) return null
  return { date: effectiveDate(clientId, dates[0]) }
}

// ─── Visit Notes ──────────────────────────────────────────────────────────────

const NOTES_KEY = 'autonomo:notes'  // { [clientId:originalDate]: string }

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
  // month: 0-indexed (Jan=0)
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

    // Payments in this month
    const monthPayments = payments.filter((p) => {
      if (p.clientId !== client.id) return false
      try {
        const d = parseISO(p.date)
        return d >= mStart && d <= mEnd
      } catch { return false }
    })
    const received = monthPayments.reduce((s, p) => s + p.amount, 0)
    totalReceived += received

    // Visits in this month (using completions)
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
      id:         client.id,
      name:       client.name,
      service:    client.service,
      fee,
      received,
      visits:     doneVisits.length,
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
