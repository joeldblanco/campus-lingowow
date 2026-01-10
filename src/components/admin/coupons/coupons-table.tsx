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
import { MoreVertical, Edit, Trash2, Copy, Search, SlidersHorizontal, User, Package } from 'lucide-react'
import { EditCouponDialog } from './edit-coupon-dialog'
import { deleteCoupon } from '@/lib/actions/commercial'
import { toast } from 'sonner'

interface Coupon {
  id: string
  code: string
  name: string | null
  description: string | null
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  minAmount: number | null
  maxDiscount: number | null
  usageLimit: number | null
  usageCount: number
  userLimit: number | null
  isActive: boolean
  startsAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
  restrictedToUserId?: string | null
  restrictedToPlanId?: string | null
  restrictedUser?: { id: string; name: string; email: string } | null
  restrictedPlan?: { id: string; name: string; slug: string } | null
  _count: {
    invoices: number
  }
}

interface CouponsTableProps {
  coupons: Coupon[]
}

export function CouponsTable({ coupons }: CouponsTableProps) {
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const isExpired = (expiresAt: Date | null) => {
    if (!expiresAt) return false
    return new Date() > new Date(expiresAt)
  }

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.isActive) return 'inactive'
    if (isExpired(coupon.expiresAt)) return 'expired'
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return 'exhausted'
    return 'active'
  }

  const filteredCoupons = useMemo(() => {
    let filtered = coupons
    if (searchTerm) {
      filtered = filtered.filter(
        (coupon) =>
          coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          coupon.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((coupon) => {
        const status = getCouponStatus(coupon)
        return status === statusFilter
      })
    }
    return filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupons, searchTerm, statusFilter])

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este cupón?')) {
      const result = await deleteCoupon(id)
      if (result.success) {
        toast.success('Cupón eliminado correctamente')
      } else {
        toast.error(result.error || 'Error al eliminar el cupón')
      }
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Código copiado al portapapeles')
  }

  const formatDiscount = (type: string, value: number) => {
    if (type === 'PERCENTAGE') {
      return `${value}%`
    }
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const getStatusBadge = (coupon: Coupon) => {
    const status = getCouponStatus(coupon)
    const statusStyles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
      inactive: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
      expired: 'bg-red-100 text-red-700 hover:bg-red-100',
      exhausted: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
    }
    const statusLabels: Record<string, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
      expired: 'Expirado',
      exhausted: 'Agotado',
    }
    return (
      <Badge className={`${statusStyles[status]} border-0 font-medium`}>
        {statusLabels[status]}
      </Badge>
    )
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  const columns: ColumnDef<Coupon>[] = [
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
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <code className="font-mono bg-muted px-2 py-1 rounded text-sm">{row.original.code}</code>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyCode(row.original.code)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.name || '-'}</div>
          {row.original.description && (
            <div className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'value',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descuento" />,
      cell: ({ row }) => (
        <div className="font-medium text-sm">{formatDiscount(row.original.type, row.original.value)}</div>
      ),
    },
    {
      accessorKey: 'restrictions',
      header: () => <div>Restricciones</div>,
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          {row.original.restrictedUser && (
            <Badge variant="outline" className="text-xs w-fit flex items-center gap-1">
              <User className="h-3 w-3" />
              {row.original.restrictedUser.name}
            </Badge>
          )}
          {row.original.restrictedPlan && (
            <Badge variant="outline" className="text-xs w-fit flex items-center gap-1">
              <Package className="h-3 w-3" />
              {row.original.restrictedPlan.name}
            </Badge>
          )}
          {!row.original.restrictedUser && !row.original.restrictedPlan && (
            <span className="text-xs text-muted-foreground">Sin restricciones</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => getStatusBadge(row.original),
    },
    {
      accessorKey: 'usageCount',
      header: () => <div className="text-center">Uso</div>,
      cell: ({ row }) => (
        <div className="text-center text-sm">
          {row.original.usageLimit ? `${row.original.usageCount}/${row.original.usageLimit}` : `${row.original.usageCount}/∞`}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const coupon = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCoupon(coupon)}>
              <Edit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDelete(coupon.id)} className="text-destructive">
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
          placeholder="Buscar por código o nombre..."
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
          <SelectItem value="active">Activo</SelectItem>
          <SelectItem value="inactive">Inactivo</SelectItem>
          <SelectItem value="expired">Expirado</SelectItem>
          <SelectItem value="exhausted">Agotado</SelectItem>
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
        data={filteredCoupons}
        toolbar={toolbar}
        emptyMessage="No hay cupones registrados"
      />

      {editingCoupon && (
        <EditCouponDialog
          coupon={editingCoupon}
          open={!!editingCoupon}
          onOpenChange={(open: boolean) => !open && setEditingCoupon(null)}
        />
      )}
    </>
  )
}
