import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Panel de Administración | Lingowow',
  description: 'Panel de administración de Lingowow',
}

export default function AdminPage() {
  return (
    <div className="p-6" data-testid="admin-dashboard">
      <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Usuarios</h2>
          <p className="text-gray-600">Gestionar usuarios del sistema</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Cursos</h2>
          <p className="text-gray-600">Administrar cursos y contenido</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Finanzas</h2>
          <p className="text-gray-600">Ver reportes financieros</p>
        </div>
      </div>
    </div>
  )
}
