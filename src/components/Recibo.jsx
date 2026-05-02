import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── PDF Styles ───────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    padding: 48,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottom: '2px solid #E8FF47',
  },
  logoBox: {
    width: 40,
    height: 40,
    backgroundColor: '#E8FF47',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#080808',
  },
  appName: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  receiptTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#080808',
    letterSpacing: 1,
  },
  receiptNumber: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  // Status badge
  statusBadge: {
    marginTop: 6,
    backgroundColor: '#E8FF47',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#080808',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Parties section
  partiesRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 28,
  },
  partyBox: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 14,
  },
  partyLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  partyName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#080808',
  },
  partyDetail: {
    fontSize: 10,
    color: '#666',
    marginTop: 3,
  },
  // Detail rows
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottom: '1px solid #F0F0F0',
  },
  rowLabel: {
    fontSize: 11,
    color: '#444',
  },
  rowValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#080808',
  },
  // Total
  totalBox: {
    backgroundColor: '#080808',
    borderRadius: 10,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  totalLabel: {
    fontSize: 12,
    color: '#E8FF47',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  totalValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#E8FF47',
  },
  // Note
  noteBox: {
    borderLeft: '3px solid #E8FF47',
    paddingLeft: 12,
    marginBottom: 28,
  },
  noteLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 11,
    color: '#444',
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    borderTop: '1px solid #EEE',
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#CCC',
  },
  footerBrand: {
    fontSize: 9,
    color: '#CCC',
    fontFamily: 'Helvetica-Bold',
  },
})

// ─── Currency formatter ───────────────────────────────────────────────────────

function fmtBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

// ─── PDF Document ─────────────────────────────────────────────────────────────

function ReciboPDF({ payment, client, receiptNumber }) {
  const payDate  = format(parseISO(payment.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const emitDate = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <Document title={`Recibo ${receiptNumber} — ${client.name}`} author="AutônomoApp">
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.header}>
          <View>
            <View style={S.logoBox}>
              <Text style={S.logoText}>Â</Text>
            </View>
            <Text style={S.appName}>AutônomoApp</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.receiptTitle}>RECIBO</Text>
            <Text style={S.receiptNumber}>Nº {receiptNumber}</Text>
            <View style={S.statusBadge}>
              <Text style={S.statusText}>Pago</Text>
            </View>
          </View>
        </View>

        {/* Parties */}
        <View style={S.partiesRow}>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>Recebido de</Text>
            <Text style={S.partyName}>{client.name}</Text>
            {client.phone ? <Text style={S.partyDetail}>{client.phone}</Text> : null}
          </View>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>Data do pagamento</Text>
            <Text style={S.partyName}>{payDate}</Text>
            <Text style={S.partyDetail}>Emitido em {emitDate}</Text>
          </View>
        </View>

        {/* Service detail */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Detalhes do serviço</Text>
          <View style={S.row}>
            <Text style={S.rowLabel}>Serviço</Text>
            <Text style={S.rowValue}>
              {client.service === 'mensal' ? 'Mensal'
                : client.service === 'quinzenal' ? 'Quinzenal'
                : 'Semanal'}
            </Text>
          </View>
          <View style={S.row}>
            <Text style={S.rowLabel}>Mensalidade contratada</Text>
            <Text style={S.rowValue}>{fmtBRL(client.monthlyFee)}</Text>
          </View>
          <View style={S.row}>
            <Text style={S.rowLabel}>Referência</Text>
            <Text style={S.rowValue}>{format(parseISO(payment.date), "MMMM 'de' yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}</Text>
          </View>
        </View>

        {/* Total */}
        <View style={S.totalBox}>
          <Text style={S.totalLabel}>Total recebido</Text>
          <Text style={S.totalValue}>{fmtBRL(payment.amount)}</Text>
        </View>

        {/* Note */}
        {payment.note ? (
          <View style={S.noteBox}>
            <Text style={S.noteLabel}>Observação</Text>
            <Text style={S.noteText}>{payment.note}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={S.footer}>
          <Text style={S.footerText}>Este recibo é um comprovante de pagamento gerado digitalmente.</Text>
          <Text style={S.footerBrand}>AutônomoApp</Text>
        </View>

      </Page>
    </Document>
  )
}

// ─── Download button component ────────────────────────────────────────────────

export default function ReciboDownload({ payment, client, receiptNumber }) {
  const fileName = `recibo-${receiptNumber}-${client.name.toLowerCase().replace(/\s+/g, '-')}.pdf`

  return (
    <PDFDownloadLink
      document={<ReciboPDF payment={payment} client={client} receiptNumber={receiptNumber} />}
      fileName={fileName}
      style={{ textDecoration: 'none' }}
    >
      {({ loading, error }) => (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 8,
          background: loading ? 'var(--bg-4)' : 'var(--accent-dim)',
          border: `1px solid ${loading ? 'var(--border)' : 'var(--accent-border)'}`,
          cursor: loading ? 'default' : 'pointer',
          transition: 'all 200ms',
        }}>
          {/* Receipt icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={loading ? 'var(--text-3)' : 'var(--accent)'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 2 2 2-2 2 2 2-2 3 2V4a2 2 0 0 0-2-2z"/>
            <line x1="8" y1="10" x2="16" y2="10"/>
            <line x1="8" y1="14" x2="12" y2="14"/>
          </svg>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 11,
            fontWeight: 700,
            color: loading ? 'var(--text-3)' : 'var(--accent)',
          }}>
            {loading ? 'Gerando...' : error ? 'Erro' : 'Recibo PDF'}
          </span>
        </div>
      )}
    </PDFDownloadLink>
  )
}
