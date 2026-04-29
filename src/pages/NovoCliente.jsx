import { useNavigate } from 'react-router-dom'
import ClientForm from '../components/ClientForm.jsx'
import { createClient } from '../utils/data.js'

export default function NovoCliente() {
  const navigate = useNavigate()

  const handleSubmit = (form) => {
    createClient(form)
    navigate('/clientes')
  }

  return (
    <ClientForm
      title="Novo Cliente"
      submitLabel="Adicionar cliente"
      onSubmit={handleSubmit}
    />
  )
}
