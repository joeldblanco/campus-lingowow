'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, CalendarDays, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { 
  checkCanReschedule, 
  getAvailableSlotsForReschedule,
  studentRescheduleClass,
  type RescheduleCheckResult 
} from '@/lib/actions/student-schedule'
import { toast } from 'sonner'

interface StudentRescheduleDialogProps {
  bookingId: string
  currentDate: Date
  currentTimeSlot: string
  courseName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function StudentRescheduleDialog({
  bookingId,
  currentDate,
  currentTimeSlot,
  courseName,
  open,
  onOpenChange,
  onSuccess,
}: StudentRescheduleDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<'check' | 'select-date' | 'select-time' | 'confirm'>('check')
  const [eligibility, setEligibility] = useState<RescheduleCheckResult | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [availableSlots, setAvailableSlots] = useState<{ timeSlot: string; available: boolean }[]>([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar elegibilidad al abrir el diálogo
  useEffect(() => {
    if (open && bookingId) {
      setStep('check')
      setError(null)
      setSelectedDate(undefined)
      setSelectedTimeSlot(null)
      setAvailableSlots([])
      
      startTransition(async () => {
        const result = await checkCanReschedule(bookingId)
        if (result.success && result.data) {
          setEligibility(result.data)
          if (result.data.canReschedule) {
            setStep('select-date')
          }
        } else {
          setError(result.error || 'Error al verificar elegibilidad')
        }
      })
    }
  }, [open, bookingId])

  // Cargar slots disponibles cuando se selecciona una fecha
  useEffect(() => {
    if (selectedDate && step === 'select-date') {
      setLoadingSlots(true)
      setAvailableSlots([])
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      startTransition(async () => {
        const result = await getAvailableSlotsForReschedule(bookingId, dateStr)
        if (result.success && result.data) {
          setAvailableSlots(result.data)
          setStep('select-time')
        } else {
          setError(result.error || 'Error al obtener horarios disponibles')
        }
        setLoadingSlots(false)
      })
    }
  }, [selectedDate, bookingId, step])

  const handleConfirmReschedule = () => {
    if (!selectedDate || !selectedTimeSlot) return

    startTransition(async () => {
      const result = await studentRescheduleClass({
        bookingId,
        newDay: format(selectedDate, 'yyyy-MM-dd'),
        newTimeSlot: selectedTimeSlot,
      })

      if (result.success) {
        toast.success('Clase reagendada exitosamente')
        onOpenChange(false)
        onSuccess?.()
      } else {
        setError(result.error || 'Error al reagendar la clase')
        toast.error(result.error || 'Error al reagendar la clase')
      }
    })
  }

  const handleBack = () => {
    if (step === 'select-time') {
      setStep('select-date')
      setSelectedTimeSlot(null)
    } else if (step === 'confirm') {
      setStep('select-time')
    }
  }

  const handleSelectTimeSlot = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot)
    setStep('confirm')
  }

  // Deshabilitar fechas pasadas y el día actual
  const disabledDays = { before: addDays(new Date(), 1) }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Reagendar Clase
          </DialogTitle>
          <DialogDescription>
            {courseName} - {format(currentDate, "d 'de' MMMM", { locale: es })} {currentTimeSlot}
          </DialogDescription>
        </DialogHeader>

        {/* Estado de carga inicial */}
        {step === 'check' && isPending && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verificando disponibilidad...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive text-center">{error}</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        )}

        {/* No puede reagendar */}
        {step === 'check' && !isPending && eligibility && !eligibility.canReschedule && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <p className="text-sm text-center text-muted-foreground">{eligibility.reason}</p>
            <div className="flex gap-2">
              <Badge variant="outline">
                Reagendamientos usados: {eligibility.reschedulesUsed}/{eligibility.maxReschedules}
              </Badge>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Entendido
            </Button>
          </div>
        )}

        {/* Paso 1: Seleccionar fecha */}
        {step === 'select-date' && eligibility?.canReschedule && !error && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Badge variant="outline" className="text-xs">
                Reagendamientos disponibles: {eligibility.maxReschedules - eligibility.reschedulesUsed}/{eligibility.maxReschedules}
              </Badge>
            </div>
            
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={disabledDays}
                locale={es}
                className="rounded-md border"
              />
            </div>

            {loadingSlots && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Cargando horarios...</span>
              </div>
            )}
          </div>
        )}

        {/* Paso 2: Seleccionar horario */}
        {step === 'select-time' && !error && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                ← Cambiar fecha
              </Button>
              <Badge variant="secondary">
                {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </Badge>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="grid grid-cols-2 gap-2">
                {availableSlots.length === 0 ? (
                  <p className="col-span-2 text-center text-sm text-muted-foreground py-8">
                    No hay horarios disponibles para esta fecha
                  </p>
                ) : (
                  availableSlots.map((slot) => (
                    <Button
                      key={slot.timeSlot}
                      variant={slot.available ? 'outline' : 'ghost'}
                      size="sm"
                      disabled={!slot.available}
                      onClick={() => handleSelectTimeSlot(slot.timeSlot)}
                      className={cn(
                        'justify-start',
                        !slot.available && 'opacity-50 cursor-not-allowed line-through'
                      )}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {slot.timeSlot}
                    </Button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Paso 3: Confirmar */}
        {step === 'confirm' && selectedDate && selectedTimeSlot && !error && (
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Nuevo horario:</p>
                <p className="text-lg font-semibold">
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-xl font-bold text-primary">{selectedTimeSlot}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="text-muted-foreground">
                  <strong>Horario anterior:</strong>{' '}
                  {format(currentDate, "d 'de' MMMM", { locale: es })} {currentTimeSlot}
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleBack} disabled={isPending}>
                Cambiar horario
              </Button>
              <Button onClick={handleConfirmReschedule} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reagendando...
                  </>
                ) : (
                  'Confirmar reagendamiento'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
