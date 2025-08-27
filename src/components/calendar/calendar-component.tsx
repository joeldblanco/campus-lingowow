'use client'

import { BookingModeToggle } from '@/components/calendar/booking-mode-toggle'
import { DateView } from '@/components/calendar/date-view'
import { SettingsDialog } from '@/components/calendar/settings-dialog'
import { UserRoleToggle } from '@/components/calendar/user-role-toggle'
import { WeeklyView } from '@/components/calendar/weekly-view'
import { WeeklyViewAccordion } from '@/components/calendar/weekly-view-accordion'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  bookClass,
  bulkUpdateAvailability,
  getCalendarSettings,
  getStudentBookings,
  getTeacherAvailability,
  getTeacherBookings,
  updateCalendarSettings,
} from '@/lib/actions/calendar'
import {
  generateTimeSlotWithDuration,
  isSlotAvailableForDuration,
  isSlotOverlappingWithBookings,
} from '@/lib/utils/booking'
import {
  AvailabilityRange,
  isTimeSlotInAnyRange,
  mergeOverlappingRanges,
  splitTimeSlot,
} from '@/lib/utils/calendar'
import { UserRole } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// Tipo para representar un booking
interface Booking {
  id: string
  teacherId: string
  studentId: string
  student?: {
    name: string
    lastName: string
    email: string
    image?: string | null
  }
  day: string
  timeSlot: string
  status: string
}

// Tipo para normalizar la estructura de disponibilidad entre formato DB y componente
interface AvailabilityAction {
  day: string
  timeSlot: string // Ahora esto se usa para extraer start/end time
  available: boolean
}

