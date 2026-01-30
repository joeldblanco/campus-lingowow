'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BulkNotificationFilters } from '@/types/notifications'
import { UserRole } from '@prisma/client'

interface NotificationFiltersProps {
  filters: BulkNotificationFilters
  onFiltersChange: (filters: BulkNotificationFilters) => void
  disabled?: boolean
}

export function NotificationFilters({
  filters,
  onFiltersChange,
  disabled = false,
}: NotificationFiltersProps) {
  const handleRoleChange = (role: UserRole, checked: boolean) => {
    onFiltersChange({
      ...filters,
      roles: checked
        ? [...filters.roles, role]
        : filters.roles.filter((r) => r !== role),
    })
  }

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      userStatus: status as 'ACTIVE' | 'INACTIVE' | 'ALL',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros Avanzados</CardTitle>
        <CardDescription>
          Personaliza los criterios para seleccionar usuarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Roles */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Roles</Label>
          <div className="space-y-2">
            {[UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT].map((role) => (
              <div key={role} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${role}`}
                  checked={filters.roles.includes(role)}
                  onCheckedChange={(checked) =>
                    handleRoleChange(role, checked as boolean)
                  }
                  disabled={disabled}
                />
                <Label htmlFor={`role-${role}`} className="font-normal cursor-pointer">
                  {role === UserRole.ADMIN && 'Administradores'}
                  {role === UserRole.TEACHER && 'Profesores'}
                  {role === UserRole.STUDENT && 'Estudiantes'}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Estado del usuario */}
        <div className="space-y-3">
          <Label htmlFor="user-status">Estado del Usuario</Label>
          <Select
            value={filters.userStatus || 'ACTIVE'}
            onValueChange={handleStatusChange}
            disabled={disabled}
          >
            <SelectTrigger id="user-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Solo Activos</SelectItem>
              <SelectItem value="INACTIVE">Solo Inactivos</SelectItem>
              <SelectItem value="ALL">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Información */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <p className="font-medium">Tip:</p>
          <p className="text-xs mt-1">
            Selecciona al menos un rol para enviar notificaciones. Los filtros adicionales
            te ayudarán a refinar la audiencia.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
