'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
 * Selección de horario "time-first": el alumno elige sus bloques semanales sobre la
 * disponibilidad COMBINADA de todos los profesores del curso, y el sistema asigna un
 * único profesor que cubra todos los bloques (regla: un solo profe por alumno).
 * Los bloques que ningún profesor elegible cubre quedan deshabilitados.
 */
export function CheckoutScheduleSelector({
  planId,
  courseId,
  classDuration = 40,
  maxClassesPerWeek,
  onScheduleSelected,
}: CheckoutScheduleSelectorProps) {
  const { timezone: sessionTimezone } = useTimezone()
  const [tzOverride, setTzOverride] = useState<string | null>(null)
  const displayTimezone = tzOverride ?? sessionTimezone

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(new Set())
  const [assignedTeacherId, setAssignedTeacherId] = useState<string | null>(null)
  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false)

  const classHours = Math.ceil(classDuration / 60)

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/teachers/availability?courseId=${courseId}&timezone=${encodeURIComponent(displayTimezone)}`
      )
      if (!response.ok) throw new Error('Error al cargar disponibilidad')
      const data: Teacher[] = await response.json()
      setTeachers(data)
    } catch (error) {
      console.error('Error fetching availability:', error)
      toast.error('Error al cargar la disponibilidad')
    } finally {
      setLoading(false)
    }
  }, [courseId, displayTimezone])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  // Disponibilidad combinada: dayKey -> time -> set de profesores que cubren ese bloque.
  const availability = useMemo(() => {
    const map = new Map<string, Map<string, Set<string>>>()
    for (const teacher of teachers) {
      for (const day of WEEKDAYS) {
        const ranges = teacher.availability[day.key] || []
        const booked = teacher.bookedSlots?.[day.key] || []
        for (const range of ranges) {
          const [startHour] = range.startTime.split(':').map(Number)
          const [endHour] = range.endTime.split(':').map(Number)
          for (let h = startHour; h + classHours <= endHour; h++) {
            const isBooked = booked.some((b) => {
              const [bs] = b.startTime.split(':').map(Number)
              const [be] = b.endTime.split(':').map(Number)
              return h >= bs && h < be
            })
            if (isBooked) continue
            const time = `${String(h).padStart(2, '0')}:00`
            if (!map.has(day.key)) map.set(day.key, new Map())
            const dayMap = map.get(day.key)!
            if (!dayMap.has(time)) dayMap.set(time, new Set())
            dayMap.get(time)!.add(teacher.id)
          }
        }
      }
    }
    return map
  }, [teachers, classHours])

  const daysWithSlots = useMemo(
    () =>
      WEEKDAYS.map((d) => ({
        ...d,
        times: Array.from(availability.get(d.key)?.keys() ?? []).sort(),
      })).filter((d) => d.times.length > 0),
    [availability]
  )

  const coverOf = useCallback(
    (slotKey: string): Set<string> => {
      const [day, time] = slotKey.split('-')
      return availability.get(day)?.get(time) ?? new Set<string>()
    },
    [availability]
  )

  // Profesores que pueden cubrir TODOS los bloques elegidos (intersección).
  const eligibleTeacherIds = useMemo(() => {
    if (selectedSlots.size === 0) return teachers.map((t) => t.id)
    let inter: Set<string> | null = null
    for (const key of selectedSlots) {
      const cover = coverOf(key)
      if (inter === null) {
        inter = new Set(cover)
      } else {
        const reduced = new Set<string>()
        for (const id of inter) {
          if (cover.has(id)) reduced.add(id)
        }
        inter = reduced
      }
    }
    return inter ? Array.from(inter) : []
  }, [selectedSlots, coverOf, teachers])

  const eligibleKey = eligibleTeacherIds.join(',')

  // Mantener un profesor asignado válido (dentro de los elegibles).
  useEffect(() => {
    setAssignedTeacherId((prev) =>
      prev && eligibleTeacherIds.includes(prev) ? prev : (eligibleTeacherIds[0] ?? null)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleKey])

  const assignedTeacher = teachers.find((t) => t.id === assignedTeacherId) ?? null
  const eligibleTeachers = teachers.filter((t) => eligibleTeacherIds.includes(t.id))

  // Feedback en vivo: cuántos profesores pueden cubrir TODO lo elegido + qué falta.
  const compatibleCount = selectedSlots.size === 0 ? teachers.length : eligibleTeacherIds.length
  const remaining = maxClassesPerWeek ? Math.max(0, maxClassesPerWeek - selectedSlots.size) : null
  const guidance =
    remaining === null
      ? null
      : remaining > 0
        ? selectedSlots.size === 0
          ? `Elige ${remaining} clase${remaining > 1 ? 's' : ''}`
          : `Elige ${remaining} clase${remaining > 1 ? 's' : ''} compatible${remaining > 1 ? 's' : ''} más`
        : 'Horario completo'

  const eligibleSet = useMemo(() => new Set(eligibleTeacherIds), [eligibleKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Un bloque es seleccionable si, junto a lo ya elegido, sigue existiendo un profe que cubra todo.
  const isSelectable = useCallback(
    (slotKey: string): boolean => {
      if (selectedSlots.has(slotKey as SlotKey)) return true
      const cover = coverOf(slotKey)
      if (cover.size === 0) return false
      if (selectedSlots.size === 0) return true
      for (const t of cover) if (eligibleSet.has(t)) return true
      return false
    },
    [selectedSlots, coverOf, eligibleSet]
  )

  const toggleSlot = (slotKey: SlotKey) => {
    if (selectedSlots.has(slotKey)) {
      setSelectedSlots((prev) => {
        const next = new Set(prev)
        next.delete(slotKey)
        return next
      })
      return
    }
    const max = maxClassesPerWeek || Infinity
    if (selectedSlots.size >= max) {
      toast.error(`Máximo ${maxClassesPerWeek} clases por semana permitidas`)
      return
    }
    if (!isSelectable(slotKey)) {
      toast.error('Ese horario lo cubre otro profesor. Quita algún bloque o elige otra hora.')
      return
    }
    setSelectedSlots((prev) => new Set(prev).add(slotKey))
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
    if (selectedSlots.size === 0 || !assignedTeacherId) {
      toast.error('Debes seleccionar al menos un horario')
      return
    }
    if (maxClassesPerWeek && selectedSlots.size !== maxClassesPerWeek) {
      toast.error(`Debes seleccionar exactamente ${maxClassesPerWeek} clases por semana`)
      return
    }
    // Un solo profesor para todos los bloques.
    const schedule: ScheduleSlot[] = Array.from(selectedSlots).map((slotKey) => {
      const [day, time] = slotKey.split('-')
      const utc = convertRecurringScheduleToUTC(
        DAYS_OF_WEEK_MAP[day],
        time,
        endTimeFor(time),
        displayTimezone
      )
      return {
        teacherId: assignedTeacherId,
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
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Cargando disponibilidad…</p>
      </div>
    )
  }

  if (teachers.length === 0 || daysWithSlots.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hay horarios disponibles para este curso en este momento.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Elige tus horarios
          </div>
          {maxClassesPerWeek && (
            <Badge variant={selectedSlots.size >= maxClassesPerWeek ? 'default' : 'secondary'}>
              {selectedSlots.size} / {maxClassesPerWeek} clases
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Cada clase dura {classDuration} minutos.
          {maxClassesPerWeek && ` Selecciona exactamente ${maxClassesPerWeek} por semana.`} Te
          asignamos un profesor que cubra todos tus horarios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Zona horaria */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border bg-muted/30 px-3 py-2.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Horarios en tu zona:</span>
          <TimezonePicker value={displayTimezone} onChange={handleTimezoneChange} />
          <span className="text-xs text-muted-foreground">
            ¿No es tu zona horaria? Tócala para cambiarla y los horarios se ajustan al instante.
          </span>
        </div>

        {/* Feedback en vivo: profesores compatibles + qué falta */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{compatibleCount}</span>{' '}
            {compatibleCount === 1 ? 'profesor puede' : 'profesores pueden'} cubrir tu horario
          </span>
          {guidance && (
            <span className={cn('font-medium', remaining === 0 ? 'text-green-600' : 'text-primary')}>
              {guidance}
            </span>
          )}
        </div>

        {/* Profesor asignado (cuando ya hay selección) */}
        {selectedSlots.size > 0 && assignedTeacher && (
          <div className="flex items-center justify-between rounded-lg border bg-primary/5 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={assignedTeacher.image || undefined} />
                <AvatarFallback>{assignedTeacher.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">Tu profesor</p>
                <p className="text-sm font-medium">{assignedTeacher.name}</p>
              </div>
            </div>
            {eligibleTeachers.length > 1 && (
              <Popover open={teacherPickerOpen} onOpenChange={setTeacherPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    Cambiar profesor
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-1" align="end">
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">
                    Disponibles para tus horarios
                  </p>
                  {eligibleTeachers.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setAssignedTeacherId(t.id)
                        setTeacherPickerOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                        t.id === assignedTeacherId && 'bg-muted'
                      )}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={t.image || undefined} />
                        <AvatarFallback>{t.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{t.name}</span>
                      {t.rank && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t.rank.name}
                        </Badge>
                      )}
                      {t.id === assignedTeacherId && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {/* Días en eje X con chips de hora (envuelven, sin scroll horizontal) */}
        <div className="flex flex-wrap gap-3">
          {daysWithSlots.map(({ key, label, times }) => (
            <div key={key} className="flex min-w-[120px] flex-1 basis-[120px] flex-col gap-2">
              <p className="border-b pb-2 text-center text-sm font-semibold text-foreground">
                {label}
              </p>
              {times.map((time) => {
                const slotKey = `${key}-${time}` as SlotKey
                const isSelected = selectedSlots.has(slotKey)
                const selectable = isSelectable(slotKey)
                return (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => toggleSlot(slotKey)}
                    disabled={!selectable}
                    aria-pressed={isSelected}
                    className={cn(
                      'rounded-lg border px-2 py-1.5 text-center text-sm font-medium tabular-nums transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : selectable
                          ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                          : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-600'
                    )}
                    title={!selectable ? 'Otro profesor — no compatible con tu selección actual' : undefined}
                  >
                    {formatTime12(time)}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Resumen + confirmar */}
        {selectedSlots.size > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{selectedSlots.size} horario(s) por semana</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedSlots(new Set())}>
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
