'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { MoreVertical, Edit, Trash2, Zap, Search, SlidersHorizontal, Package, Globe } from 'lucide-react'
import { EditPlanDialog } from './edit-plan-dialog'
import { deletePlan } from '@/lib/actions/commercial'
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PlanPricing {
  id: string
  language: string
  price: number
  comparePrice: number | null
  currency: string
  isActive: boolean
  paypalSku: string | null
  courseId: string | null
}

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
  pricing?: PlanPricing[]
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

export function PlansTable({ plans }: PlansTableProps) {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')

  const uniqueProducts = useMemo(() => {
    const products = plans
      .filter(p => p.product)
      .map(p => ({ id: p.product!.id, name: p.product!.name }))
    return Array.from(new Map(products.map(p => [p.id, p])).values())
  }, [plans])

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

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setTypeFilter('all')
    setProductFilter('all')
  }

  const columns: ColumnDef<Plan>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="font-medium text-sm truncate">{row.original.name}</div>
          {row.original.description && (
            <div className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'product',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Producto" />,
      cell: ({ row }) =>
        row.original.product ? (
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
            <Package className="h-3 w-3 mr-1" />
            {row.original.product.name}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Sin producto</span>
        ),
    },
    {
      accessorKey: 'price',
      header: () => <div className="text-right">Precio</div>,
      cell: ({ row }) => {
        const plan = row.original
        return (
          <div className="text-right">
            <div className="font-medium text-sm">{formatPrice(plan.price)}</div>
            {plan.comparePrice && (
              <div className="text-xs text-muted-foreground line-through">{formatPrice(plan.comparePrice)}</div>
            )}
            {plan.pricing && plan.pricing.filter(p => p.isActive).length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <div className="flex gap-0.5">
                        {plan.pricing.filter(p => p.isActive).map((pricing) => {
                          const lang = SUPPORTED_LANGUAGES.find(l => l.code === pricing.language)
                          return (
                            <span key={pricing.language} className="text-xs" title={`${lang?.name}: ${formatPrice(pricing.price)}`}>
                              {lang?.flag}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="p-2">
                    <div className="text-xs space-y-1">
                      <div className="font-medium mb-1">Precios por idioma:</div>
                      {plan.pricing.filter(p => p.isActive).map((pricing) => {
                        const lang = SUPPORTED_LANGUAGES.find(l => l.code === pricing.language)
                        return (
                          <div key={pricing.language} className="flex items-center justify-between gap-4">
                            <span>{lang?.flag} {lang?.name}</span>
                            <span className="font-medium">{formatPrice(pricing.price)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'includesClasses',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) =>
        row.original.includesClasses ? (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            Período académico
          </Badge>
        ) : (
          <span className="text-sm">{formatDuration(row.original.duration)}</span>
        ),
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const { isActive, isPopular } = row.original
        if (isPopular) {
          return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 font-medium">Popular</Badge>
        }
        return isActive ? (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">Activo</Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 font-medium">Inactivo</Badge>
        )
      },
    },
    {
      accessorKey: 'features',
      header: () => <div className="text-center">Características</div>,
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-center gap-1">
          {row.original.features.slice(0, 2).map((planFeature) => (
            <Badge key={planFeature.featureId} variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {planFeature.feature.name}
            </Badge>
          ))}
          {row.original.features.length > 2 && (
            <Badge variant="outline" className="text-xs">+{row.original.features.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const plan = row.original
        return (
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
        )
      },
    },
  ]

  const toolbar = (
    <div className="flex items-center gap-3">
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
  )

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredPlans}
        toolbar={toolbar}
        emptyMessage="No hay planes registrados"
      />

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
