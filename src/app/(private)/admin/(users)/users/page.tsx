import UserAdminView from '@/components/user/user-admin-view'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Usuarios | Admin | Lingowow',
  description: 'Administra los usuarios de la plataforma',
}

export default function Home() {
  return (
    <main className="container mx-auto py-10">
      <UserAdminView />
    </main>
  )
}
