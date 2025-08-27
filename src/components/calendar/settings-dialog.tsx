'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings } from 'lucide-react'
import { toast } from 'sonner'

interface SettingsDialogProps {
  slotDuration: number
  setSlotDuration: (duration: number) => void
  maxBookingsPerStudent: number
  setMaxBookingsPerStudent: (max: number) => void
  startHour: number
  setStartHour: (hour: number) => void
  endHour: number
  setEndHour: (hour: number) => void
  onSave?: (settings: {
    slotDuration: number
    startHour: number
    endHour: number
    maxBookingsPerStudent: number
  }) => Promise<void>
}

export function SettingsDialog({
  slotDuration,
  setSlotDuration,
  maxBookingsPerStudent,
  setMaxBookingsPerStudent,
  startHour,
  setStartHour,
  endHour,
  setEndHour,
  onSave,
}: SettingsDialogProps) {
  const [tempSlotDuration, setTempSlotDuration] = useState(slotDuration)
  const [tempMaxBookings, setTempMaxBookings] = useState(maxBookingsPerStudent)
  const [tempStartHour, setTempStartHour] = useState(startHour)
  const [tempEndHour, setTempEndHour] = useState(endHour)
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    // Validate inputs
    if (tempEndHour <= tempStartHour) {
      toast.error('La hora de fin debe ser posterior a la hora de inicio')
      return
    }

    if (tempSlotDuration <= 0) {
      toast.error('La duración del slot debe ser positiva')
      return
    }

    if (tempMaxBookings <= 0) {
      toast.error('El máximo de reservas debe ser positivo')
      return
    }

    if (tempStartHour < 0 || tempStartHour >= 24 || tempEndHour < 0 || tempEndHour > 24) {
      toast.error('Las horas deben estar entre 0 y 23')
      return
    }

    setIsSaving(true)

    try {
      // Si hay una función de guardado externa, la utilizamos
      if (onSave) {
        await onSave({
          slotDuration: tempSlotDuration,
          startHour: tempStartHour,
          endHour: tempEndHour,
          maxBookingsPerStudent: tempMaxBookings,
        })
      } else {
        // De lo contrario, actualizamos el estado local
        setSlotDuration(tempSlotDuration)
        setMaxBookingsPerStudent(tempMaxBookings)
        setStartHour(tempStartHour)
        setEndHour(tempEndHour)
        toast.success('Configuración guardada correctamente')
      }

      setOpen(false)
    } catch (error) {
      console.error('Error al guardar configuración:', error)
      toast.error('Error al guardar configuración')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configuración
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configuración del Calendario</DialogTitle>
          <DialogDescription>
            Configura los ajustes del calendario para los horarios y límites de reserva.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="slotDuration" className="col-span-2">
              Duración del Slot (minutos)
            </Label>
            <Input
              id="slotDuration"
              type="number"
              value={tempSlotDuration}
              onChange={(e) => setTempSlotDuration(Number(e.target.value))}
              min={5}
              max={120}
              step={5}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="maxBookings" className="col-span-2">
              Máx. Reservas por Estudiante
            </Label>
            <Input
              id="maxBookings"
              type="number"
              value={tempMaxBookings}
              onChange={(e) => setTempMaxBookings(Number(e.target.value))}
              min={1}
              max={10}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startHour" className="col-span-2">
              Hora de Inicio
            </Label>
            <div className="col-span-2 flex items-center">
              <Input
                id="startHour"
                type="number"
                value={Math.floor(tempStartHour)}
                onChange={(e) => {
                  const hourValue = Number(e.target.value)
                  const minutes = tempStartHour % 1 === 0.5 ? 0.5 : 0
                  setTempStartHour(hourValue + minutes)
                }}
                min={0}
                max={23}
                className="w-20"
              />
              <span className="mx-2">:</span>
              <select
                value={tempStartHour % 1 === 0.5 ? '30' : '00'}
                onChange={(e) => {
                  const hourPart = Math.floor(tempStartHour)
                  const minutePart = e.target.value === '30' ? 0.5 : 0
                  setTempStartHour(hourPart + minutePart)
                }}
                className="h-10 w-16 rounded-md border border-input bg-background px-3"
              >
                <option value="00">00</option>
                <option value="30">30</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endHour" className="col-span-2">
              Hora de Fin
            </Label>
            <div className="col-span-2 flex items-center">
              <Input
                id="endHour"
                type="number"
                value={Math.floor(tempEndHour)}
                onChange={(e) => {
                  const hourValue = Number(e.target.value)
                  const minutes = tempEndHour % 1 === 0.5 ? 0.5 : 0
                  setTempEndHour(hourValue + minutes)
                }}
                min={0}
                max={23}
                className="w-20"
              />
              <span className="mx-2">:</span>
              <select
                value={tempEndHour % 1 === 0.5 ? '30' : '00'}
                onChange={(e) => {
                  const hourPart = Math.floor(tempEndHour)
                  const minutePart = e.target.value === '30' ? 0.5 : 0
                  setTempEndHour(hourPart + minutePart)
                }}
                className="h-10 w-16 rounded-md border border-input bg-background px-3"
              >
                <option value="00">00</option>
                <option value="30">30</option>
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
