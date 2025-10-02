'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Star, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

export interface PlanData {
  id?: string
  name: string
  slug: string
  description?: string
  price: number
  comparePrice?: number
  duration: number
  isActive: boolean
  isPopular: boolean
  sortOrder: number
}

interface PlanManagerProps {
  plans: PlanData[]
  onPlansChange: (plans: PlanData[]) => void
  className?: string
}

export const PlanManager: React.FC<PlanManagerProps> = ({
  plans,
  onPlansChange,
  className = '',
}) => {
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null)

  const createEmptyPlan = (): PlanData => ({
    name: '',
    slug: '',
    description: '',
    price: 0,
    comparePrice: undefined,
    duration: 30,
    isActive: true,
    isPopular: false,
    sortOrder: plans.length,
  })

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleAddPlan = () => {
    const newPlan = createEmptyPlan()
    setEditingPlan(newPlan)
  }

  const handleSavePlan = () => {
    if (!editingPlan) return

    if (!editingPlan.name.trim()) {
      toast.error('El nombre del plan es requerido')
      return
    }

    if (editingPlan.price <= 0) {
      toast.error('El precio debe ser mayor a 0')
      return
    }

    const updatedPlans = editingPlan.id
      ? plans.map((p) => (p.id === editingPlan.id ? editingPlan : p))
      : [...plans, { ...editingPlan, id: `temp-${Date.now()}` }]

    onPlansChange(updatedPlans)
    setEditingPlan(null)
    toast.success('Plan guardado correctamente')
  }

  const handleEditPlan = (plan: PlanData) => {
    setEditingPlan({ ...plan })
  }

  const handleDeletePlan = (planId: string) => {
    const updatedPlans = plans.filter((p) => p.id !== planId)
    onPlansChange(updatedPlans)
    toast.success('Plan eliminado')
  }

  const handleCancelEdit = () => {
    setEditingPlan(null)
  }

  const updateEditingPlan = (field: keyof PlanData, value: string | number | boolean) => {
    if (!editingPlan) return

    const updates: Partial<PlanData> = { [field]: value }

    // Auto-generate slug when name changes
    if (field === 'name' && typeof value === 'string') {
      updates.slug = generateSlug(value)
    }

    setEditingPlan({ ...editingPlan, ...updates })
  }

  const getDurationText = (duration: number) => {
    if (duration < 30) return `${duration} días`
    if (duration === 30) return '1 mes'
    if (duration < 365) return `${Math.round(duration / 30)} meses`
    return `${Math.round(duration / 365)} años`
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Planes del Producto</h3>
          <p className="text-sm text-gray-600">
            Configura los planes de pago disponibles para este producto
          </p>
        </div>
        <Button onClick={handleAddPlan} type="button" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Plan
        </Button>
      </div>

      {/* Existing Plans */}
      <div className="space-y-3 mb-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
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
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletePlan(plan.id!)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium">${plan.price}</span>
                    {plan.comparePrice && (
                      <span className="text-gray-500 line-through">${plan.comparePrice}</span>
                    )}
                  </div>
                  <span className="text-gray-600">{getDurationText(plan.duration)}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {plan.slug}
                </Badge>
              </div>
              {plan.description && <p className="text-sm text-gray-600 mt-2">{plan.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Plan Form */}
      {editingPlan && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-base">
              {editingPlan.id ? 'Editar Plan' : 'Nuevo Plan'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plan-name">Nombre del Plan</Label>
                <Input
                  id="plan-name"
                  value={editingPlan.name}
                  onChange={(e) => updateEditingPlan('name', e.target.value)}
                  placeholder="Ej: Plan Básico"
                />
              </div>
              <div>
                <Label htmlFor="plan-slug">Slug</Label>
                <Input
                  id="plan-slug"
                  value={editingPlan.slug}
                  onChange={(e) => updateEditingPlan('slug', e.target.value)}
                  placeholder="plan-basico"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="plan-description">Descripción</Label>
              <Textarea
                id="plan-description"
                value={editingPlan.description || ''}
                onChange={(e) => updateEditingPlan('description', e.target.value)}
                placeholder="Descripción del plan (opcional)"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="plan-price">Precio</Label>
                <Input
                  id="plan-price"
                  type="number"
                  step="0.01"
                  value={editingPlan.price}
                  onChange={(e) => updateEditingPlan('price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="plan-compare-price">Precio de Comparación</Label>
                <Input
                  id="plan-compare-price"
                  type="number"
                  step="0.01"
                  value={editingPlan.comparePrice || ''}
                  onChange={(e) =>
                    updateEditingPlan('comparePrice', parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00 (opcional)"
                />
              </div>
              <div>
                <Label htmlFor="plan-duration">Duración (días)</Label>
                <Input
                  id="plan-duration"
                  type="number"
                  value={editingPlan.duration}
                  onChange={(e) => updateEditingPlan('duration', parseInt(e.target.value) || 30)}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="plan-active">Plan Activo</Label>
                  <p className="text-sm text-gray-600">El plan estará disponible para compra</p>
                </div>
                <Switch
                  id="plan-active"
                  checked={editingPlan.isActive}
                  onCheckedChange={(checked) => updateEditingPlan('isActive', checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="plan-popular">Plan Popular</Label>
                  <p className="text-sm text-gray-600">Se destacará como recomendado</p>
                </div>
                <Switch
                  id="plan-popular"
                  checked={editingPlan.isPopular}
                  onCheckedChange={(checked) => updateEditingPlan('isPopular', checked)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSavePlan} type="button">
                {editingPlan.id ? 'Actualizar Plan' : 'Agregar Plan'}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit} type="button">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {plans.length === 0 && !editingPlan && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay planes configurados</h3>
            <p className="text-gray-600 mb-4">
              Agrega planes de pago para que los usuarios puedan elegir diferentes opciones.
            </p>
            <Button onClick={handleAddPlan}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
