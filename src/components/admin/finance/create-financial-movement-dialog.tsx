'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { createFinancialMovement } from '@/lib/actions/finance'
import { financeManualCategories } from '@/schemas/finance'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface CreateFinancialMovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => Promise<void> | void
}

interface FinancialMovementFormState {
  category: string
  subcategory: string
  description: string
  providerName: string
  amount: string
  expenseDate: string
  notes: string
  proofUrl: string
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

const initialState: FinancialMovementFormState = {
  category: financeManualCategories[0],
  subcategory: '',
  description: '',
  providerName: '',
  amount: '',
  expenseDate: getToday(),
  notes: '',
  proofUrl: '',
}

export function CreateFinancialMovementDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateFinancialMovementDialogProps) {
  const [form, setForm] = useState<FinancialMovementFormState>(initialState)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) {
      setForm(initialState)
    }
  }, [open])

  const handleChange = (field: keyof FinancialMovementFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await createFinancialMovement({
        direction: 'EXPENSE',
        category: form.category,
        subcategory: form.subcategory,
        description: form.description,
        providerName: form.providerName,
        amount: form.amount,
        currency: 'USD',
        baseCurrency: 'USD',
        accrualDate: form.expenseDate,
        cashDate: form.expenseDate,
        notes: form.notes,
        proofUrl: form.proofUrl,
        status: 'POSTED',
      })

      if (!result.success) {
        toast.error(result.error || 'No se pudo registrar la salida')
        return
      }

      toast.success('Salida registrada correctamente')
      await onCreated()
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Otra Salida</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select
              value={form.category}
              onValueChange={(value) => handleChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {financeManualCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha de salida</Label>
            <Input
              type="date"
              value={form.expenseDate}
              onChange={(event) => handleChange('expenseDate', event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Descripción</Label>
            <Input
              value={form.description}
              onChange={(event) => handleChange('description', event.target.value)}
              placeholder="Ej. Suscripción mensual, pauta, servicio, etc."
            />
          </div>

          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Input
              value={form.providerName}
              onChange={(event) => handleChange('providerName', event.target.value)}
              placeholder="Ej. Meta, Notion, Contador"
            />
          </div>

          <div className="space-y-2">
            <Label>Subcategoría</Label>
            <Input
              value={form.subcategory}
              onChange={(event) => handleChange('subcategory', event.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-2">
            <Label>Monto</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => handleChange('amount', event.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Comprobante (URL)</Label>
            <Input
              value={form.proofUrl}
              onChange={(event) => handleChange('proofUrl', event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              placeholder="Información adicional para recordar por qué salió este monto"
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar salida'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
