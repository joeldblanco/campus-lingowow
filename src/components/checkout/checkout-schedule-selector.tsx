'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Loader2,
  AlertCircle,
  Calendar,
  Check,
  User,
  X,
  Clock,
  Globe,
  ChevronsUpDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { convertRecurringScheduleToUTC } from '@/lib/utils/date'
import { useTimezone, getTimezoneShortName } from '@/hooks/use-timezone'

interface Teacher {
  id: string
  name: string
  email: string
  image: string | null
  bio: string | null
  rank: {
    name: string
    level: number
  } | null
  availability: Record<string, Array<{ startTime: string; endTime: string }>>
  bookedSlots?: Record<string, Array<{ startTime: string; endTime: string }>>
}

interface ScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface ProrationResult {
  planId: string
  planName: string
  originalPrice: number
  proratedPrice: number
  classesFromNow: number
  totalClassesInFullPeriod: number
  classesPerWeek: number
  periodStart: string
  periodEnd: string
  enrollmentStart: string
  daysRemaining: number
  weeksRemaining: number
  allowProration: boolean
  schedule: ScheduleSlot[]
}

interface CheckoutScheduleSelectorProps {
  planId: string
  courseId: string
  classDuration?: number
  maxClassesPerWeek?: number
  onScheduleSelected: (schedule: ScheduleSlot[], proration: ProrationResult) => void
}

const DAYS_OF_WEEK_MAP: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
}

const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Orden de días para los chips (lunes a domingo)
const WEEKDAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
]

type SlotKey = `${string}-${string}`

// Lista completa de zonas horarias IANA (con fallback si el navegador no la expone)
const intlWithSupported = Intl as unknown as {
  supportedValuesOf?: (key: 'timeZone') => string[]
}
const ALL_TIMEZONES: string[] = intlWithSupported.supportedValuesOf
  ? intlWithSupported.supportedValuesOf('timeZone')
  : [
      'America/Lima',
      'America/Bogota',
      'America/Mexico_City',
      'America/Argentina/Buenos_Aires',
      'America/Santiago',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/Madrid',
      'Europe/London',
      'UTC',
    ]

// Offset GMT de una zona horaria (ej: 'GMT-5')
const getOffset = (timezone: string): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  } catch {
    return 'GMT'
  }
}

