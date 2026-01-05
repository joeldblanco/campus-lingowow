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
import { MoreVertical, Edit, Trash2, Zap, Search, ChevronLeft, ChevronRight, SlidersHorizontal, Package } from 'lucide-react'
import { EditPlanDialog } from './edit-plan-dialog'
import { deletePlan } from '@/lib/actions/commercial'
import { toast } from 'sonner'

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  duration: number
  isActive: boolean
  isPopular: boolean
  sortOrder: number
  paypalSku: string | null
  includesClasses: boolean
  classesPerPeriod: number | null
  classesPerWeek: number | null
  allowProration: boolean
  autoRenewal: boolean
  billingCycle: string | null
  createdAt: Date
  updatedAt: Date
  productId: string | null
  product: {
    id: string
    name: string
  } | null
  features: Array<{
    planId: string
    featureId: string
    included: boolean
    value: string | null
    feature: {
      id: string
      name: string
      description: string | null
      icon: string | null
    }
  }>
  _count: {
    invoiceItems: number
  }
}

interface PlansTableProps {
  plans: Plan[]
}

const ITEMS_PER_PAGE = 5

export function PlansTable({ plans }: PlansTableProps) {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPlans, setSelectedPlans] = useState<string[]>([])

  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    const products = plans
      .filter(p => p.product)
      .map(p => ({ id: p.product!.id, name: p.product!.name }))
    return Array.from(new Map(products.map(p => [p.id, p])).values())
  }, [plans])

  // Filter plans
  const filteredPlans = useMemo(() => {
    let filtered = plans
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => 
        statusFilter === 'active' ? p.isActive : !p.isActive
      )
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter((p) => 
        typeFilter === 'academic' ? p.includesClasses : !p.includesClasses
      )
    }
    if (productFilter !== 'all') {
      filtered = filtered.filter((p) => 
        productFilter === 'none' ? !p.product : p.product?.id === productFilter
      )
    }
    return filtered
  }, [plans, searchTerm, statusFilter, typeFilter, productFilter])

  // Pagination
  const totalPages = Math.ceil(filteredPlans.length / ITEMS_PER_PAGE)
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredPlans.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredPlans, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, typeFilter, productFilter])

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este plan?')) {
      const result = await deletePlan(id)
      if (result.success) {
        toast.success('Plan eliminado correctamente')
      } else {
        toast.error(result.error || 'Error al eliminar el plan')
      }
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  const formatDuration = (days: number) => {
    if (days < 30) return `${days} días`
    if (days < 365) return `${Math.round(days / 30)} meses`
    return `${Math.round(days / 365)} años`
  }

  const getStatusBadge = (isActive: boolean, isPopular: boolean) => {
    if (isPopular) {
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 font-medium">Popular</Badge>
    }
    return isActive ? (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">Activo</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 font-medium">Inactivo</Badge>
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPlans(paginatedPlans.map(p => p.id))
    } else {
      setSelectedPlans([])
    }
  }

  const handleSelectPlan = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedPlans(prev => [...prev, id])
    } else {
      setSelectedPlans(prev => prev.filter(i => i !== id))
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setTypeFilter('all')
    setProductFilter('all')
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
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="academic">Período académico</SelectItem>
            <SelectItem value="duration">Duración fija</SelectItem>
          </SelectContent>
        </Select>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Producto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los productos</SelectItem>
            <SelectItem value="none">Sin producto</SelectItem>
            {uniqueProducts.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
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
                  checked={selectedPlans.length === paginatedPlans.length && paginatedPlans.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Plan</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Producto</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-right">Precio</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Tipo</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estado</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Características</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPlans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No hay planes registrados
                </TableCell>
              </TableRow>
            ) : (
              paginatedPlans.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedPlans.includes(plan.id)}
                      onCheckedChange={(checked) => handleSelectPlan(plan.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <div className="font-medium text-sm truncate">{plan.name}</div>
                      {plan.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{plan.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {plan.product ? (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        <Package className="h-3 w-3 mr-1" />
                        {plan.product.name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin producto</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium text-sm">{formatPrice(plan.price)}</div>
                    {plan.comparePrice && (
                      <div className="text-xs text-muted-foreground line-through">{formatPrice(plan.comparePrice)}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {plan.includesClasses ? (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Período académico
                      </Badge>
                    ) : (
                      <span className="text-sm">{formatDuration(plan.duration)}</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(plan.isActive, plan.isPopular)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {plan.features.slice(0, 2).map((planFeature) => (
                        <Badge key={planFeature.featureId} variant="outline" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          {planFeature.feature.name}
                        </Badge>
                      ))}
                      {plan.features.length > 2 && (
                        <Badge variant="outline" className="text-xs">+{plan.features.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPlan(plan)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDelete(plan.id)} className="text-destructive">
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
      {filteredPlans.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a{' '}
            <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredPlans.length)}</span> de{' '}
            <span className="font-medium">{filteredPlans.length}</span> resultados
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

      {editingPlan && (
        <EditPlanDialog
          plan={editingPlan}
          open={!!editingPlan}
          onOpenChange={(open: boolean) => !open && setEditingPlan(null)}
        />
      )}
    </>
  )
}
