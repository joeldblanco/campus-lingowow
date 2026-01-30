'use client'

import { NotificationType, UserRole } from '@prisma/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const notificationTypeConfig: Record<
  NotificationType,
  { icon: string; color: string; label: string }
> = {
  NEW_ENROLLMENT: { icon: '👤', color: 'bg-blue-500', label: 'Nueva Inscripción' },
  ENROLLMENT_CONFIRMED: { icon: '✅', color: 'bg-green-500', label: 'Inscripción Confirmada' },
  TASK_ASSIGNED: { icon: '📝', color: 'bg-purple-500', label: 'Tarea Asignada' },
  TASK_SUBMITTED: { icon: '📤', color: 'bg-indigo-500', label: 'Tarea Enviada' },
  TASK_GRADED: { icon: '⭐', color: 'bg-yellow-500', label: 'Tarea Calificada' },
  PAYMENT_RECEIVED: { icon: '💰', color: 'bg-emerald-500', label: 'Pago Recibido' },
  PAYMENT_CONFIRMED: { icon: '💳', color: 'bg-green-500', label: 'Pago Confirmado' },
  TEACHER_PAYMENT_CONFIRMED: { icon: '✔️', color: 'bg-teal-500', label: 'Pago de Profesor' },
  CLASS_REMINDER: { icon: '⏰', color: 'bg-orange-500', label: 'Recordatorio de Clase' },
  CLASS_CANCELLED: { icon: '❌', color: 'bg-red-500', label: 'Clase Cancelada' },
  CLASS_RESCHEDULED: { icon: '📅', color: 'bg-amber-500', label: 'Clase Reagendada' },
  RECORDING_READY: { icon: '🎥', color: 'bg-blue-600', label: 'Grabación Lista' },
  SYSTEM_ANNOUNCEMENT: { icon: '📢', color: 'bg-slate-500', label: 'Anuncio del Sistema' },
  ACCOUNT_UPDATE: { icon: '👤', color: 'bg-gray-500', label: 'Actualización de Cuenta' },
}

interface NotificationPreviewProps {
  title: string
  message: string
  type: NotificationType
  link?: string
  affectedUsers: Array<{ role: UserRole; count: number }>
  onClose: () => void
}

export function NotificationPreview({
  title,
  message,
  type,
  link,
  affectedUsers,
  onClose,
}: NotificationPreviewProps) {
  const config = notificationTypeConfig[type]
  const totalAffected = affectedUsers.reduce((sum, u) => sum + u.count, 0)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vista Previa de Notificación</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notificación Preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Cómo se verá:</h3>
            <Card className="border-2">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${config.color}`}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{title || '(Sin título)'}</p>
                        <Badge variant="secondary" className="mt-1">
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-2">
                      {message || '(Sin mensaje)'}
                    </p>
                    {link && (
                      <p className="text-xs text-blue-600 mt-2">
                        Enlace: <code className="bg-gray-100 px-1 rounded">{link}</code>
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">Hace unos segundos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas de usuarios afectados */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios Afectados
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {affectedUsers.map(({ role, count }) => (
                <Card key={role}>
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-600">
                      {role === UserRole.ADMIN && 'Administradores'}
                      {role === UserRole.TEACHER && 'Profesores'}
                      {role === UserRole.STUDENT && 'Estudiantes'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">
                Total: <span className="text-lg">{totalAffected}</span> usuarios
              </p>
            </div>
          </div>

          {/* Información adicional */}
          <div className="space-y-2 text-xs text-gray-600">
            <p>
              <strong>Tipo:</strong> {config.label}
            </p>
            {link && (
              <p>
                <strong>Enlace:</strong> {link}
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
