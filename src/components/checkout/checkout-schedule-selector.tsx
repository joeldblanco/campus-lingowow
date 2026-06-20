'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  rank: { name: string; level: number } | null
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

interface ScheduleParams {
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

// "09:00" -> "9:00 a. m.", "14:00" -> "2:00 p. m."
const formatTime12 = (time: string): string => {
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function TimezonePicker({ value, onChange }: { value: string; onChange: (tz: string) => void }) {
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

/**
 * Estado compartido de la selección de horario. La página llama este hook una vez
 * y reparte las dos vistas en columnas distintas:
 *  - <ScheduleTeacherList state={...}/>  (columna izquierda)
 *  - <ScheduleAvailability state={...}/> (columna derecha, sustituye al Resumen)
 */
export function useScheduleSelection(params: ScheduleParams | null) {
  const { timezone: sessionTimezone } = useTimezone()
  const [tzOverride, setTzOverride] = useState<string | null>(null)
  const displayTimezone = tzOverride ?? sessionTimezone

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(new Set())

  // params cambia de identidad cada render; lo guardamos en ref para confirm/planId.
  const paramsRef = useRef(params)
  paramsRef.current = params

  const courseId = params?.courseId ?? null
  const classDuration = params?.classDuration ?? 40
  const maxClassesPerWeek = params?.maxClassesPerWeek
  const classHours = Math.ceil(classDuration / 60)

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) ?? null

  const fetchTeachers = useCallback(async () => {
    if (!courseId) {
      setTeachers([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const response = await fetch(
        `/api/teachers/availability?courseId=${courseId}&timezone=${encodeURIComponent(displayTimezone)}`
      )
      if (!response.ok) throw new Error('Error al cargar profesores')
      const data: Teacher[] = await response.json()
      setTeachers(data)
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

  const daysWithAvailability = useMemo(() => {
    if (!selectedTeacher) return [] as Array<{ key: string; label: string; times: string[] }>
    return WEEKDAYS.map((d) => {
      const ranges = selectedTeacher.availability[d.key] || []
      const booked = selectedTeacher.bookedSlots?.[d.key] || []
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
      return { ...d, times: Array.from(times).sort() }
    }).filter((d) => d.times.length > 0)
  }, [selectedTeacher, classHours])

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

  const clearSlots = () => setSelectedSlots(new Set())

  const selectTeacher = (teacherId: string) => {
    setSelectedTeacherId(teacherId)
    setSelectedSlots(new Set())
  }

  const handleTimezoneChange = (tz: string) => {
    setTzOverride(tz)
    setSelectedSlots(new Set())
  }

  const endTimeFor = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number)
    const total = hours * 60 + minutes + classDuration
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const confirm = async () => {
    const current = paramsRef.current
    if (!selectedTeacher || selectedSlots.size === 0 || !current) {
      toast.error('Debes seleccionar al menos un horario')
      return
    }
    if (maxClassesPerWeek && selectedSlots.size !== maxClassesPerWeek) {
      toast.error(`Debes seleccionar exactamente ${maxClassesPerWeek} clases por semana`)
      return
    }
    const schedule: ScheduleSlot[] = Array.from(selectedSlots).map((slotKey) => {
      const [day, time] = slotKey.split('-')
      const utc = convertRecurringScheduleToUTC(
        DAYS_OF_WEEK_MAP[day],
        time,
        endTimeFor(time),
        displayTimezone
      )
      return {
        teacherId: selectedTeacher.id,
        dayOfWeek: utc.dayOfWeek,
        startTime: utc.startTime,
        endTime: utc.endTime,
      }
    })
    try {
      setCalculating(true)
      const response = await fetch('/api/plans/calculate-proration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: current.planId, schedule }),
      })
      if (!response.ok) throw new Error('Error al calcular prorrateo')
      const proration: ProrationResult = await response.json()
      current.onScheduleSelected(schedule, proration)
      toast.success('Horario seleccionado correctamente')
    } catch (error) {
      console.error('Error calculating proration:', error)
      toast.error('Error al calcular el prorrateo')
    } finally {
      setCalculating(false)
    }
  }

  return {
    loading,
    teachers,
    selectedTeacherId,
    selectedTeacher,
    selectTeacher,
    displayTimezone,
    handleTimezoneChange,
    daysWithAvailability,
    selectedSlots,
    toggleSlot,
    clearSlots,
    calculating,
    confirm,
    classDuration,
    maxClassesPerWeek,
  }
}

export type ScheduleSelectionState = ReturnType<typeof useScheduleSelection>

/** Columna izquierda: lista de profesores. */
export function ScheduleTeacherList({ state }: { state: ScheduleSelectionState }) {
  const { loading, teachers, selectedTeacherId, selectTeacher } = state

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mb-3 h-7 w-7 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Cargando profesores…</p>
      </div>
    )
  }

  if (teachers.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No hay profesores disponibles para este curso.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <User className="h-4 w-4" />
        Seleccionar Profesor
      </div>
      <div className="grid grid-cols-1 gap-3">
        {teachers.map((teacher) => (
          <button
            key={teacher.id}
            type="button"
            onClick={() => selectTeacher(teacher.id)}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
              selectedTeacherId === teacher.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'hover:border-muted-foreground/50'
            )}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={teacher.image || undefined} />
              <AvatarFallback>{teacher.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{teacher.name}</span>
                {selectedTeacherId === teacher.id && (
                  <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                )}
              </div>
              {teacher.bio && (
                <p className="truncate text-sm text-muted-foreground">{teacher.bio}</p>
              )}
            </div>
            {teacher.rank && (
              <Badge variant="secondary" className="flex-shrink-0">
                {teacher.rank.name}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Columna derecha: disponibilidad del profesor elegido + confirmar. */
export function ScheduleAvailability({ state }: { state: ScheduleSelectionState }) {
  const {
    loading,
    selectedTeacher,
    displayTimezone,
    handleTimezoneChange,
    daysWithAvailability,
    selectedSlots,
    toggleSlot,
    clearSlots,
    calculating,
    confirm,
    classDuration,
    maxClassesPerWeek,
  } = state

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="mb-3 h-7 w-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Cargando disponibilidad…</p>
          </div>
        ) : !selectedTeacher ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Elige un profesor para ver su disponibilidad.
          </p>
        ) : daysWithAvailability.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Este profesor no tiene horarios disponibles. Prueba con otro profesor.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {daysWithAvailability.map(({ key, label, times }) => (
              <div key={key} className="flex min-w-[112px] flex-1 flex-col gap-2">
                <p className="border-b pb-2 text-center text-sm font-semibold text-foreground">
                  {label}
                </p>
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
                        'rounded-lg border px-2 py-1.5 text-center text-sm font-medium tabular-nums transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                      )}
                    >
                      {formatTime12(time)}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Resumen de la selección */}
        {selectedSlots.size > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{selectedSlots.size} horario(s) por semana</span>
              </div>
              <Button variant="outline" size="sm" onClick={clearSlots}>
                <X className="mr-1 h-4 w-4" />
                Limpiar
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
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
                        <p className="text-xs tabular-nums text-muted-foreground">
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
            {maxClassesPerWeek && selectedSlots.size !== maxClassesPerWeek && (
              <p className="text-center text-sm text-amber-600 dark:text-amber-400">
                Debes seleccionar exactamente {maxClassesPerWeek} clases ({selectedSlots.size}{' '}
                seleccionadas)
              </p>
            )}
            <Button
              onClick={confirm}
              disabled={
                calculating || (maxClassesPerWeek ? selectedSlots.size !== maxClassesPerWeek : false)
              }
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
      </CardContent>
    </Card>
  )
}
