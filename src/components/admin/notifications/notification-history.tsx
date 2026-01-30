'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Users } from 'lucide-react'
import { NotificationType, UserRole } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface HistoryItem {
  id: string
  title: string
  message: string
  type: NotificationType
  totalSent: number
  byRole: Record<string, number>
  sentAt: Date
  sentBy: {
    id: string
    name: string
    email: string
  }
}

interface NotificationHistoryProps {
  items?: HistoryItem[]
  isLoading?: boolean
}

const notificationTypeLabels: Record<NotificationType, string> = {
  NEW_ENROLLMENT: 'Nueva Inscripción',
  ENROLLMENT_CONFIRMED: 'Inscripción Confirmada',
  TASK_ASSIGNED: 'Tarea Asignada',
  TASK_SUBMITTED: 'Tarea Enviada',
  TASK_GRADED: 'Tarea Calificada',
  PAYMENT_RECEIVED: 'Pago Recibido',
  PAYMENT_CONFIRMED: 'Pago Confirmado',
  TEACHER_PAYMENT_CONFIRMED: 'Pago de Profesor',
  CLASS_REMINDER: 'Recordatorio de Clase',
  CLASS_CANCELLED: 'Clase Cancelada',
  CLASS_RESCHEDULED: 'Clase Reagendada',
  RECORDING_READY: 'Grabación Lista',
  SYSTEM_ANNOUNCEMENT: 'Anuncio del Sistema',
  ACCOUNT_UPDATE: 'Actualización de Cuenta',
}

export function NotificationHistory({ items = [], isLoading = false }: NotificationHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredItems, setFilteredItems] = useState<HistoryItem[]>(items)

  useEffect(() => {
    const filtered = items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sentBy.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredItems(filtered)
  }, [searchTerm, items])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Notificaciones Masivas</CardTitle>
        <CardDescription>
          Registro de todas las notificaciones masivas enviadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por título, mensaje o remitente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabla */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Cargando historial...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {items.length === 0
                      ? 'No hay notificaciones masivas aún'
                      : 'No se encontraron resultados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-600 line-clamp-1">{item.message}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {notificationTypeLabels[item.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {item.totalSent}
                        </p>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {Object.entries(item.byRole).map(([role, count]) => (
                            count > 0 && (
                              <p key={role}>
                                {role === UserRole.ADMIN && 'Admin'}
                                {role === UserRole.TEACHER && 'Prof'}
                                {role === UserRole.STUDENT && 'Est'}: {count}
                              </p>
                            )
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">{item.sentBy.name}</p>
                        <p className="text-xs text-gray-600">{item.sentBy.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-900">
                          {formatDistanceToNow(new Date(item.sentAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(item.sentAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Información adicional */}
        {filteredItems.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            Mostrando <strong>{filteredItems.length}</strong> de{' '}
            <strong>{items.length}</strong> notificaciones masivas
          </div>
        )}
      </CardContent>
    </Card>
  )
}
