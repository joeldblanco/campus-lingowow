'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCalendarSettings, updateCalendarSettings } from '@/lib/actions/calendar'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import { redirect } from 'next/navigation'

export function CalendarSettingsView() {
  const { data: session } = useSession()
  const [startHour, setStartHour] = useState(8)
  const [endHour, setEndHour] = useState(16.5)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar que el usuario sea admin
  useEffect(() => {
    if (session && !session.user?.roles.includes(UserRole.ADMIN)) {
      redirect('/dashboard')
    }
  }, [session])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getCalendarSettings()
        if (result.success && result.data) {
          setStartHour(result.data.startHour)
          setEndHour(result.data.endHour)
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error)
        toast.error('Error al cargar la configuración')
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    // Validar inputs
    if (endHour <= startHour) {
      toast.error('La hora de fin debe ser posterior a la hora de inicio')
      return
    }

    if (startHour < 0 || startHour >= 24 || endHour < 0 || endHour > 24) {
      toast.error('Las horas deben estar entre 0 y 23')
      return
    }

    setIsSaving(true)

    try {
      const result = await updateCalendarSettings({
        startHour,
        endHour,
      })

      if (result.success) {
        toast.success('Configuración guardada correctamente')
      } else {
        toast.error(result.error || 'Error al guardar configuración')
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error)
      toast.error('Error al guardar configuración')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3">Cargando configuración...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración del Calendario</h2>
        <p className="text-muted-foreground">
          Configura los ajustes globales del calendario para profesores y estudiantes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajustes del Calendario</CardTitle>
          <CardDescription>Estos ajustes afectan a todos los usuarios del sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startHour" className="col-span-2">
                Hora de Inicio
              </Label>
              <div className="col-span-2 flex items-center">
                <Input
                  id="startHour"
                  type="number"
                  value={Math.floor(startHour)}
                  onChange={(e) => {
                    const hourValue = Number(e.target.value)
                    const minutes = startHour % 1 === 0.5 ? 0.5 : 0
                    setStartHour(hourValue + minutes)
                  }}
                  min={0}
                  max={23}
                  className="w-20"
                />
                <span className="mx-2">:</span>
                <select
                  value={startHour % 1 === 0.5 ? '30' : '00'}
                  onChange={(e) => {
                    const hourPart = Math.floor(startHour)
                    const minutePart = e.target.value === '30' ? 0.5 : 0
                    setStartHour(hourPart + minutePart)
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
                  value={Math.floor(endHour)}
                  onChange={(e) => {
                    const hourValue = Number(e.target.value)
                    const minutes = endHour % 1 === 0.5 ? 0.5 : 0
                    setEndHour(hourValue + minutes)
                  }}
                  min={0}
                  max={23}
                  className="w-20"
                />
                <span className="mx-2">:</span>
                <select
                  value={endHour % 1 === 0.5 ? '30' : '00'}
                  onChange={(e) => {
                    const hourPart = Math.floor(endHour)
                    const minutePart = e.target.value === '30' ? 0.5 : 0
                    setEndHour(hourPart + minutePart)
                  }}
                  className="h-10 w-16 rounded-md border border-input bg-background px-3"
                >
                  <option value="00">00</option>
                  <option value="30">30</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
