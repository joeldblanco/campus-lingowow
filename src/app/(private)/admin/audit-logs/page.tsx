import { AuditLogsView } from '@/components/admin/audit-logs-view'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Registro de Actividad | Admin | Lingowow',
  description: 'Visualiza el registro de actividad del sistema',
}

export default function AuditLogsPage() {
  return (
    <main className="space-y-6">
      <AuditLogsView />
    </main>
  )
}
