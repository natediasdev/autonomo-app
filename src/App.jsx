import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Agenda from './pages/Agenda.jsx'
import Clientes from './pages/Clientes.jsx'
import NovoCliente from './pages/NovoCliente.jsx'
import EditarCliente from './pages/EditarCliente.jsx'
import Financeiro from './pages/Financeiro.jsx'
import Relatorio from './pages/Relatorio.jsx'
import { useAndroidBack } from './hooks/useAndroidBack.js'

function AppRoutes() {
  useAndroidBack()
  return (
    <Layout>
      <Routes>
        <Route path="/"                        element={<Agenda />} />
        <Route path="/clientes"                element={<Clientes />} />
        <Route path="/clientes/novo"           element={<NovoCliente />} />
        <Route path="/clientes/:id/editar"     element={<EditarCliente />} />
        <Route path="/clientes/:id/financeiro" element={<Financeiro />} />
        <Route path="/relatorio"               element={<Relatorio />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return <AppRoutes />
}
