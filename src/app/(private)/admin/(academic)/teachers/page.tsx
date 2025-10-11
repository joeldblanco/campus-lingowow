import TeachersAdminView from '@/components/admin/teachers/teachers-admin-view'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Profesores | Admin | Lingowow',
  description: 'Administra los profesores de la plataforma',
}

export default function TeachersPage() {
  return (
    <main className="container mx-auto py-10">
      <TeachersAdminView />
    </main>
  )
}
