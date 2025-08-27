'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { MoreHorizontal, Edit, Trash2, Copy } from 'lucide-react'
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
  _count: {
    invoices: number
  }
}

interface CouponsTableProps {
  coupons: Coupon[]
}

export function CouponsTable({ coupons }: CouponsTableProps) {
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)

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

  const isExpired = (expiresAt: Date | null) => {
    if (!expiresAt) return false
    return new Date() > new Date(expiresAt)
  }

  const getStatusBadge = (coupon: Coupon) => {
    if (!coupon.isActive) return <Badge variant="secondary">Inactivo</Badge>
    if (isExpired(coupon.expiresAt)) return <Badge variant="destructive">Expirado</Badge>
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return <Badge variant="destructive">Agotado</Badge>
    }
    return <Badge variant="default">Activo</Badge>
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descuento</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay cupones registrados
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <code className="font-mono bg-muted px-2 py-1 rounded text-sm">
                        {coupon.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(coupon.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{coupon.name || '-'}</div>
                      {coupon.description && (
                        <div className="text-sm text-muted-foreground">
                          {coupon.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {formatDiscount(coupon.type, coupon.value)}
                      </div>
                      {coupon.minAmount && (
                        <div className="text-sm text-muted-foreground">
                          Mín: ${coupon.minAmount}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {coupon.usageLimit ? (
                      <div className="text-sm">
                        {coupon.usageCount} / {coupon.usageLimit}
                      </div>
                    ) : (
                      <div className="text-sm">Ilimitado</div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(coupon)}</TableCell>
                  <TableCell>
                    {coupon.expiresAt ? (
                      <div className="text-sm">
                        {new Date(coupon.expiresAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin vencimiento</span>
                    )}
                  </TableCell>
                  <TableCell>{coupon._count.invoices}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingCoupon(coupon)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(coupon.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
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
