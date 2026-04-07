'use client'

import { useCallback, useEffect, useState } from 'react'
import { AuditAction, AuditCategory } from '@prisma/client'
import {
  getAuditLogs,
  exportAuditLogs,
  type AuditLogFilters,
  type AuditLogItem,
} from '@/lib/actions/admin-audit-logs'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatUserName } from '@/lib/utils/name-formatter'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Loader2,
  Search,
  Shield,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN: 'Inicio de sesión',
  LOGIN_FAILED: 'Login fallido',
  LOGOUT: 'Cierre de sesión',
  REGISTER: 'Registro',
  PASSWORD_RESET: 'Reset de contraseña',
  PASSWORD_CHANGED: 'Cambio de contraseña',
  EMAIL_VERIFIED: 'Email verificado',
  PAGE_ENTER: 'Ingreso a página',
  PAGE_LEAVE: 'Salida de página',
  SESSION_EXPIRED: 'Sesión expirada',
  CLASSROOM_JOIN: 'Ingreso al aula',
  CLASSROOM_LEAVE: 'Salida del aula',
  CLASSROOM_START: 'Inicio de clase',
  CLASSROOM_END: 'Fin de clase',
  USER_CREATED: 'Usuario creado',
  USER_UPDATED: 'Usuario actualizado',
  USER_DELETED: 'Usuario eliminado',
  USER_IMPERSONATED: 'Impersonación',
  ROLE_CHANGED: 'Cambio de rol',
  ENROLLMENT_CREATED: 'Inscripción creada',
  ENROLLMENT_UPDATED: 'Inscripción actualizada',
  COURSE_CREATED: 'Curso creado',
  COURSE_UPDATED: 'Curso actualizado',
  EXAM_STARTED: 'Examen iniciado',
  EXAM_SUBMITTED: 'Examen enviado',
  GRADE_ASSIGNED: 'Calificación asignada',
  PAYMENT_COMPLETED: 'Pago completado',
  SUBSCRIPTION_CREATED: 'Suscripción creada',
  SUBSCRIPTION_CANCELLED: 'Suscripción cancelada',
}

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  AUTH: 'Autenticación',
  SESSION: 'Sesión',
  CLASSROOM: 'Aula Virtual',
  ADMIN: 'Administración',
  ACADEMIC: 'Académico',
  COMMERCE: 'Comercial',
}

const CATEGORY_COLORS: Record<AuditCategory, string> = {
  AUTH: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SESSION: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  CLASSROOM: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  ACADEMIC: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  COMMERCE: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
}

export function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [action, setAction] = useState<AuditAction | ''>('')
  const [category, setCategory] = useState<AuditCategory | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const filters: AuditLogFilters = {
    search: search || undefined,
    action: action || undefined,
    category: category || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize: 50,
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAuditLogs(filters)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        setLogs(result.logs)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      }
    } catch {
      toast.error('Error al cargar los registros')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, action, category, dateFrom, dateTo, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportAuditLogs(filters)
      if ('error' in data) {
        toast.error(data.error as string)
        return
      }

      // Generar CSV
      const csvHeaders = [
        'Fecha',
        'Usuario',
        'Email',
        'Roles',
        'Acción',
        'Categoría',
        'Descripción',
        'IP',
        'Metadata',
      ]
      const csvRows = data.map((row) =>
        [
          row.fecha,
          `"${row.usuario}"`,
          row.email,
          `"${row.roles}"`,
          row.accion,
          row.categoria,
          `"${row.descripcion}"`,
          row.ip,
          `"${row.metadata.replace(/"/g, '""')}"`,
        ].join(',')
      )
      const csv = [csvHeaders.join(','), ...csvRows].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Exportación completada')
    } catch {
      toast.error('Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setSearchInput('')
    setAction('')
    setCategory('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasActiveFilters = search || action || category || dateFrom || dateTo

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Registro de Actividad
          </h1>
          <p className="text-muted-foreground">{total.toLocaleString()} registros en total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                className="ml-2 rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                !
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuario, email, descripción o IP..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>Buscar</Button>
      </div>

      {/* Filtros expandibles */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Categoría</label>
                <Select
                  value={category || 'all'}
                  onValueChange={(v) => {
                    setCategory(v === 'all' ? '' : (v as AuditCategory))
                    setPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Acción</label>
                <Select
                  value={action || 'all'}
                  onValueChange={(v) => {
                    setAction(v === 'all' ? '' : (v as AuditAction))
                    setPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las acciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Desde</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setPage(1)
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Hasta</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabla de logs */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Fecha</TableHead>
                  <TableHead className="w-[200px]">Usuario</TableHead>
                  <TableHead className="w-[120px]">Categoría</TableHead>
                  <TableHead className="w-[160px]">Acción</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[120px]">IP</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Cargando registros...</p>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <p className="text-muted-foreground">No se encontraron registros</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={log.user.image || ''} />
                              <AvatarFallback className="text-xs">
                                {log.user.name?.[0]}
                                {log.user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {formatUserName(log.user) || 'Sin nombre'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {log.user.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sistema</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${CATEGORY_COLORS[log.category]}`}
                        >
                          {CATEGORY_LABELS[log.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{ACTION_LABELS[log.action] || log.action}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm truncate max-w-[300px]" title={log.description}>
                          {log.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.ipAddress || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * 50 + 1} - {Math.min(page * 50, total)} de{' '}
            {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de detalle */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Registro</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Categoría</p>
                  <Badge variant="secondary" className={CATEGORY_COLORS[selectedLog.category]}>
                    {CATEGORY_LABELS[selectedLog.category]}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Acción</p>
                  <p className="font-medium">{ACTION_LABELS[selectedLog.action]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">IP</p>
                  <p className="font-mono">{selectedLog.ipAddress || '-'}</p>
                </div>
              </div>

              {selectedLog.user && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Usuario</p>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedLog.user.image || ''} />
                      <AvatarFallback>
                        {selectedLog.user.name?.[0]}
                        {selectedLog.user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {formatUserName(selectedLog.user) || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedLog.user.email}</p>
                    </div>
                    <div className="ml-auto flex gap-1">
                      {selectedLog.user.roles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Descripción</p>
                <p className="text-sm">{selectedLog.description}</p>
              </div>

              {selectedLog.metadata != null && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Metadata</p>
                  <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all max-h-48">
                    {String(JSON.stringify(selectedLog.metadata, null, 2))}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">User Agent</p>
                  <p className="text-xs text-muted-foreground break-all">{selectedLog.userAgent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
