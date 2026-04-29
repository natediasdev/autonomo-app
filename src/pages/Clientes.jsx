import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronRight, Trash2, Phone, AlertCircle } from 'lucide-react'
import { getClients, deleteClient, SERVICE_TYPES, getNextVisit, formatShortDate, getClientBalance, formatCurrency } from '../utils/data.js'
import { SkeletonCard } from '../components/Skeleton.jsx'

export default function Clientes() {
  const navigate = useNavigate()
  const [clients, setClients] = useState(getClients)
  const [confirmDel, setConfirmDel] = useState(null)
  const [loaded] = useState(true)

  const handleDelete = (id) => {
    deleteClient(id)
    setClients(getClients())
    setConfirmDel(null)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Clientes</h1>
          <p style={S.subtitle}>{clients.length} cadastrado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <motion.button
          style={S.addBtn} onClick={() => navigate('/clientes/novo')}
          whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <Plus size={20} strokeWidth={2.5} />
        </motion.button>
      </div>

      <div style={S.content}>
        {!loaded ? (
          [0,1,2].map(i => <SkeletonCard key={i} />)
        ) : clients.length === 0 ? (
          <EmptyClientes onAdd={() => navigate('/clientes/novo')} />
        ) : (
          <motion.div
            initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {clients.map(client => (
              <motion.div
                key={client.id}
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.26 } } }}
              >
                <ClientCard
                  client={client}
                  onEdit={() => navigate(`/clientes/${client.id}/editar`)}
                  onFinance={() => navigate(`/clientes/${client.id}/financeiro`)}
                  onDelete={() => setConfirmDel(client.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {confirmDel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={S.overlay} onClick={() => setConfirmDel(null)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              style={S.sheet}
            >
              <p style={S.modalTitle}>Remover cliente?</p>
              <p style={S.modalText}>Pagamentos vinculados também serão apagados.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button style={S.cancelBtn} onClick={() => setConfirmDel(null)}>Cancelar</button>
                <button style={S.confirmBtn} onClick={() => handleDelete(confirmDel)}>Remover</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ClientCard({ client, onEdit, onFinance, onDelete }) {
  const def = SERVICE_TYPES[client.service]
  const next = getNextVisit(client.id)
  const { balance, overdue } = getClientBalance(client)

  return (
    <div style={{ ...S.card, borderColor: overdue ? 'rgba(255,107,107,0.22)' : 'var(--border)' }}>
      <div style={S.cardLeft} onClick={onEdit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: def.color, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ ...S.serviceLabel, color: def.color }}>{def.label}</span>
          {overdue && (
            <span style={S.overdueBadge}>
              <AlertCircle size={10} />deve {formatCurrency(balance)}
            </span>
          )}
        </div>
        <p style={S.clientName}>{client.name}</p>
        {client.phone && (
          <a href={`tel:${client.phone}`} style={S.phone} onClick={e => e.stopPropagation()}>
            <Phone size={11} />{client.phone}
          </a>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
          {client.monthlyFee > 0 && <span style={S.metaTag}>{formatCurrency(client.monthlyFee)}/mês</span>}
          {next && <span style={S.metaTag}>Próx: {formatShortDate(next.date)}</span>}
        </div>
      </div>
      <div style={S.cardActions}>
        <button style={S.actionBtn} onClick={onDelete}><Trash2 size={14} color="#FF6B6B" /></button>
        <button style={{ ...S.actionBtn, borderTop: '1px solid var(--border)' }} onClick={onFinance}>
          <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>R$</span>
        </button>
        <button style={{ ...S.actionBtn, borderTop: '1px solid var(--border)' }} onClick={onEdit}>
          <ChevronRight size={16} color="var(--text-2)" />
        </button>
      </div>
    </div>
  )
}

function EmptyClientes({ onAdd }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={S.empty}>
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ marginBottom: 8 }}>
        <circle cx="22" cy="18" r="9" stroke="var(--text-3)" strokeWidth="2" strokeDasharray="4 2.5"/>
        <path d="M6 48c0-8.8 7.2-16 16-16s16 7.2 16 16" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2.5"/>
        <line x1="42" y1="32" x2="42" y2="42" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="37" y1="37" x2="47" y2="37" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <p style={S.emptyTitle}>Nenhum cliente ainda</p>
      <p style={S.emptyText}>Adicione seu primeiro cliente para começar a organizar a agenda.</p>
      <motion.button style={S.emptyBtn} onClick={onAdd} whileTap={{ scale: 0.95 }}>
        <Plus size={16} strokeWidth={2.5} />Adicionar cliente
      </motion.button>
    </motion.div>
  )
}

const S = {
  header:       { padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title:        { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 },
  subtitle:     { fontSize: 13, color: 'var(--text-2)', marginTop: 4, fontWeight: 300 },
  addBtn:       { width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--accent)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', marginTop: 4, flexShrink: 0 },
  content:      { padding: '20px' },
  card:         { background: 'var(--bg-2)', border: '1px solid', borderRadius: 'var(--r-md)', display: 'flex', overflow: 'hidden', transition: 'border-color 200ms' },
  cardLeft:     { flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5, cursor: 'pointer' },
  serviceLabel: { fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  overdueBadge: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#FF6B6B', background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 4, padding: '1px 6px' },
  clientName:   { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' },
  phone:        { fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 },
  metaTag:      { fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-4)', borderRadius: 4, padding: '2px 7px' },
  cardActions:  { display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' },
  actionBtn:    { flex: 1, minWidth: 44, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'none', border: 'none' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200 },
  sheet:        { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '24px 24px 0 0', padding: '24px 20px calc(var(--nav-height) + 16px)', zIndex: 201 },
  modalTitle:   { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 },
  modalText:    { fontSize: 14, color: 'var(--text-2)', marginTop: 8 },
  cancelBtn:    { flex: 1, padding: '13px', borderRadius: 'var(--r-md)', background: 'var(--bg-4)', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  confirmBtn:   { flex: 1, padding: '13px', borderRadius: 'var(--r-md)', background: '#FF6B6B', border: 'none', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  empty:        { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 32px', gap: 12, textAlign: 'center' },
  emptyTitle:   { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 },
  emptyText:    { fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 300 },
  emptyBtn:     { marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'var(--accent)', color: 'var(--bg)', borderRadius: 'var(--r-md)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none' },
}
