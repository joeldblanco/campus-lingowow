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
import { MoreVertical, Edit, Trash2, Copy, Search, ChevronLeft, ChevronRight, SlidersHorizontal, User, Package } from 'lucide-react'
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

const ITEMS_PER_PAGE = 5

export function CouponsTable({ coupons }: CouponsTableProps) {
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([])

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

  // Filter coupons
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

  // Pagination
  const totalPages = Math.ceil(filteredCoupons.length / ITEMS_PER_PAGE)
  const paginatedCoupons = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredCoupons.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredCoupons, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCoupons(paginatedCoupons.map(c => c.id))
    } else {
      setSelectedCoupons([])
    }
  }

  const handleSelectCoupon = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCoupons(prev => [...prev, id])
    } else {
      setSelectedCoupons(prev => prev.filter(i => i !== id))
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

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedCoupons.length === paginatedCoupons.length && paginatedCoupons.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Código</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Nombre</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Descuento</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Restricciones</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground">Estado</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Uso</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCoupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No hay cupones registrados
                </TableCell>
              </TableRow>
            ) : (
              paginatedCoupons.map((coupon) => (
                <TableRow key={coupon.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedCoupons.includes(coupon.id)}
                      onCheckedChange={(checked) => handleSelectCoupon(coupon.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono bg-muted px-2 py-1 rounded text-sm">{coupon.code}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyCode(coupon.code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{coupon.name || '-'}</div>
                      {coupon.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{coupon.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{formatDiscount(coupon.type, coupon.value)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {coupon.restrictedUser && (
                        <Badge variant="outline" className="text-xs w-fit flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {coupon.restrictedUser.name}
                        </Badge>
                      )}
                      {coupon.restrictedPlan && (
                        <Badge variant="outline" className="text-xs w-fit flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {coupon.restrictedPlan.name}
                        </Badge>
                      )}
                      {!coupon.restrictedUser && !coupon.restrictedPlan && (
                        <span className="text-xs text-muted-foreground">Sin restricciones</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(coupon)}</TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm">
                      {coupon.usageLimit ? `${coupon.usageCount}/${coupon.usageLimit}` : `${coupon.usageCount}/∞`}
                    </div>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredCoupons.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a{' '}
            <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredCoupons.length)}</span> de{' '}
            <span className="font-medium">{filteredCoupons.length}</span> resultados
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
