'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Video,
  Headphones,
  FileIcon,
  Image as ImageIcon,
  BarChart3,
  BookOpen,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { LibraryResourceType, LibraryResourceStatus } from '@prisma/client'
import type { LibraryResource } from '@/lib/types/library'
import { RESOURCE_TYPE_LABELS } from '@/lib/types/library'

const getTypeIcon = (type: LibraryResourceType) => {
  const iconMap: Record<LibraryResourceType, React.ReactNode> = {
    ARTICLE: <FileText className="h-4 w-4" />,
    PDF: <FileIcon className="h-4 w-4" />,
    IMAGE: <ImageIcon className="h-4 w-4" />,
    AUDIO: <Headphones className="h-4 w-4" />,
    VIDEO: <Video className="h-4 w-4" />,
    INFOGRAPHIC: <BarChart3 className="h-4 w-4" />,
    TEMPLATE: <FileIcon className="h-4 w-4" />,
    EXERCISE_SHEET: <FileText className="h-4 w-4" />,
    GRAMMAR_GUIDE: <BookOpen className="h-4 w-4" />,
    VOCABULARY_LIST: <FileText className="h-4 w-4" />,
    OTHER: <FileIcon className="h-4 w-4" />,
  }
  return iconMap[type] || <FileIcon className="h-4 w-4" />
}

const getStatusBadge = (status: LibraryResourceStatus) => {
  switch (status) {
    case 'PUBLISHED':
      return <Badge className="bg-green-100 text-green-800">Publicado</Badge>
    case 'DRAFT':
      return <Badge variant="secondary">Borrador</Badge>
    case 'ARCHIVED':
      return <Badge variant="outline">Archivado</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const formatDate = (date: Date | string | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminLibraryPage() {
  const [resources, setResources] = useState<LibraryResource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [resourceToDelete, setResourceToDelete] = useState<LibraryResource | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchResources = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', pagination.page.toString())
      params.set('limit', pagination.limit.toString())
      
      if (searchQuery) {
        params.set('search', searchQuery)
      }
      if (typeFilter !== 'all') {
        params.set('type', typeFilter)
      }

      const response = await fetch(`/api/library?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setResources(data.resources)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching resources:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, searchQuery, typeFilter])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  const handleDelete = async () => {
    if (!resourceToDelete) return

    try {
      const response = await fetch(`/api/library/${resourceToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setResources(prev => prev.filter(r => r.id !== resourceToDelete.id))
        setDeleteDialogOpen(false)
        setResourceToDelete(null)
      }
    } catch (error) {
      console.error('Error deleting resource:', error)
    }
  }

  const filteredResources = resources.filter(resource => {
    if (statusFilter !== 'all' && resource.status !== statusFilter) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Biblioteca de Recursos</h1>
          <p className="text-muted-foreground">
            Gestiona los recursos educativos de la biblioteca
          </p>
        </div>
        <Link href="/admin/library/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Recurso
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar recursos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="PUBLISHED">Publicado</SelectItem>
            <SelectItem value="DRAFT">Borrador</SelectItem>
            <SelectItem value="ARCHIVED">Archivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recurso</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vistas</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filteredResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No hay recursos</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredResources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {resource.thumbnailUrl ? (
                        <Image
                          src={resource.thumbnailUrl}
                          alt={resource.title}
                          width={48}
                          height={32}
                          className="rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                          {getTypeIcon(resource.type)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium line-clamp-1">{resource.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {resource.author.name} {resource.author.lastName}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(resource.type)}
                      <span className="text-sm">{RESOURCE_TYPE_LABELS[resource.type]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {resource.category?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(resource.status)}
                  </TableCell>
                  <TableCell>
                    {resource.viewCount}
                  </TableCell>
                  <TableCell>
                    {formatDate(resource.publishedAt || resource.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/library/${resource.slug}`} target="_blank">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                            <ExternalLink className="h-3 w-3 ml-auto" />
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/library/${resource.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setResourceToDelete(resource)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} recursos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El recurso &quot;{resourceToDelete?.title}&quot; será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
