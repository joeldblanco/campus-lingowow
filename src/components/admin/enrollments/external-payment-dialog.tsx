'use client'

import { useState, type FormEvent } from 'react'
import {
  getExternalPaymentEnrollmentOptions,
  registerExternalPaymentEnrollment,
} from '@/lib/actions/external-payments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Options = Awaited<ReturnType<typeof getExternalPaymentEnrollmentOptions>>

export function ExternalPaymentDialog({
  onEnrollmentCreated,
}: {
  onEnrollmentCreated?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Options | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState('')

  async function load() {
    setError('')
    setReceipt('')
    setOptions(null)
    try {
      setOptions(await getExternalPaymentEnrollmentOptions())
    } catch {
      setError('No se pudieron cargar los datos. Cierra y vuelve a abrir el formulario.')
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    try {
      const result = await registerExternalPaymentEnrollment({
        provider: 'culqi',
        studentId: form.get('studentId'),
        courseId: form.get('courseId'),
        academicPeriodId: form.get('academicPeriodId'),
        reference: form.get('reference'),
        amount: form.get('amount'),
        currency: form.get('currency'),
        paidAt: new Date(String(form.get('paidAt'))).toISOString(),
        description: form.get('description'),
        classesTotal: Number(form.get('classesTotal')),
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      setReceipt(
        `Pago Culqi ${String(form.get('reference')).trim()} registrado. Matrícula: ${result.data.enrollmentId}. Programa las clases desde la matrícula.`
      )
    } catch {
      setError(
        'No se pudo confirmar el resultado. Conserva los datos y reintenta; una referencia idéntica no se registra dos veces.'
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value)
          if (value) void load()
          else if (receipt) onEnrollmentCreated?.()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Registrar pago Culqi</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pago externo Culqi y matrícula</DialogTitle>
          <DialogDescription>
            Registra un pago ya recibido y crea la matrícula. No realiza cobros ni emite factura.
            Las clases se programan después.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {receipt ? (
          <p role="status">{receipt}</p>
        ) : !options ? (
          <p>Cargando datos…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={pending} className="space-y-4">
              <div>
                <Label htmlFor="external-student">Estudiante</Label>
                <select
                  id="external-student"
                  name="studentId"
                  required
                  defaultValue=""
                  className="w-full rounded-md border bg-background p-2"
                >
                  <option value="" disabled>
                    Selecciona un estudiante
                  </option>
                  {options.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.lastName} — {s.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="external-course">Curso</Label>
                <select
                  id="external-course"
                  name="courseId"
                  required
                  defaultValue=""
                  className="w-full rounded-md border bg-background p-2"
                >
                  <option value="" disabled>
                    Selecciona un curso
                  </option>
                  {options.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="external-period">Período académico</Label>
                <select
                  id="external-period"
                  name="academicPeriodId"
                  required
                  defaultValue=""
                  className="w-full rounded-md border bg-background p-2"
                >
                  <option value="" disabled>
                    Selecciona un período
                  </option>
                  {options.periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="external-reference">Referencia del comprobante Culqi</Label>
                <Input
                  id="external-reference"
                  name="reference"
                  required
                  minLength={3}
                  maxLength={200}
                  autoComplete="off"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="external-amount">Importe pagado</Label>
                  <Input
                    id="external-amount"
                    name="amount"
                    required
                    inputMode="decimal"
                    placeholder="0.00"
                    pattern="(?:0|[1-9][0-9]{0,6})(?:\.[0-9]{1,2})?"
                  />
                </div>
                <div>
                  <Label htmlFor="external-currency">Moneda</Label>
                  <select
                    id="external-currency"
                    name="currency"
                    required
                    defaultValue=""
                    className="w-full rounded-md border bg-background p-2"
                  >
                    <option value="" disabled>
                      Selecciona
                    </option>
                    <option value="USD">USD</option>
                    <option value="PEN">PEN</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="external-date">
                  Fecha y hora del pago (hora local de tu dispositivo)
                </Label>
                <Input id="external-date" name="paidAt" type="datetime-local" required />
              </div>
              <div>
                <Label htmlFor="external-description">Paquete o concepto del comprobante</Label>
                <Input
                  id="external-description"
                  name="description"
                  required
                  minLength={3}
                  maxLength={500}
                />
              </div>
              <div>
                <Label htmlFor="external-classes">Clases pagadas</Label>
                <Input
                  id="external-classes"
                  name="classesTotal"
                  type="number"
                  required
                  min={1}
                  max={500}
                  step={1}
                />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" required className="mt-1" />
                Confirmo que revisé el comprobante y que el pago fue recibido en Culqi.
              </label>
              <Button type="submit" className="w-full">
                {pending ? 'Registrando…' : 'Registrar pago y crear matrícula'}
              </Button>
            </fieldset>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
