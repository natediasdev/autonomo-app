import { useNavigate, useParams } from 'react-router-dom'
import ClientForm from '../components/ClientForm.jsx'
import { getClients, updateClient } from '../utils/data.js'

export default function EditarCliente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const client = getClients().find(c => c.id === id)

  if (!client) {
    navigate('/clientes')
    return null
  }

  const handleSubmit = (form) => {
    updateClient(id, form)
    navigate('/clientes')
  }

  return (
    <ClientForm
      title="Editar Cliente"
      submitLabel="Salvar alterações"
      initialData={client}
      onSubmit={handleSubmit}
    />
  )
}
