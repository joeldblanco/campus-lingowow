'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, DollarSign, Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  getAvailablePlansForProduct,
  associatePlanToProduct,
  dissociatePlanFromProduct,
  getProductById,
} from '@/lib/actions/commercial'

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
}

interface ProductPlansDialogProps {
  productId: string
  productName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductPlansDialog({
  productId,
  productName,
  open,
  onOpenChange,
}: ProductPlansDialogProps) {
  const [productPlans, setProductPlans] = useState<Plan[]>([])
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [product, available] = await Promise.all([
        getProductById(productId),
        getAvailablePlansForProduct(),
      ])

      if (product?.plans) {
        setProductPlans(product.plans as Plan[])
      }
      setAvailablePlans(available as Plan[])
    } catch {
      toast.error('Error al cargar los planes')
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, productId, loadData])

  const handleAssociatePlan = async () => {
    if (!selectedPlanId) {
      toast.error('Selecciona un plan')
      return
    }

    setIsLoading(true)
    try {
      const result = await associatePlanToProduct(selectedPlanId, productId)
      if (result.success) {
        toast.success('Plan asociado correctamente')
        setSelectedPlanId('')
        await loadData()
      } else {
        toast.error(result.error || 'Error al asociar el plan')
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDissociatePlan = async (planId: string) => {
    if (!confirm('¿Estás seguro de que quieres desasociar este plan del producto?')) {
      return
    }

    setIsLoading(true)
    try {
      const result = await dissociatePlanFromProduct(planId)
      if (result.success) {
        toast.success('Plan desasociado correctamente')
        await loadData()
      } else {
        toast.error(result.error || 'Error al desasociar el plan')
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  const getDurationText = (duration: number) => {
    if (duration < 30) return `${duration} días`
    if (duration === 30) return '1 mes'
    if (duration < 365) return `${Math.round(duration / 30)} meses`
    return `${Math.round(duration / 365)} años`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Planes del Producto</DialogTitle>
          <DialogDescription>
            Asocia o desasocia planes existentes al producto: <strong>{productName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Asociar nuevo plan */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Asociar Plan Existente</h3>
            <div className="flex gap-2">
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar plan disponible" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No hay planes disponibles
                    </div>
                  ) : (
                    availablePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {formatPrice(plan.price)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button onClick={handleAssociatePlan} disabled={!selectedPlanId || isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Asociar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Solo se muestran planes que no están asociados a ningún producto
            </p>
          </div>

          {/* Planes asociados */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Planes Asociados ({productPlans.length})</h3>

            {productPlans.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">Este producto no tiene planes asociados</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {productPlans.map((plan) => (
                  <Card key={plan.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{plan.name}</CardTitle>
                          {plan.isPopular && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                          {!plan.isActive && (
                            <Badge variant="outline" className="text-xs">
                              Inactivo
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDissociatePlan(plan.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{formatPrice(plan.price)}</span>
                            {plan.comparePrice && (
                              <span className="text-gray-500 line-through">
                                {formatPrice(plan.comparePrice)}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-600">{getDurationText(plan.duration)}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {plan.slug}
                        </Badge>
                      </div>
                      {plan.description && (
                        <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