// Formatea "09:00" -> "9:00 a. m.", "14:00" -> "2:00 p. m."
const formatTime12 = (time: string): string => {
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function TimezonePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (tz: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="h-8 gap-1.5 font-medium"
        >
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          {getTimezoneShortName(value)} ({getOffset(value)})
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar zona horaria…" />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {ALL_TIMEZONES.map((tz) => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={() => {
                    onChange(tz)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === tz ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="flex-1 truncate">{tz.replace(/_/g, ' ')}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{getOffset(tz)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function CheckoutScheduleSelector({
  planId,
  courseId,
  classDuration = 40,
  maxClassesPerWeek,
  onScheduleSelected,
}: CheckoutScheduleSelectorProps) {
  // Timezone de la sesión (la del usuario suplantado durante impersonación); cae al
  // navegador para invitados. El usuario puede sobreescribirla manualmente abajo.
  const { timezone: sessionTimezone } = useTimezone()
  const [tzOverride, setTzOverride] = useState<string | null>(null)
  const displayTimezone = tzOverride ?? sessionTimezone

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(new Set())

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) ?? null

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/teachers/availability?courseId=${courseId}&timezone=${encodeURIComponent(displayTimezone)}`
      )
      if (!response.ok) throw new Error('Error al cargar profesores')
      const data: Teacher[] = await response.json()
      setTeachers(data)
      // Mantener el profesor elegido si sigue disponible; si no, el primero.
      setSelectedTeacherId((prev) =>
        prev && data.some((t) => t.id === prev) ? prev : (data[0]?.id ?? null)
      )
    } catch (error) {
      console.error('Error fetching teachers:', error)
      toast.error('Error al cargar la disponibilidad de profesores')
    } finally {
      setLoading(false)
    }
  }, [courseId, displayTimezone])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  const classHours = Math.ceil(classDuration / 60)

  // Horas de inicio disponibles para un día (solo bloques reales del profesor, sin reservados)
  const getAvailableTimes = useCallback(
    (dayKey: string): string[] => {
      if (!selectedTeacher) return []
      const ranges = selectedTeacher.availability[dayKey] || []
      const booked = selectedTeacher.bookedSlots?.[dayKey] || []
      const times = new Set<string>()

      for (const range of ranges) {
        const [startHour] = range.startTime.split(':').map(Number)
        const [endHour] = range.endTime.split(':').map(Number)
        for (let h = startHour; h + classHours <= endHour; h++) {
          const isBooked = booked.some((b) => {
            const [bs] = b.startTime.split(':').map(Number)
            const [be] = b.endTime.split(':').map(Number)
            return h >= bs && h < be
          })
          if (!isBooked) times.add(`${String(h).padStart(2, '0')}:00`)
        }
      }

      return Array.from(times).sort()
    },
    [selectedTeacher, classHours]
  )

  const toggleSlot = (slotKey: SlotKey) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev)
      if (next.has(slotKey)) {
        next.delete(slotKey)
      } else {
        const max = maxClassesPerWeek || Infinity
        if (next.size >= max) {
          toast.error(`Máximo ${maxClassesPerWeek} clases por semana permitidas`)
          return prev
        }
        next.add(slotKey)
      }
      return next
    })
  }

  const selectTeacher = (teacherId: string) => {
    setSelectedTeacherId(teacherId)
    setSelectedSlots(new Set())
  }

  const handleTimezoneChange = (tz: string) => {
    setTzOverride(tz)
    // Las horas mostradas cambian de marco: limpiar la selección anterior.
    setSelectedSlots(new Set())
  }

  const endTimeFor = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number)
    const total = hours * 60 + minutes + classDuration
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const getWeeklySchedule = (): ScheduleSlot[] => {
    if (!selectedTeacher) return []
    return Array.from(selectedSlots).map((slotKey) => {
      const [day, time] = slotKey.split('-')
      const utcSchedule = convertRecurringScheduleToUTC(
        DAYS_OF_WEEK_MAP[day],
        time,
        endTimeFor(time),
        displayTimezone
      )
      return {
        teacherId: selectedTeacher.id,
        dayOfWeek: utcSchedule.dayOfWeek,
        startTime: utcSchedule.startTime,
        endTime: utcSchedule.endTime,
      }
    })
  }

  const handleConfirmSchedule = async () => {
    if (!selectedTeacher || selectedSlots.size === 0) {
      toast.error('Debes seleccionar al menos un horario')
      return
    }
    if (maxClassesPerWeek && selectedSlots.size !== maxClassesPerWeek) {
      toast.error(`Debes seleccionar exactamente ${maxClassesPerWeek} clases por semana`)
      return
    }

    try {
      setCalculating(true)
      const schedule = getWeeklySchedule()
      const response = await fetch('/api/plans/calculate-proration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, schedule }),
      })
      if (!response.ok) throw new Error('Error al calcular prorrateo')
      const proration: ProrationResult = await response.json()
      onScheduleSelected(schedule, proration)
      toast.success('Horario seleccionado correctamente')
    } catch (error) {
      console.error('Error calculating proration:', error)
      toast.error('Error al calcular el prorrateo')
    } finally {
      setCalculating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Cargando disponibilidad de profesores…</p>
      </div>
    )
  }

  if (teachers.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hay profesores disponibles para este curso en este momento.
        </AlertDescription>
      </Alert>
    )
  }

  const daysWithAvailability = WEEKDAYS.map((d) => ({ ...d, times: getAvailableTimes(d.key) })).filter(
    (d) => d.times.length > 0
  )

  return (
    <div className="space-y-6">
      {/* Selección de Profesor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Seleccionar Profesor
          </CardTitle>
          <CardDescription>Elige el profesor que impartirá tus clases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className={cn(
                  'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all',
                  selectedTeacherId === teacher.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'hover:border-muted-foreground/50'
                )}
                onClick={() => selectTeacher(teacher.id)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={teacher.image || undefined} />
                  <AvatarFallback>{teacher.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{teacher.name}</span>
                    {selectedTeacherId === teacher.id && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  {teacher.bio && (
                    <p className="text-sm text-muted-foreground truncate">{teacher.bio}</p>
                  )}
                </div>
                {teacher.rank && (
                  <Badge variant="secondary" className="flex-shrink-0">
                    {teacher.rank.name}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selección de Horario por chips */}
      {selectedTeacher && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Seleccionar Horario
              </div>
              {maxClassesPerWeek && (
                <Badge variant={selectedSlots.size >= maxClassesPerWeek ? 'default' : 'secondary'}>
                  {selectedSlots.size} / {maxClassesPerWeek} clases
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Cada clase dura {classDuration} minutos.
              {maxClassesPerWeek && ` Selecciona exactamente ${maxClassesPerWeek} por semana.`} Las
              clases requieren al menos 8 horas de anticipación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Cabecera: zona horaria autodetectada + cambio manual */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border bg-muted/30 px-3 py-2.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Horarios en tu zona:</span>
              <TimezonePicker value={displayTimezone} onChange={handleTimezoneChange} />
              <span className="text-xs text-muted-foreground">
                ¿No es tu zona horaria? Tócala para cambiarla y los horarios se ajustan al instante.
              </span>
            </div>

            {/* Días con sus bloques disponibles */}
            {daysWithAvailability.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Este profesor no tiene horarios disponibles. Prueba con otro profesor.
              </p>
            ) : (
              <div className="space-y-4">
                {daysWithAvailability.map(({ key, label, times }) => (
                  <div key={key}>
                    <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
                    <div className="flex flex-wrap gap-2">
                      {times.map((time) => {
                        const slotKey = `${key}-${time}` as SlotKey
                        const isSelected = selectedSlots.has(slotKey)
                        return (
                          <button
                            key={slotKey}
                            type="button"
                            onClick={() => toggleSlot(slotKey)}
                            aria-pressed={isSelected}
                            className={cn(
                              'rounded-lg border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-primary/50 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                            )}
                          >
                            {formatTime12(time)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedSlots.size > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {selectedSlots.size} horario(s) por semana
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedSlots(new Set())}>
                  <X className="mr-1 h-4 w-4" />
                  Limpiar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumen de Selección */}
      {selectedSlots.size > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tu Horario Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from(selectedSlots)
                .sort()
                .map((slotKey) => {
                  const [day, time] = slotKey.split('-')
                  return (
                    <div
                      key={slotKey}
                      className="flex items-center justify-between rounded-lg border p-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{DAY_NAMES_ES[DAYS_OF_WEEK_MAP[day]]}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatTime12(time)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleSlot(slotKey as SlotKey)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botón Confirmar */}
      {selectedSlots.size > 0 && (
        <div className="space-y-2">
          {maxClassesPerWeek && selectedSlots.size !== maxClassesPerWeek && (
            <p className="text-center text-sm text-amber-600 dark:text-amber-400">
              Debes seleccionar exactamente {maxClassesPerWeek} clases ({selectedSlots.size}{' '}
              seleccionadas)
            </p>
          )}
          <Button
            onClick={handleConfirmSchedule}
            disabled={calculating || (maxClassesPerWeek ? selectedSlots.size !== maxClassesPerWeek : false)}
            className="w-full"
            size="lg"
          >
            {calculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculando precio…
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirmar Horario
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
