'use client'

import { useState, useTransition } from 'react'
import { UserRole, NotificationType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Send, Eye } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { sendBulkNotificationByRole, getUserCountByRole } from '@/lib/actions/notifications'
import { BulkNotificationFilters } from '@/types/notifications'
import { NotificationPreview } from './notification-preview'

export function BulkNotificationSender() {
  const [isPending, startTransition] = useTransition()
  const [showPreview, setShowPreview] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState<{
    title: string
    message: string
    link: string
    type: NotificationType
  }>({
    title: '',
    message: '',
    link: '',
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
  })

  const [filters, setFilters] = useState<BulkNotificationFilters>({
    roles: [],
    userStatus: 'ACTIVE',
  })

  const [userCounts, setUserCounts] = useState<Record<UserRole, number>>({
    [UserRole.ADMIN]: 0,
    [UserRole.TEACHER]: 0,
    [UserRole.STUDENT]: 0,
    [UserRole.EDITOR]: 0,
    [UserRole.GUEST]: 0,
  })

  const handleRoleChange = (role: UserRole, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      roles: checked
        ? [...prev.roles, role]
        : prev.roles.filter((r) => r !== role),
    }))
  }

  const handlePreview = () => {
    startTransition(async () => {
      const result = await getUserCountByRole(filters)
      if (result.success && result.data) {
        setUserCounts(result.data)
        setShowPreview(true)
      }
    })
  }

  const handleSend = () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      setErrorMessage('Por favor completa el título y mensaje')
      return
    }

    if (filters.roles.length === 0) {
      setErrorMessage('Por favor selecciona al menos un rol')
      return
    }

    setErrorMessage('')
    setSuccessMessage('')

    startTransition(async () => {
      const result = await sendBulkNotificationByRole({
        title: formData.title,
        message: formData.message,
        type: formData.type,
        link: formData.link || undefined,
        filters,
      })

      if (result.success) {
        setSuccessMessage(
          `Notificación enviada a ${result.totalSent} usuarios: ${
            Object.entries(result.byRole)
              .filter(([, count]) => count > 0)
              .map(([role, count]) => `${count} ${role}`)
              .join(', ')
          }`
        )
        setFormData({
          title: '',
          message: '',
          link: '',
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
        })
        setFilters({ roles: [], userStatus: 'ACTIVE' })
        setShowPreview(false)
      } else {
        setErrorMessage(result.error || 'Error al enviar notificaciones')
      }
    })
  }

  const totalAffected = Object.values(userCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enviar Notificación Masiva</CardTitle>
          <CardDescription>
            Crea y envía notificaciones a múltiples usuarios por rol
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Contenido de la notificación */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Ej: Mantenimiento del sistema"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                placeholder="Escribe el mensaje de la notificación..."
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
                disabled={isPending}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="link">Enlace (opcional)</Label>
              <Input
                id="link"
                placeholder="Ej: /dashboard/announcements"
                value={formData.link}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, link: e.target.value }))
                }
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo de Notificación</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: value as NotificationType,
                  }))
                }
                disabled={isPending}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NotificationType.SYSTEM_ANNOUNCEMENT}>
                    Anuncio del Sistema
                  </SelectItem>
                  <SelectItem value={NotificationType.ACCOUNT_UPDATE}>
                    Actualización de Cuenta
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selección de roles */}
          <div className="space-y-3">
            <Label>Enviar a:</Label>
            <div className="space-y-2">
              {[UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT].map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={role}
                    checked={filters.roles.includes(role)}
                    onCheckedChange={(checked) =>
                      handleRoleChange(role, checked as boolean)
                    }
                    disabled={isPending}
                  />
                  <Label htmlFor={role} className="font-normal cursor-pointer">
                    {role === UserRole.ADMIN && 'Administradores'}
                    {role === UserRole.TEACHER && 'Profesores'}
                    {role === UserRole.STUDENT && 'Estudiantes'}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros adicionales */}
          <div className="space-y-3">
            <Label htmlFor="status">Estado del Usuario</Label>
            <Select
              value={filters.userStatus || 'ACTIVE'}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  userStatus: value as 'ACTIVE' | 'INACTIVE' | 'ALL',
                }))
              }
              disabled={isPending}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Solo Activos</SelectItem>
                <SelectItem value="INACTIVE">Solo Inactivos</SelectItem>
                <SelectItem value="ALL">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={isPending || filters.roles.length === 0}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Vista Previa
            </Button>
            <Button
              onClick={handleSend}
              disabled={isPending || filters.roles.length === 0}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isPending ? 'Enviando...' : 'Enviar Notificación'}
            </Button>
          </div>

          {/* Información de usuarios afectados */}
          {filters.roles.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                Usuarios afectados: <span className="font-bold">{totalAffected}</span>
              </p>
              <div className="text-xs text-blue-800 mt-1 space-y-0.5">
                {filters.roles.map((role) => (
                  <p key={role}>
                    {role === UserRole.ADMIN && 'Administradores'}
                    {role === UserRole.TEACHER && 'Profesores'}
                    {role === UserRole.STUDENT && 'Estudiantes'}: {userCounts[role]}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {showPreview && (
        <NotificationPreview
          title={formData.title}
          message={formData.message}
          type={formData.type}
          link={formData.link}
          affectedUsers={filters.roles.map((role) => ({
            role,
            count: userCounts[role],
          }))}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
