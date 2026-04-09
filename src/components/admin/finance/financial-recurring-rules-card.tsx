'use client'

import { useState } from 'react'
import {
  type FinancialRecurringRuleItem,
  upsertFinancialRecurringRule,
} from '@/lib/actions/finance'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Plus, SquarePen } from 'lucide-react'
import { toast } from 'sonner'

interface FinancialRecurringRulesCardProps {
  rules: FinancialRecurringRuleItem[]
  monthKey: string
  onSaved: () => Promise<void>
}

type RuleFormState = {
  id?: string
  name: string
  direction: 'INCOME' | 'EXPENSE'
  category: string
  subcategory: string
  ruleType: 'FIXED_AMOUNT' | 'INCOME_PERCENTAGE' | 'PROFIT_PERCENTAGE'
  recurrence: 'MONTHLY' | 'ANNUAL'
  amount: string
  notes: string
  isActive: boolean
}

const EMPTY_FORM: RuleFormState = {
  name: '',
  direction: 'EXPENSE',
  category: '',
  subcategory: '',
  ruleType: 'FIXED_AMOUNT',
  recurrence: 'MONTHLY',
  amount: '',
  notes: '',
  isActive: true,
}

function isPercentageRule(ruleType: 'FIXED_AMOUNT' | 'INCOME_PERCENTAGE' | 'PROFIT_PERCENTAGE') {
  return ruleType === 'INCOME_PERCENTAGE' || ruleType === 'PROFIT_PERCENTAGE'
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function mapRuleToForm(rule: FinancialRecurringRuleItem): RuleFormState {
  return {
    id: rule.id,
    name: rule.name,
    direction: rule.direction,
    category: rule.category,
    subcategory: rule.subcategory || '',
    ruleType: rule.ruleType,
    recurrence: rule.recurrence,
    amount: String(rule.amount),
    notes: rule.notes || '',
    isActive: rule.isActive,
  }
}

export function FinancialRecurringRulesCard({
  rules,
  monthKey,
  onSaved,
}: FinancialRecurringRulesCardProps) {
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  const handleOpenCreate = () => {
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const handleOpenEdit = (rule: FinancialRecurringRuleItem) => {
    setForm(mapRuleToForm(rule))
    setOpen(true)
  }

  const requestSave = () => {
    const amount = Number(form.amount)

    if (!form.name.trim() || !form.category.trim()) {
      toast.error('Nombre y categoria son obligatorios')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Ingresa un monto valido')
      return
    }

    setConfirmOpen(true)
  }

  const handleConfirmedSave = async () => {
    const amount = Number(form.amount)
    setIsSaving(true)

    try {
      const result = await upsertFinancialRecurringRule({
        id: form.id,
        name: form.name.trim(),
        direction: form.direction,
        category: form.category.trim(),
        subcategory: form.subcategory.trim() || undefined,
        ruleType: form.ruleType,
        recurrence: form.recurrence,
        amount,
        currency: 'USD',
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
      })

      if (!result.success) {
        toast.error(result.error || 'No se pudo guardar la configuracion')
        return
      }

      toast.success(form.id ? 'Configuracion actualizada' : 'Configuracion creada')
      setOpen(false)
      await onSaved()
    } finally {
      setIsSaving(false)
    }
  }

  const isPct = isPercentageRule(form.ruleType)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>Configuracion General</CardTitle>
            <CardDescription>
              Define ingresos y egresos que se registran automaticamente cada mes. Los cambios desde
              aqui aplican a partir de {monthKey} en adelante sin afectar meses anteriores.
            </CardDescription>
          </div>
          <Button type="button" onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva configuracion
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Flujo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead>Valor base</TableHead>
                <TableHead>Este mes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Accion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Aun no hay configuraciones generales.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => {
                  const pct = isPercentageRule(rule.ruleType)

                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="font-medium">{rule.name}</div>
                        {rule.notes && (
                          <div className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                            {rule.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {pct
                            ? rule.ruleType === 'INCOME_PERCENTAGE'
                              ? '% ingresos'
                              : '% ganancia'
                            : 'Monto fijo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.direction === 'INCOME' ? 'default' : 'secondary'}>
                          {rule.direction === 'INCOME' ? 'Ingreso' : 'Egreso'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{rule.category}</div>
                        {rule.subcategory && (
                          <div className="text-xs text-muted-foreground">{rule.subcategory}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {pct ? 'Mensual' : rule.recurrence === 'ANNUAL' ? 'Anual' : 'Mensual'}
                      </TableCell>
                      <TableCell>
                        {pct ? `${rule.amount}%` : formatCurrency(rule.amount, rule.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {pct
                            ? `${rule.currentMonthAmount}%`
                            : formatCurrency(rule.currentMonthAmount, rule.currency)}
                        </div>
                        {rule.hasMonthOverride && (
                          <Badge variant="secondary">Override activo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.isActive ? 'outline' : 'secondary'}>
                          {rule.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleOpenEdit(rule)}
                        >
                          <SquarePen className="h-4 w-4" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar configuracion' : 'Nueva configuracion'}</DialogTitle>
            <DialogDescription>
              {isPct
                ? 'El porcentaje aplica automaticamente sobre el total correspondiente cada mes.'
                : 'Los cambios aplican desde el mes actual en adelante. Los meses anteriores mantienen su historico.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="rule-name">Nombre</Label>
              <Input
                id="rule-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ej. Herramientas, ads, otros ingresos"
              />
            </div>

            <div className="space-y-2">
              <Label>Flujo</Label>
              <Select
                value={form.direction}
                disabled={isPct}
                onValueChange={(value: 'INCOME' | 'EXPENSE') =>
                  setForm((current) => ({ ...current, direction: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Ingreso</SelectItem>
                  <SelectItem value="EXPENSE">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isPct ? (
              <div className="space-y-2">
                <Label>Tipo de calculo</Label>
                <Input
                  disabled
                  value={
                    form.ruleType === 'INCOME_PERCENTAGE'
                      ? '% sobre ingresos totales'
                      : '% sobre ganancia neta'
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select
                  value={form.recurrence}
                  onValueChange={(value: 'MONTHLY' | 'ANNUAL') =>
                    setForm((current) => ({ ...current, recurrence: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Mensual</SelectItem>
                    <SelectItem value="ANNUAL">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="rule-category">Categoria</Label>
              <Input
                id="rule-category"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
                placeholder="Ej. Marketing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-subcategory">Subcategoria</Label>
              <Input
                id="rule-subcategory"
                value={form.subcategory}
                onChange={(event) =>
                  setForm((current) => ({ ...current, subcategory: event.target.value }))
                }
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-amount">
                {isPct
                  ? 'Porcentaje (%)'
                  : form.recurrence === 'ANNUAL'
                    ? 'Monto anual (USD)'
                    : 'Monto mensual (USD)'}
              </Label>
              <Input
                id="rule-amount"
                type="number"
                min="0"
                step={isPct ? '0.1' : '0.01'}
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, isActive: value === 'ACTIVE' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activa</SelectItem>
                  <SelectItem value="INACTIVE">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="rule-notes">Notas</Label>
              <Textarea
                id="rule-notes"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={3}
                placeholder="Referencia opcional para esta configuracion"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={requestSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cambios en configuracion?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta modificacion aplicara desde el mes actual ({monthKey}) en adelante para todos los
              meses futuros. Los meses anteriores mantienen sus valores historicos y no se veran
              afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isSaving} onClick={() => void handleConfirmedSave()}>
              {isSaving ? 'Guardando...' : 'Confirmar y guardar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
