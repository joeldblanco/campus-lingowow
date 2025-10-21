'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Star, DollarSign, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getAvailablePlansForProduct } from '@/lib/actions/commercial'

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
  // Campos para planes con clases
  includesClasses?: boolean
  classesPerPeriod?: number
  classesPerWeek?: number
  allowProration?: boolean
  autoRenewal?: boolean
  billingCycle?: string
  // Campos para sistema de créditos
  creditPrice?: number
  acceptsCredits?: boolean
  acceptsRealMoney?: boolean
  // Para identificar si es un plan existente o nuevo
  isExisting?: boolean
}

interface EnhancedPlanManagerProps {
  plans: PlanData[]
  onPlansChange: (plans: PlanData[]) => void
  className?: string
}

export const EnhancedPlanManager: React.FC<EnhancedPlanManagerProps> = ({
  plans,
  onPlansChange,
  className = '',
}) => {
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null)
  const [availablePlans, setAvailablePlans] = useState<PlanData[]>([])
  const [selectedExistingPlanId, setSelectedExistingPlanId] = useState<string>('')
  const [isLoadingPlans, setIsLoadingPlans] = useState(false)

  useEffect(() => {
    loadAvailablePlans()
  }, [])

  const loadAvailablePlans = async () => {
    setIsLoadingPlans(true)
    try {
      const available = await getAvailablePlansForProduct()
      setAvailablePlans(available as PlanData[])
    } catch {
      toast.error('Error al cargar planes disponibles')
    } finally {
      setIsLoadingPlans(false)
    }
  }

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
    includesClasses: false,
    classesPerPeriod: undefined,
    classesPerWeek: undefined,
    allowProration: true,
    autoRenewal: true,
    billingCycle: 'MONTHLY',
    creditPrice: undefined,
    acceptsCredits: false,
    acceptsRealMoney: true,
    isExisting: false,
  })

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleAddNewPlan = () => {
    const newPlan = createEmptyPlan()
    setEditingPlan(newPlan)
  }

  const handleAssociateExistingPlan = () => {
    if (!selectedExistingPlanId) {
      toast.error('Selecciona un plan')
      return
    }

    const existingPlan = availablePlans.find((p) => p.id === selectedExistingPlanId)
    if (!existingPlan) return

    const planToAdd: PlanData = {
      ...existingPlan,
      isExisting: true,
      sortOrder: plans.length,
    }

    onPlansChange([...plans, planToAdd])
    setSelectedExistingPlanId('')
    
    // Remover de la lista de disponibles
    setAvailablePlans(availablePlans.filter((p) => p.id !== selectedExistingPlanId))
    
    toast.success('Plan asociado correctamente')
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
    const planToDelete = plans.find((p) => p.id === planId)
    
    // Si es un plan existente, devolverlo a la lista de disponibles
    if (planToDelete?.isExisting) {
      setAvailablePlans([...availablePlans, { ...planToDelete, isExisting: false }])
    }
    
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Planes del Producto</h3>
        <p className="text-sm text-gray-600">
          Crea nuevos planes o asocia planes existentes a este producto
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            Crear Nuevo Plan
          </TabsTrigger>
          <TabsTrigger value="associate">
            <LinkIcon className="h-4 w-4 mr-2" />
            Asociar Plan Existente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-4">
          <Button onClick={handleAddNewPlan} type="button" size="sm" className="mb-4">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Nuevo Plan
          </Button>
        </TabsContent>

        <TabsContent value="associate" className="mt-4">
          <div className="flex gap-2 mb-4">
            <Select
              value={selectedExistingPlanId}
              onValueChange={setSelectedExistingPlanId}
              disabled={isLoadingPlans}
            >
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
                    <SelectItem key={plan.id} value={plan.id!}>
                      {plan.name} - {formatPrice(plan.price)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssociateExistingPlan}
              disabled={!selectedExistingPlanId || isLoadingPlans}
              type="button"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Asociar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Solo se muestran planes que no están asociados a ningún producto
          </p>
        </TabsContent>
      </Tabs>

      {/* Existing Plans */}
      <div className="space-y-3 mt-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {plan.isExisting && (
                    <Badge variant="secondary" className="text-xs">
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Existente
                    </Badge>
                  )}
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
                  {!plan.isExisting && (
                    <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                      Editar
                    </Button>
                  )}
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
              {plan.description && <p className="text-sm text-gray-600 mt-2">{plan.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Plan Form */}
      {editingPlan && !editingPlan.isExisting && (
        <Card className="border-blue-200 bg-blue-50/50 mt-4">
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

            {/* Configuración de clases */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between rounded-lg border p-3 mb-4">
                <div>
                  <Label htmlFor="plan-includes-classes">Incluye Clases</Label>
                  <p className="text-sm text-gray-600">Este plan incluye clases programadas</p>
                </div>
                <Switch
                  id="plan-includes-classes"
                  checked={editingPlan.includesClasses || false}
                  onCheckedChange={(checked) => updateEditingPlan('includesClasses', checked)}
                />
              </div>

              {editingPlan.includesClasses && (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label htmlFor="plan-classes-period">Clases por Período</Label>
                      <Input
                        id="plan-classes-period"
                        type="number"
                        value={editingPlan.classesPerPeriod || ''}
                        onChange={(e) =>
                          updateEditingPlan('classesPerPeriod', parseInt(e.target.value) || 0)
                        }
                        placeholder="8"
                      />
                      <p className="text-xs text-gray-600 mt-1">Ej: 8 clases por mes</p>
                    </div>
                    <div>
                      <Label htmlFor="plan-classes-week">Clases por Semana</Label>
                      <Input
                        id="plan-classes-week"
                        type="number"
                        value={editingPlan.classesPerWeek || ''}
                        onChange={(e) =>
                          updateEditingPlan('classesPerWeek', parseInt(e.target.value) || 0)
                        }
                        placeholder="2"
                      />
                      <p className="text-xs text-gray-600 mt-1">Frecuencia semanal</p>
                    </div>
                    <div>
                      <Label htmlFor="plan-billing-cycle">Ciclo de Facturación</Label>
                      <select
                        id="plan-billing-cycle"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        value={editingPlan.billingCycle || 'MONTHLY'}
                        onChange={(e) => updateEditingPlan('billingCycle', e.target.value)}
                      >
                        <option value="WEEKLY">Semanal</option>
                        <option value="MONTHLY">Mensual</option>
                        <option value="QUARTERLY">Trimestral</option>
                        <option value="ANNUAL">Anual</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label htmlFor="plan-prorated">Permitir Prorateo</Label>
                        <p className="text-sm text-gray-600">Al comprar a mitad de período</p>
                      </div>
                      <Switch
                        id="plan-prorated"
                        checked={editingPlan.allowProration ?? true}
                        onCheckedChange={(checked) => updateEditingPlan('allowProration', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label htmlFor="plan-auto-renewal">Renovación Automática</Label>
                        <p className="text-sm text-gray-600">Se renueva automáticamente</p>
                      </div>
                      <Switch
                        id="plan-auto-renewal"
                        checked={editingPlan.autoRenewal ?? true}
                        onCheckedChange={(checked) => updateEditingPlan('autoRenewal', checked)}
                      />
                    </div>
                  </div>
                </>
              )}
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
        <Card className="border-dashed mt-4">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay planes configurados</h3>
            <p className="text-gray-600 mb-4">
              Crea nuevos planes o asocia planes existentes para este producto.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
