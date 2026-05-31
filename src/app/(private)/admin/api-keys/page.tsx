import { Metadata } from 'next'
import { ApiKeysAdminView } from '@/components/admin/api-keys-view'

export const metadata: Metadata = {
  title: 'API Keys | Admin | Lingowow',
  description: 'Gestiona API keys para integraciones, incluido el servidor MCP',
}

export default function ApiKeysAdminPage() {
  return (
    <main className="space-y-6">
      <ApiKeysAdminView />
    </main>
  )
}
