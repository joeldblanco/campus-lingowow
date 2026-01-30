import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/session'
import { UserRole } from '@prisma/client'
import { BulkNotificationSender, NotificationHistory } from '@/components/admin/notifications'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, History } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Notificaciones Masivas | Admin',
  description: 'Sistema de notificaciones masivas por rol',
}

export default async function NotificationsPage() {
  const user = await getCurrentUser()

  if (!user || !user.roles.includes(UserRole.ADMIN)) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones Masivas</h1>
        <p className="text-gray-600 mt-2">
          Envía comunicados a múltiples usuarios organizados por rol
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send" className="gap-2">
            <Bell className="h-4 w-4" />
            Enviar Notificación
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab: Enviar */}
        <TabsContent value="send" className="space-y-4">
          <BulkNotificationSender />
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="history" className="space-y-4">
          <NotificationHistory items={[]} isLoading={false} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
