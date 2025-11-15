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
import { MoreHorizontal, Edit, Trash2, Zap } from 'lucide-react'
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

export function PlansTable({ plans }: PlansTableProps) {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

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

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Características</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ventas</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No hay planes registrados
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {plan.name}
                        {plan.isPopular && (
                          <Badge variant="default" className="text-xs">
                            Popular
                          </Badge>
                        )}
                      </div>
                      {plan.description && (
                        <div className="text-sm text-muted-foreground">
                          {plan.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{formatPrice(plan.price)}</div>
                      {plan.comparePrice && (
                        <div className="text-sm text-muted-foreground line-through">
                          {formatPrice(plan.comparePrice)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(plan.duration)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {plan.features.slice(0, 3).map((planFeature) => (
                        <Badge key={planFeature.featureId} variant="outline" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          {planFeature.feature.name}
                        </Badge>
                      ))}
                      {plan.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{plan.features.length - 3} más
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {plan.product ? (
                        <Badge variant="outline" className="text-xs">
                          {plan.product.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Sin producto
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                      {plan.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>{plan._count.invoiceItems}</TableCell>
                  <TableCell>{plan.sortOrder}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingPlan(plan)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(plan.id)}
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
