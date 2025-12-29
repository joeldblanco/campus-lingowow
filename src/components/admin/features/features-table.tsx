'use client'

import { useState, useMemo, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Edit, Trash2, Zap, Search, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { EditFeatureDialog } from './edit-feature-dialog'
import { deleteFeature } from '@/lib/actions/commercial'
import { toast } from 'sonner'

interface Feature {
  id: string
  name: string
  description: string | null
  icon: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count: {
    planFeatures: number
  }
}

interface FeaturesTableProps {
  features: Feature[]
}

const ITEMS_PER_PAGE = 5

export function FeaturesTable({ features }: FeaturesTableProps) {
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])

  // Filter features
  const filteredFeatures = useMemo(() => {
    let filtered = features
    if (searchTerm) {
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((f) => 
        statusFilter === 'active' ? f.isActive : !f.isActive
      )
    }
    return filtered
  }, [features, searchTerm, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredFeatures.length / ITEMS_PER_PAGE)
  const paginatedFeatures = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredFeatures.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredFeatures, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta característica?')) {
      const result = await deleteFeature(id)
      if (result.success) {
        toast.success('Característica eliminada correctamente')
      } else {
        toast.error(result.error || 'Error al eliminar la característica')
      }
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">Activa</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 font-medium">Inactiva</Badge>
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFeatures(paginatedFeatures.map(f => f.id))
    } else {
      setSelectedFeatures([])
    }
  }

  const handleSelectFeature = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedFeatures(prev => [...prev, id])
    } else {
      setSelectedFeatures(prev => prev.filter(i => i !== id))
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="inactive">Inactiva</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={clearFilters} className="shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedFeatures.length === paginatedFeatures.length && paginatedFeatures.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Característica</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Descripción</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estado</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Planes</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedFeatures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No hay características registradas
                </TableCell>
              </TableRow>
            ) : (
              paginatedFeatures.map((feature) => (
                <TableRow key={feature.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedFeatures.includes(feature.id)}
                      onCheckedChange={(checked) => handleSelectFeature(feature.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {feature.icon ? (
                        <div className="text-lg">{feature.icon}</div>
                      ) : (
                        <Zap className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">{feature.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {feature.description || '-'}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(feature.isActive)}</TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{feature._count.planFeatures}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingFeature(feature)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDelete(feature.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredFeatures.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a{' '}
            <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredFeatures.length)}</span> de{' '}
            <span className="font-medium">{filteredFeatures.length}</span> resultados
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageNumbers().map((page, index) => (
              typeof page === 'number' ? (
                <Button key={index} variant={currentPage === page ? 'default' : 'outline'} size="icon" className={`h-8 w-8 ${currentPage === page ? 'bg-blue-500 hover:bg-blue-600' : ''}`} onClick={() => setCurrentPage(page)}>
                  {page}
                </Button>
              ) : (
                <span key={index} className="px-2 text-muted-foreground">...</span>
              )
            ))}
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {editingFeature && (
        <EditFeatureDialog
          feature={editingFeature}
          open={!!editingFeature}
          onOpenChange={(open: boolean) => !open && setEditingFeature(null)}
        />
      )}
    </>
  )
}
