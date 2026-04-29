import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { SERVICE_TYPES, WEEKDAYS } from '../utils/data.js'
import { format } from 'date-fns'

export default function ClientForm({ initialData = {}, onSubmit, title, submitLabel }) {
  const navigate = useNavigate()
  const today    = format(new Date(), 'yyyy-MM-dd')

  const [form, setForm] = useState({
    name:             initialData.name             || '',
    phone:            initialData.phone            || '',
    service:          initialData.service          || 'mensal',
    startDate:        initialData.startDate        || today,
    monthlyFee:       initialData.monthlyFee != null ? String(initialData.monthlyFee) : '',
    preferredWeekday: initialData.preferredWeekday != null ? String(initialData.preferredWeekday) : '',
  })
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.startDate)   e.startDate = 'Data de início obrigatória'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onSubmit({
      ...form,
      preferredWeekday: form.preferredWeekday !== '' ? Number(form.preferredWeekday) : null,
    })
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <h1 style={styles.title}>{title}</h1>
        <div style={{ width: 36 }} />
      </div>

      <div style={styles.form}>
        {/* Name */}
        <Field label="Nome do cliente" error={errors.name}>
          <input
            style={{ ...styles.input, borderColor: errors.name ? '#FF6B6B' : 'var(--border)' }}
            value={form.name}
            onChange={set('name')}
            placeholder="Ex: João da Silva"
            autoComplete="off"
          />
        </Field>

        {/* Phone */}
        <Field label="Telefone">
          <input
            style={styles.input}
            value={form.phone}
            onChange={set('phone')}
            placeholder="(21) 99999-9999"
            type="tel"
          />
        </Field>

        {/* Monthly fee */}
        <Field label="Mensalidade (R$)">
          <input
            style={styles.input}
            value={form.monthlyFee}
            onChange={set('monthlyFee')}
            placeholder="Ex: 150,00"
            type="number"
            inputMode="decimal"
            min="0"
          />
        </Field>

        {/* Service frequency */}
        <Field label="Frequência do serviço">
          <div style={styles.serviceOptions}>
            {Object.entries(SERVICE_TYPES).map(([key, def]) => (
              <button
                key={key}
                onClick={() => setForm(f => ({ ...f, service: key }))}
                style={{
                  ...styles.serviceOption,
                  borderColor: form.service === key ? def.color : 'var(--border)',
                  background:  form.service === key ? `${def.color}12` : 'var(--bg-3)',
                }}
              >
                <span style={{ ...styles.dot, background: def.color }} />
                <div style={styles.optionText}>
                  <span style={{ ...styles.optionLabel, color: form.service === key ? def.color : 'var(--text)' }}>
                    {def.label}
                  </span>
                  <span style={styles.optionDesc}>{def.description}</span>
                </div>
              </button>
            ))}
          </div>
        </Field>

        {/* Preferred weekday */}
        <Field label="Dia preferido da semana">
          <div style={styles.weekdayGrid}>
            {/* "Sem preferência" option */}
            <button
              onClick={() => setForm(f => ({ ...f, preferredWeekday: '' }))}
              style={{
                ...styles.dayBtn,
                gridColumn: 'span 2',
                borderColor: form.preferredWeekday === '' ? 'var(--accent)' : 'var(--border)',
                background:  form.preferredWeekday === '' ? 'var(--accent-dim)' : 'var(--bg-3)',
                color:       form.preferredWeekday === '' ? 'var(--accent)' : 'var(--text-3)',
              }}
            >
              Qualquer dia
            </button>
            {WEEKDAYS.map(({ value, label }) => {
              const active = form.preferredWeekday === String(value)
              return (
                <button
                  key={value}
                  onClick={() => setForm(f => ({ ...f, preferredWeekday: String(value) }))}
                  style={{
                    ...styles.dayBtn,
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                    background:  active ? 'var(--accent-dim)' : 'var(--bg-3)',
                    color:       active ? 'var(--accent)' : 'var(--text-2)',
                    fontWeight:  active ? 700 : 400,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {form.preferredWeekday !== '' && (
            <p style={styles.weekdayHint}>
              As visitas serão sempre agendadas nas{' '}
              <strong>{WEEKDAYS.find(d => String(d.value) === form.preferredWeekday)?.label}s</strong>.
              Você pode mover individualmente pela agenda.
            </p>
          )}
        </Field>

        {/* Start date */}
        <Field label="Data de início" error={errors.startDate}>
          <input
            style={{ ...styles.input, borderColor: errors.startDate ? '#FF6B6B' : 'var(--border)' }}
            value={form.startDate}
            onChange={set('startDate')}
            type="date"
          />
        </Field>

        <button style={styles.submitBtn} onClick={handleSubmit}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
      {error && <span style={styles.error}>{error}</span>}
    </div>
  )
}

const styles = {
  page: { minHeight: '100%' },
  header: {
    padding: '52px 20px 0',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  back: {
    width: 36, height: 36, borderRadius: 'var(--r-sm)',
    background: 'var(--bg-3)', border: '1px solid var(--border)',
    color: 'var(--text-2)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
  title: {
    fontFamily: 'var(--font-display)', fontSize: 20,
    fontWeight: 800, letterSpacing: '-0.02em',
  },
  form: { padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: {
    fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-2)',
  },
  input: {
    background: 'var(--bg-3)', border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)', padding: '14px 16px',
    color: 'var(--text)', fontSize: 15, width: '100%',
    transition: 'border-color 150ms', colorScheme: 'dark',
  },
  error: { fontSize: 12, color: '#FF6B6B' },
  serviceOptions: { display: 'flex', flexDirection: 'column', gap: 8 },
  serviceOption: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', borderRadius: 'var(--r-md)',
    border: '1px solid', cursor: 'pointer',
    transition: 'border-color 200ms, background 200ms',
    textAlign: 'left', width: '100%',
  },
  dot:        { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  optionText: { display: 'flex', flexDirection: 'column', gap: 2 },
  optionLabel: {
    fontFamily: 'var(--font-display)', fontSize: 15,
    fontWeight: 700, transition: 'color 200ms',
  },
  optionDesc: { fontSize: 12, color: 'var(--text-3)' },
  weekdayGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  dayBtn: {
    padding: '10px 4px', borderRadius: 'var(--r-sm)',
    border: '1px solid', cursor: 'pointer',
    fontFamily: 'var(--font-display)', fontSize: 12,
    transition: 'all 150ms', background: 'none',
  },
  weekdayHint: {
    fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5,
    marginTop: 4,
  },
  submitBtn: {
    padding: '16px', borderRadius: 'var(--r-md)',
    background: 'var(--accent)', color: 'var(--bg)',
    fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800,
    letterSpacing: '0.02em', cursor: 'pointer', border: 'none', marginTop: 4,
  },
}
