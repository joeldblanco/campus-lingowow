'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { createFinancialMovement, type FinancialReportRow } from '@/lib/actions/finance'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
  rows: FinancialReportRow[]
  scope: {
    periodName: string | null
  }
}

type EntryType = 'standard' | 'discount'
type ExpenseMode = 'recurring' | 'one-time'

interface FinancialMovementFormState {
  entryType: EntryType
  expenseMode: ExpenseMode
  studentId: string
  description: string
  amount: string
  expenseDate: string
  notes: string
}

interface DiscountStudentOption {
  id: string
  name: string
  classCount: number
  incomeTotal: number
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function buildInitialState(): FinancialMovementFormState {
  return {
    entryType: 'standard',
    expenseMode: 'recurring',
    studentId: '',
    description: '',
    amount: '',
    expenseDate: getToday(),
    notes: '',
  }
}

export function CreateFinancialMovementDialog({
  open,
  onOpenChange,
  onCreated,
  rows,
  scope,
}: CreateFinancialMovementDialogProps) {
  const [form, setForm] = useState<FinancialMovementFormState>(() => buildInitialState())
  const [isPending, startTransition] = useTransition()

  const studentOptions = rows
    .filter(
      (row) =>
        row.sourceType === 'SCHEDULED_CLASS_REVENUE' &&
        row.direction === 'INCOME' &&
        row.sourceId &&
        (row.unitCount || 0) > 0
    )
    .map<DiscountStudentOption>((row) => ({
      id: row.sourceId!,
      name: row.counterparty || 'Estudiante',
      classCount: row.unitCount || 0,
      incomeTotal: row.netAmount,
    }))
    .sort((first, second) => first.name.localeCompare(second.name, 'es'))

  const selectedStudent = studentOptions.find((student) => student.id === form.studentId) || null
  const parsedAmount = Number(form.amount || 0)
  const discountPerClass = parsedAmount > 0 ? roundCurrency(parsedAmount) : 0
  const calculatedDiscountTotal = selectedStudent
    ? roundCurrency(discountPerClass * selectedStudent.classCount)
    : 0
  const incomeAfterDiscount = selectedStudent
    ? roundCurrency(Math.max(selectedStudent.incomeTotal - calculatedDiscountTotal, 0))
    : 0
  const resolvedExpenseDate =
    form.entryType === 'discount' || form.expenseMode === 'recurring'
      ? getToday()
      : form.expenseDate

  useEffect(() => {
    if (!open) {
      setForm(buildInitialState())
    }
  }, [open])

  const handleChange = (field: keyof FinancialMovementFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleEntryTypeChange = (value: EntryType) => {
    setForm((current) => ({
      ...current,
      entryType: value,
      expenseMode: value === 'discount' ? 'recurring' : current.expenseMode,
      studentId: value === 'discount' ? current.studentId : '',
    }))
  }

  const handleStudentChange = (studentId: string) => {
    const student = studentOptions.find((item) => item.id === studentId)

    setForm((current) => ({
      ...current,
      studentId,
      description:
        current.entryType === 'discount' &&
        (!current.description || current.description.startsWith('Descuento aplicado a ')) &&
        student
          ? `Descuento aplicado a ${student.name}`
          : current.description,
    }))
  }

  const handleSubmit = () => {
    if (form.entryType === 'discount' && !selectedStudent) {
      toast.error('Selecciona un estudiante para registrar el descuento')
      return
    }

    startTransition(async () => {
      const discountNotes =
        form.entryType === 'discount' && selectedStudent
          ? `Descuento de USD ${discountPerClass.toFixed(2)} por clase en ${selectedStudent.classCount} clases${scope.periodName ? ` de ${scope.periodName}` : ''}.`
          : null

      const notes = [discountNotes, form.notes.trim()].filter(Boolean).join(' | ')

      const result = await createFinancialMovement({
        direction: 'EXPENSE',
        category: form.entryType === 'discount' ? 'Descuentos' : 'Otros',
        subcategory:
          form.entryType === 'discount'
            ? 'Recurrente'
            : form.expenseMode === 'recurring'
              ? 'Recurrente'
              : 'Puntual',
        sourceId: form.entryType === 'discount' ? selectedStudent?.id : undefined,
        description: form.description,
        providerName: form.entryType === 'discount' ? selectedStudent?.name : undefined,
        amount: form.entryType === 'discount' ? calculatedDiscountTotal : parsedAmount,
        currency: 'USD',
        baseCurrency: 'USD',
        accrualDate: resolvedExpenseDate,
        cashDate: resolvedExpenseDate,
        notes: notes || undefined,
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar Otra Salida</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Tipo de salida</Label>
            <Select
              value={form.entryType}
              onValueChange={(value) => handleEntryTypeChange(value as EntryType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Salida general</SelectItem>
                <SelectItem value="discount">Descuento por estudiante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.entryType === 'standard' ? (
            <div className="space-y-3">
              <Label>Modalidad</Label>
              <RadioGroup
                value={form.expenseMode}
                onValueChange={(value) => handleChange('expenseMode', value)}
                className="grid gap-3 md:grid-cols-2"
              >
                <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
                  <RadioGroupItem value="recurring" id="expense-mode-recurring" />
                  <div>
                    <p className="text-sm font-medium">Salida recurrente</p>
                    <p className="text-xs text-muted-foreground">
                      Se registra dentro del mes actual con fecha {resolvedExpenseDate}.
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
                  <RadioGroupItem value="one-time" id="expense-mode-one-time" />
                  <div>
                    <p className="text-sm font-medium">Salida puntual</p>
                    <p className="text-xs text-muted-foreground">
                      Te permite elegir la fecha exacta de la salida.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              Este descuento se registra como salida recurrente dentro del mes actual.
            </div>
          )}

          {form.entryType === 'discount' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Estudiante</Label>
                <Select value={form.studentId} onValueChange={handleStudentChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentOptions.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} · {student.classCount} clases
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {studentOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay estudiantes con clases agendadas en el resultado visible.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Descuento por clase</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => handleChange('amount', event.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                <p className="font-medium">Resultado calculado</p>
                <p className="mt-2 text-muted-foreground">
                  Clases del período:{' '}
                  <span className="font-medium text-foreground">
                    {selectedStudent?.classCount || 0}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Descuento total:{' '}
                  <span className="font-medium text-foreground">
                    USD {calculatedDiscountTotal.toFixed(2)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Ingreso del estudiante luego del descuento:{' '}
                  <span className="font-medium text-foreground">
                    USD {incomeAfterDiscount.toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              value={form.description}
              onChange={(event) => handleChange('description', event.target.value)}
              placeholder={
                form.entryType === 'discount'
                  ? 'Ej. Descuento promocional de abril'
                  : 'Ej. Herramienta mensual, servicio, movilidad, etc.'
              }
            />
          </div>

          {form.entryType === 'standard' && (
            <div className="grid gap-4 md:grid-cols-2">
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

              {form.expenseMode === 'one-time' && (
                <div className="space-y-2">
                  <Label>Fecha de salida</Label>
                  <Input
                    type="date"
                    value={form.expenseDate}
                    onChange={(event) => handleChange('expenseDate', event.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              placeholder="Opcional"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending ||
              form.description.trim().length < 3 ||
              parsedAmount <= 0 ||
              (form.entryType === 'discount' && !selectedStudent) ||
              (form.entryType === 'standard' &&
                form.expenseMode === 'one-time' &&
                !form.expenseDate)
            }
          >
            {isPending ? 'Guardando...' : 'Guardar salida'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