export function CalendarApp() {
  const [userRole, setUserRole] = useState<UserRole>(UserRole.STUDENT)
  const [slotDuration, setSlotDuration] = useState(30)
  const [maxBookingsPerStudent, setMaxBookingsPerStudent] = useState(3)
  const [startHour, setStartHour] = useState(8)
  const [endHour, setEndHour] = useState(16.5) // 16:30
  const [isDragging, setIsDragging] = useState(false)
  const [currentDragValue, setCurrentDragValue] = useState(false)
  const [showStudentNames, setShowStudentNames] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [saveQueue, setSaveQueue] = useState<AvailabilityAction[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [useAccordion, setUseAccordion] = useState(window?.innerWidth < 768)
  const [modifiedSlots, setModifiedSlots] = useState(new Set())
  const [bookingMode, setBookingMode] = useState<'40min' | '90min'>('40min')
  const { data: session } = useSession()
  const userId = session?.user?.id

  // Estado para almacenar la disponibilidad y las reservas
  const [teacherAvailability, setTeacherAvailability] = useState<
    Record<string, AvailabilityRange[]>
  >({})
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({})
  const [bookings, setBookings] = useState<Booking[]>([])
  const [studentColors, setStudentColors] = useState<Record<string, string>>({})

  // Efecto para cargar la configuración del calendario
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getCalendarSettings()
        if (result.success && result.data) {
          setSlotDuration(result.data.slotDuration)
          setStartHour(result.data.startHour)
          setEndHour(result.data.endHour)
          setMaxBookingsPerStudent(result.data.maxBookingsPerStudent)
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error)
      }
    }

    loadSettings()
  }, [userRole])

  // Efecto para cargar datos según el rol
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        if (!userId) return
        // Cargar disponibilidad del profesor
        const availabilityResult = await getTeacherAvailability(userId)
        if (availabilityResult.success && availabilityResult.data) {
          setTeacherAvailability(availabilityResult.data)
        }

        // Cargar reservas según el rol
        if (userRole === UserRole.TEACHER) {
          const bookingsResult = await getTeacherBookings()
          if (bookingsResult.success && bookingsResult.data) {
            processBookings(bookingsResult.data)
          }
        } else {
          const bookingsResult = await getStudentBookings()
          if (bookingsResult.success && bookingsResult.data) {
            const studentBookings: Record<string, string[]> = {}
            bookingsResult.data.forEach((booking) => {
              if (!studentBookings[booking.day]) {
                studentBookings[booking.day] = []
              }
              studentBookings[booking.day].push(booking.timeSlot)
            })
            setBookedSlots(studentBookings)
            setBookings(bookingsResult.data)
          }
        }
      } catch (error) {
        console.error('Error al cargar datos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Generar colores para estudiantes
    const colorOptions = [
      'bg-purple-200 text-purple-800',
      'bg-blue-200 text-blue-800',
      'bg-green-200 text-green-800',
      'bg-yellow-200 text-yellow-800',
      'bg-orange-200 text-orange-800',
      'bg-red-200 text-red-800',
      'bg-pink-200 text-pink-800',
      'bg-indigo-200 text-indigo-800',
    ]

    // Procesar bookings y asignar colores a estudiantes
    const processBookings = (bookingsData: Booking[]) => {
      const bookingsMap: Record<string, string[]> = {}
      const newStudentColors: Record<string, string> = {}
      let colorIndex = 0

      bookingsData.forEach((booking) => {
        if (booking.student && !newStudentColors[booking.studentId]) {
          newStudentColors[booking.studentId] = colorOptions[colorIndex % colorOptions.length]
          colorIndex++
        }

        if (!bookingsMap[booking.day]) {
          bookingsMap[booking.day] = []
        }
        bookingsMap[booking.day].push(booking.timeSlot)
      })

      setBookedSlots(bookingsMap)
      setBookings(bookingsData)
      setStudentColors(newStudentColors)
    }

    loadData()

    // Revisar tamaño de pantalla para acordeón
    const handleResize = () => {
      setUseAccordion(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [userId, userRole])

  // Guardar cambios de disponibilidad
  const saveAvailabilityChanges = async () => {
    if (saveQueue.length === 0) return

    setIsSaving(true)
    try {
      // Preparar los datos para el envío
      // En lugar de enviar solo los cambios, enviamos todos los slots disponibles
      const availabilityToSend: AvailabilityAction[] = []

      // Para cada día presente en teacherAvailability
      Object.keys(teacherAvailability).forEach((day) => {
        const ranges = teacherAvailability[day] || []

        // Convertir cada rango a slots individuales
        ranges.forEach((range) => {
          const startHour = parseInt(range.startTime.split(':')[0])
          const startMinute = parseInt(range.startTime.split(':')[1])
          const endHour = parseInt(range.endTime.split(':')[0])
          const endMinute = parseInt(range.endTime.split(':')[1])

          let currentHour = startHour
          let currentMinute = startMinute

          // Generar slots para cada intervalo en el rango
          while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
            // Formato de hora actual
            const start = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`

            // Calcular hora final del slot
            let nextHour = currentHour
            let nextMinute = currentMinute + slotDuration

            if (nextMinute >= 60) {
              nextHour += Math.floor(nextMinute / 60)
              nextMinute = nextMinute % 60
            }

            // Formato de la hora final
            const end = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`

            // Añadir slot a la lista
            availabilityToSend.push({
              day,
              timeSlot: `${start}-${end}`,
              available: true,
            })

            // Avanzar al siguiente slot
            currentHour = nextHour
            currentMinute = nextMinute
          }
        })
      })

      // Enviar todos los slots
      const result = await bulkUpdateAvailability(availabilityToSend)

      if (result.success) {
        toast.success('Disponibilidad guardada correctamente')
        setSaveQueue([])
      } else {
        toast.error(result.error || 'Error al guardar disponibilidad')
      }
    } catch (error) {
      console.error('Error al guardar disponibilidad:', error)
      toast.error('Error al guardar cambios')
    } finally {
      setIsSaving(false)
    }
  }

  // Actualizar configuración del calendario
  const updateSettings = async (settings: {
    slotDuration: number
    startHour: number
    endHour: number
    maxBookingsPerStudent: number
  }) => {
    try {
      const result = await updateCalendarSettings(settings)
      if (result.success) {
        setSlotDuration(settings.slotDuration)
        setStartHour(settings.startHour)
        setEndHour(settings.endHour)
        setMaxBookingsPerStudent(settings.maxBookingsPerStudent)
        toast.success('Configuración guardada correctamente')
      } else {
        toast.error(result.error || 'Error al guardar configuración')
      }
    } catch (error) {
      console.error('Error al actualizar configuración:', error)
      toast.error('Error al guardar configuración')
    }
  }

  const handleStartDrag = (day: string, time: string, isAvailable: boolean) => {
    if (userRole !== UserRole.TEACHER) return

    // Limpiamos los slots modificados al iniciar un nuevo arrastre
    setModifiedSlots(new Set())

    // Iniciamos el arrastre
    setIsDragging(true)
    setCurrentDragValue(!isAvailable)

    // Aplicamos el cambio al slot inicial y lo marcamos como modificado
    const slotKey = `${day}-${time}`
    setModifiedSlots(new Set([slotKey]))

    // Aquí también permitimos selección de un solo slot sin arrastre
    handleToggleAvailability(day, time)
  }

  const handleDrag = (day: string, time: string, isAvailable: boolean) => {
    if (!isDragging || userRole !== UserRole.TEACHER) return

    // Verificamos si este slot ya fue modificado en esta operación de arrastre
    const slotKey = `${day}-${time}`
    if (modifiedSlots.has(slotKey)) return

    // Si el estado actual no coincide con lo que queremos aplicar, lo cambiamos
    if ((isAvailable && !currentDragValue) || (!isAvailable && currentDragValue)) {
      // Lo añadimos a la lista de modificados
      setModifiedSlots((prev) => {
        const newSet = new Set(prev)
        newSet.add(slotKey)
        return newSet
      })

      // Aplicamos el cambio directamente en la cola y el estado
      handleToggleSlot(day, time, currentDragValue)
    }
  }

  const handleEndDrag = () => {
    setIsDragging(false)
  }

  // Función que centraliza la lógica de modificación
  const handleToggleSlot = (day: string, time: string, makeAvailable: boolean) => {
    // Actualizamos la cola de cambios
    setSaveQueue((prev) => {
      const index = prev.findIndex((item) => item.day === day && item.timeSlot === time)

      if (index !== -1) {
        // Si existe con el mismo valor, no hacemos nada (mantenemos el cambio)
        if (prev[index].available === makeAvailable) {
          return prev
        }

        // Si existe con valor diferente, actualizamos
        const newQueue = [...prev]
        newQueue[index] = { ...newQueue[index], available: makeAvailable }
        return newQueue
      }

      // Si no existe, añadimos nuevo
      return [...prev, { day, timeSlot: time, available: makeAvailable }]
    })

    // Actualizamos estado local inmediatamente
    setTeacherAvailability((prev) => {
      const dayRanges = [...(prev[day] || [])]
      const [start, end] = splitTimeSlot(time)

      if (!makeAvailable) {
        // En lugar de filtrar rangos completos, modificamos los rangos existentes
        const updatedRanges: AvailabilityRange[] = []

        dayRanges.forEach((range) => {
          // Si el rango contiene el slot a eliminar
          if (range.startTime <= start && range.endTime >= end) {
            // Caso 1: El slot está al inicio del rango
            if (range.startTime === start && range.endTime > end) {
              updatedRanges.push({
                startTime: end,
                endTime: range.endTime,
              })
            }
            // Caso 2: El slot está al final del rango
            else if (range.startTime < start && range.endTime === end) {
              updatedRanges.push({
                startTime: range.startTime,
                endTime: start,
              })
            }
            // Caso 3: El slot está en el medio del rango
            else if (range.startTime < start && range.endTime > end) {
              updatedRanges.push({
                startTime: range.startTime,
                endTime: start,
              })
              updatedRanges.push({
                startTime: end,
                endTime: range.endTime,
              })
            }
            // Caso 4: El slot es exactamente igual al rango - no agregamos nada
          } else {
            // Si el rango no contiene el slot, lo mantenemos sin cambios
            updatedRanges.push(range)
          }
        })

        return {
          ...prev,
          [day]: updatedRanges,
        }
      } else {
        // Agregamos disponibilidad (esto queda igual)
        const newRange = { startTime: start, endTime: end }
        const updatedRanges = [...dayRanges, newRange]
        return {
          ...prev,
          [day]: mergeOverlappingRanges(updatedRanges),
        }
      }
    })
  }

  // handleToggleAvailability para clicks simples
  const handleToggleAvailability = (day: string, time: string) => {
    if (userRole !== UserRole.TEACHER) return

    // Determinamos el estado actual para hacer lo opuesto
    const dayRanges = teacherAvailability[day] || []
    const isAvailable = isTimeSlotInAnyRange(time, dayRanges)

    // Aplicamos el cambio
    handleToggleSlot(day, time, !isAvailable)
  }

  // 3. Modificar la función handleToggleBooking para usar el modo de reserva seleccionado
  const handleToggleBooking = async (day: string, time: string) => {
    if (userRole !== UserRole.STUDENT) return

    // Obtener todos los slots disponibles para este día
    const availableRangesForDay = teacherAvailability[day] || []
    const bookedSlotsForDay = bookedSlots[day] || []

    // Determinar duración en minutos según el modo seleccionado
    const durationMinutes = bookingMode === '40min' ? 40 : 90

    // Verificar si el slot está disponible para la duración solicitada
    if (!isSlotAvailableForDuration(time, availableRangesForDay, durationMinutes)) {
      toast.error('Este horario no está disponible para la duración seleccionada')
      return
    }

    // Crear el time slot con la duración correcta
    const [startTime] = splitTimeSlot(time)
    const timeSlotWithDuration = generateTimeSlotWithDuration(startTime, durationMinutes)

    // Verificar si el slot ya está reservado o se superpone con otras reservas
    if (isSlotOverlappingWithBookings(time, bookedSlotsForDay, durationMinutes)) {
      toast.error('Este horario ya ha sido reservado o se superpone con otra reserva')
      return
    }

    // Check if slot is already booked by this student
    const isBooked = bookedSlots[day]?.includes(time) || false

    if (isBooked) {
      // Cancelar reserva (código existente)
      // ...
    } else {
      // Book the slot with the correct duration
      try {
        const result = await bookClass({
          teacherId: 'current',
          day,
          timeSlot: timeSlotWithDuration, // Usar el time slot con la duración correcta
        })

        if (result.success) {
          setBookedSlots((prev) => {
            const dayBookings = [...(prev[day] || [])]
            return {
              ...prev,
              [day]: [...dayBookings, timeSlotWithDuration].sort(),
            }
          })
          toast.success('Clase reservada correctamente')

          // Recargar bookings para obtener el ID
          const bookingsResult = await getStudentBookings()
          if (bookingsResult.success && bookingsResult.data) {
            setBookings(bookingsResult.data)
          }
        } else {
          if (result.error === `Has alcanzado el límite de ${maxBookingsPerStudent} reservas`) {
            toast.error(`Solo puedes reservar hasta ${maxBookingsPerStudent} slots`)
          } else {
            toast.error(result.error || 'Error al reservar clase')
          }
        }
      } catch (error) {
        console.error('Error al reservar clase:', error)
        toast.error('Error al reservar clase')
      }
    }
  }

  const handleSlotAction = (day: string, time: string) => {
    if (userRole === UserRole.TEACHER) {
      // Para profesores, handleStartDrag ya maneja el click individual
      // así que no necesitamos hacer nada adicional aquí
    } else {
      handleToggleBooking(day, time)
    }
  }

  // Obtener información de estudiante para un slot reservado
  const getStudentInfo = (day: string, timeSlot: string) => {
    const booking = bookings.find((b) => b.day === day && b.timeSlot === timeSlot)
    if (booking && booking.student) {
      return {
        name: `${booking.student.name} ${booking.student.lastName}`.trim(),
        color: studentColors[booking.studentId] || '',
      }
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3">Cargando calendario...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <UserRoleToggle userRole={userRole} setUserRole={setUserRole} />
        <div className="flex flex-col sm:flex-row gap-2">
          {userRole === UserRole.STUDENT && (
            <BookingModeToggle bookingMode={bookingMode} setBookingMode={setBookingMode} />
          )}
          {userRole === UserRole.TEACHER && (
            <div className="flex items-center space-x-2">
              <Switch
                id="show-students"
                checked={showStudentNames}
                onCheckedChange={setShowStudentNames}
              />
              <Label htmlFor="show-students">Ver estudiantes</Label>
            </div>
          )}
          <SettingsDialog
            slotDuration={slotDuration}
            setSlotDuration={setSlotDuration}
            maxBookingsPerStudent={maxBookingsPerStudent}
            setMaxBookingsPerStudent={setMaxBookingsPerStudent}
            startHour={startHour}
            setStartHour={setStartHour}
            endHour={endHour}
            setEndHour={setEndHour}
            onSave={updateSettings}
          />
        </div>
      </div>

      {userRole === UserRole.TEACHER && (
        <div className="flex justify-end">
          <Button
            onClick={saveAvailabilityChanges}
            disabled={isSaving || saveQueue.length === 0}
            className="flex items-center gap-2"
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      )}

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">Vista Semanal</TabsTrigger>
          <TabsTrigger value="date">Vista por Fecha</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly" className="mt-4">
          {useAccordion ? (
            <WeeklyViewAccordion
              userRole={userRole}
              teacherAvailability={teacherAvailability}
              bookedSlots={bookedSlots}
              onSlotAction={handleSlotAction}
              slotDuration={slotDuration}
              startHour={startHour}
              endHour={endHour}
              isDragging={isDragging}
              onStartDrag={handleStartDrag}
              onDrag={handleDrag}
              onEndDrag={handleEndDrag}
              showStudentNames={showStudentNames}
              getStudentInfo={getStudentInfo}
            />
          ) : (
            <WeeklyView
              userRole={userRole}
              teacherAvailability={teacherAvailability}
              bookedSlots={bookedSlots}
              onSlotAction={handleSlotAction}
              slotDuration={slotDuration}
              startHour={startHour}
              endHour={endHour}
              isDragging={isDragging}
              onStartDrag={handleStartDrag}
              onDrag={handleDrag}
              onEndDrag={handleEndDrag}
              showStudentNames={showStudentNames}
              getStudentInfo={getStudentInfo}
            />
          )}
        </TabsContent>
        <TabsContent value="date" className="mt-4">
          <DateView
            userRole={userRole}
            teacherAvailability={teacherAvailability}
            bookedSlots={bookedSlots}
            onSlotAction={handleSlotAction}
            slotDuration={slotDuration}
            startHour={startHour}
            endHour={endHour}
            isDragging={isDragging}
            onStartDrag={handleStartDrag}
            onDrag={handleDrag}
            onEndDrag={handleEndDrag}
            showStudentNames={showStudentNames}
            getStudentInfo={getStudentInfo}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
