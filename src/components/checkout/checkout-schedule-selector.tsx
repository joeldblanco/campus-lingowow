'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  ChevronRight,
  UserRound,
  Sparkles,
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
  // Clases puntuales (p.ej. de prueba) sin horario recurrente: no bloquean el
  // slot semanal, solo se indican al cliente.
  oneOffSlots?: Record<string, Array<{ startTime: string; endTime: string; date: string }>>
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

interface Preset {
  id: string
  teacherId: string
  teacherName: string
  time: string
  days: string[]
  slotKeys: string[]
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
  { key: 'monday', label: 'Lunes', short: 'Lun' },
  { key: 'tuesday', label: 'Martes', short: 'Mar' },
  { key: 'wednesday', label: 'Miércoles', short: 'Mié' },
  { key: 'thursday', label: 'Jueves', short: 'Jue' },
  { key: 'friday', label: 'Viernes', short: 'Vie' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' },
]
const DAY_ORDER = WEEKDAYS.map((d) => d.key)
const DAY_SHORT: Record<string, string> = Object.fromEntries(WEEKDAYS.map((d) => [d.key, d.short]))

type Band = 'manana' | 'tarde' | 'noche'
const BANDS: Array<{ key: Band; label: string }> = [
  { key: 'manana', label: 'Mañana' },
  { key: 'tarde', label: 'Tarde' },
  { key: 'noche', label: 'Noche' },
]
const bandOf = (time: string): Band => {
  const h = parseInt(time, 10)
  return h < 12 ? 'manana' : h < 18 ? 'tarde' : 'noche'
}

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

const formatTime12 = (time: string): string => {
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

// Reparte n días de forma espaciada a lo largo de la semana.
const spreadDays = (days: string[], n: number): string[] => {
  if (days.length <= n) return days.slice(0, n)
  const idx = new Set<number>()
  for (let i = 0; i < n; i++) idx.add(Math.round((i * (days.length - 1)) / (n - 1 || 1)))
  let i = 0
  while (idx.size < n && i < days.length) {
    idx.add(i)
    i++
  }
  return Array.from(idx)
    .sort((a, b) => a - b)
    .slice(0, n)
    .map((j) => days[j])
}

// Rutinas recomendadas (B): hasta 4 paquetes recurrentes que UN profesor cubre,
// misma hora en N días repartidos, priorizando tarde/noche. Heurística sin historial.
const buildPresets = (
  availability: Map<string, Map<string, Set<string>>>,
  teachers: Teacher[],
  maxPerWeek?: number
): Preset[] => {
  if (!maxPerWeek || maxPerWeek < 1) return []
  const pref = (t: string) => {
    const h = parseInt(t, 10)
    if (h >= 18 && h <= 20) return 0
    if (h >= 16 && h < 22) return 1
    if (h >= 8 && h < 12) return 2
    return 3
  }
  const seen = new Set<string>()
  const out: Preset[] = []
  for (const teacher of teachers) {
    const timeToDays = new Map<string, string[]>()
    for (const day of DAY_ORDER) {
      const dayMap = availability.get(day)
      if (!dayMap) continue
      for (const [time, set] of dayMap) {
        if (set.has(teacher.id)) {
          if (!timeToDays.has(time)) timeToDays.set(time, [])
          timeToDays.get(time)!.push(day)
        }
      }
    }
    const candidates = Array.from(timeToDays.entries())
      .filter(([, days]) => days.length >= maxPerWeek)
      .sort((a, b) => pref(a[0]) - pref(b[0]) || a[0].localeCompare(b[0]))
    for (const [time, days] of candidates) {
      const ordered = days.sort((x, y) => DAY_ORDER.indexOf(x) - DAY_ORDER.indexOf(y))
      const chosen = spreadDays(ordered, maxPerWeek)
      if (chosen.length < maxPerWeek) continue
      const slotKeys = chosen.map((d) => `${d}-${time}`)
      const sig = slotKeys.slice().sort().join('|')
      if (seen.has(sig)) continue
      seen.add(sig)
      out.push({
        id: `${teacher.id}-${time}`,
        teacherId: teacher.id,
        teacherName: teacher.name,
        time,
        days: chosen,
        slotKeys,
      })
    }
  }
  return out
    .sort((a, b) => pref(a.time) - pref(b.time) || a.time.localeCompare(b.time))
    .slice(0, 4)
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
  const [showManual, setShowManual] = useState(false)
  const [band, setBand] = useState<Band>('noche')

  // Sparks azules al hacer clic (decorativo, respeta reduce-motion).
  const sparkIdRef = useRef(0)
  const [bursts, setBursts] = useState<
    Array<{ id: number; x: number; y: number; dots: Array<{ tx: number; ty: number }> }>
  >([])
  const spawnBurst = (e: React.MouseEvent) => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      return
    const id = ++sparkIdRef.current
    const dots = Array.from({ length: 8 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5
      const dist = 16 + Math.random() * 12
      return { tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist }
    })
    setBursts((prev) => [...prev, { id, x: e.clientX, y: e.clientY, dots }])
    window.setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 600)
  }

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

  const presets = useMemo(
    () => buildPresets(availability, teachers, maxClassesPerWeek),
    [availability, teachers, maxClassesPerWeek]
  )

  const daysWithSlots = useMemo(
    () =>
      WEEKDAYS.map((d) => ({
        ...d,
        times: Array.from(availability.get(d.key)?.keys() ?? []).sort(),
      })).filter((d) => d.times.length > 0),
    [availability]
  )

  const availableBands = useMemo(
    () =>
      BANDS.filter((b) => daysWithSlots.some((d) => d.times.some((t) => bandOf(t) === b.key))),
    [daysWithSlots]
  )
  const availableBandsKey = availableBands.map((b) => b.key).join(',')

  // Default de banda: preferir Noche > Tarde > Mañana entre las disponibles.
  useEffect(() => {
    if (availableBands.length === 0) return
    setBand((prev) => {
      if (availableBands.some((b) => b.key === prev)) return prev
      return (
        availableBands.find((b) => b.key === 'noche')?.key ??
        availableBands.find((b) => b.key === 'tarde')?.key ??
        availableBands[0].key
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableBandsKey])

  const coverOf = useCallback(
    (slotKey: string): Set<string> => {
      const [day, time] = slotKey.split('-')
      return availability.get(day)?.get(time) ?? new Set<string>()
    },
    [availability]
  )

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

  useEffect(() => {
    setAssignedTeacherId((prev) =>
      prev && eligibleTeacherIds.includes(prev) ? prev : (eligibleTeacherIds[0] ?? null)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleKey])

  const assignedTeacher = teachers.find((t) => t.id === assignedTeacherId) ?? null
  const eligibleTeachers = teachers.filter((t) => eligibleTeacherIds.includes(t.id))
  const eligibleSet = useMemo(() => new Set(eligibleTeacherIds), [eligibleKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mapa `${dayKey}-${HH:00}` -> fecha de una clase puntual. Es la grilla COMBINADA
  // de todos los profes del curso, así que agregamos las puntuales de todos como
  // aviso (no bloquea: una clase puntual en una fecha no ocupa el slot semanal).
  const oneOffByHour = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of teachers) {
      if (!t.oneOffSlots) continue
      for (const [dayKey, slots] of Object.entries(t.oneOffSlots)) {
        for (const s of slots) {
          const [sh] = s.startTime.split(':').map(Number)
          const [eh] = s.endTime.split(':').map(Number)
          for (let h = sh; h < eh; h++) {
            map.set(`${dayKey}-${String(h).padStart(2, '0')}:00`, s.date)
          }
        }
      }
    }
    return map
  }, [teachers])

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

  // Núcleo compartido por el confirmar manual y los presets (B).
  const runProration = async (slotKeys: string[], teacherId: string) => {
    const schedule: ScheduleSlot[] = slotKeys.map((slotKey) => {
      const [day, time] = slotKey.split('-')
      const utc = convertRecurringScheduleToUTC(
        DAYS_OF_WEEK_MAP[day],
        time,
        endTimeFor(time),
        displayTimezone
      )
      return {
        teacherId,
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

  const confirmManual = () => {
    if (selectedSlots.size === 0 || !assignedTeacherId) {
      toast.error('Debes seleccionar al menos un horario')
      return
    }
    if (maxClassesPerWeek && selectedSlots.size !== maxClassesPerWeek) {
      toast.error(`Debes seleccionar exactamente ${maxClassesPerWeek} clases por semana`)
      return
    }
    runProration(Array.from(selectedSlots), assignedTeacherId)
  }

  const applyPreset = (preset: Preset) => {
    setSelectedSlots(new Set(preset.slotKeys as SlotKey[]))
    setAssignedTeacherId(preset.teacherId)
    runProration(preset.slotKeys, preset.teacherId)
  }

  const presetActive = (preset: Preset) =>
    assignedTeacherId === preset.teacherId &&
    preset.slotKeys.length === selectedSlots.size &&
    preset.slotKeys.every((k) => selectedSlots.has(k as SlotKey))

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

  const manualOpen = showManual || presets.length === 0

  return (
    <>
      <style>{`@keyframes lw-spark{from{transform:translate(0,0) scale(1);opacity:1}to{transform:translate(var(--tx),var(--ty)) scale(0.2);opacity:0}}.lw-spark{position:absolute;left:0;top:0;width:6px;height:6px;margin:-3px;border-radius:9999px;background:#137fec;animation:lw-spark 600ms ease-out forwards}`}</style>
      {bursts.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[60]">
          {bursts.map((b) => (
            <div key={b.id} className="absolute" style={{ left: b.x, top: b.y }}>
              {b.dots.map((d, i) => (
                <span
                  key={i}
                  className="lw-spark"
                  style={{ ['--tx']: `${d.tx}px`, ['--ty']: `${d.ty}px` } as React.CSSProperties}
                />
              ))}
            </div>
          ))}
        </div>
      )}
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

          {/* B · Rutinas recomendadas */}
          {presets.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Rutinas recomendadas</p>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Un toque y listo: te asignamos el profesor que cubre todo.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {presets.map((preset) => {
                  const active = presetActive(preset)
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={calculating}
                      onClick={(e) => {
                        spawnBurst(e)
                        applyPreset(preset)
                      }}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors',
                        active
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-slate-200 hover:border-primary/50 hover:bg-primary/5 dark:border-slate-700'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {preset.days.map((d) => DAY_SHORT[d]).join(' · ')}
                        </p>
                        <p className="truncate text-xs tabular-nums text-muted-foreground">
                          {formatTime12(preset.time)} · con {preset.teacherName}
                        </p>
                      </div>
                      {active ? (
                        <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Confirmación compacta cuando se eligió por preset (manual oculto) */}
          {selectedSlots.size > 0 && !manualOpen && assignedTeacher && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
              <Check className="h-4 w-4 flex-shrink-0 text-primary" />
              <span>
                Horario con <span className="font-medium">{assignedTeacher.name}</span>. Revisa el
                total en el resumen.
              </span>
            </div>
          )}

          {/* Toggle a selección manual */}
          {presets.length > 0 && (
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showManual ? 'Ocultar elección manual' : 'Prefiero elegir mis horarios'}
            </button>
          )}

          {/* A + grid manual */}
          {manualOpen && (
            <div className="space-y-5 border-t pt-5">
              {/* Feedback en vivo */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{compatibleCount}</span>{' '}
                  {compatibleCount === 1 ? 'profesor puede' : 'profesores pueden'} cubrir tu horario
                </span>
                {guidance && (
                  <span
                    className={cn('font-medium', remaining === 0 ? 'text-green-600' : 'text-primary')}
                  >
                    {guidance}
                  </span>
                )}
              </div>

              {/* Profesor asignado — altura reservada (sin saltos) */}
              <div className="flex min-h-[60px] items-center justify-between gap-3 rounded-lg border bg-primary/5 px-3 py-2.5">
                {selectedSlots.size > 0 && assignedTeacher ? (
                  <>
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
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                    Te asignaremos un profesor que cubra tus horarios.
                  </div>
                )}
              </div>

              {/* A · Filtro Mañana / Tarde / Noche */}
              {availableBands.length > 1 && (
                <div className="inline-flex rounded-lg border bg-muted/30 p-1">
                  {availableBands.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setBand(b.key)}
                      className={cn(
                        'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                        band === b.key
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              )}

              {oneOffByHour.size > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                  El punto ámbar indica que un profesor tiene una clase puntual ese día y hora (no
                  bloquea tu horario semanal).
                </p>
              )}

              {/* Días en eje X — filtrados por banda; incompatibles desaparecen */}
              <div className="flex flex-wrap">
                {daysWithSlots.map(({ key, label, times }) => {
                  const bandTimes = times.filter((t) => bandOf(t) === band)
                  const dayVisible = bandTimes.some((t) => {
                    const k = `${key}-${t}` as SlotKey
                    return selectedSlots.has(k) || isSelectable(k)
                  })
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex flex-col overflow-hidden transition-all duration-300',
                        dayVisible
                          ? 'mb-3 mr-3 min-w-[120px] flex-1 basis-[120px] opacity-100'
                          : 'mb-0 mr-0 min-w-0 max-w-0 basis-0 opacity-0'
                      )}
                    >
                      <p className="mb-2 border-b pb-2 text-center text-sm font-semibold text-foreground">
                        {label}
                      </p>
                      {bandTimes.map((time) => {
                        const slotKey = `${key}-${time}` as SlotKey
                        const isSelected = selectedSlots.has(slotKey)
                        const selectable = isSelectable(slotKey)
                        const collapsed = !selectable && !isSelected
                        const oneOffDate = oneOffByHour.get(slotKey)
                        return (
                          <div
                            key={slotKey}
                            className={cn(
                              'overflow-hidden transition-all duration-300',
                              collapsed
                                ? 'pointer-events-none mb-0 max-h-0 scale-95 opacity-0'
                                : 'mb-2 max-h-14 opacity-100'
                            )}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                if (!isSelected) spawnBurst(e)
                                toggleSlot(slotKey)
                              }}
                              aria-pressed={isSelected}
                              title={
                                oneOffDate
                                  ? `Un profesor tiene una clase puntual el ${oneOffDate} a esta hora`
                                  : undefined
                              }
                              className={cn(
                                'relative w-full cursor-pointer rounded-lg border px-2 py-1.5 text-center text-sm font-medium tabular-nums transition-all active:scale-95',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                              )}
                            >
                              {formatTime12(time)}
                              {oneOffDate && (
                                <span
                                  className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Resumen + confirmar */}
              {selectedSlots.size > 0 && (
                <div className="space-y-3">
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
                    onClick={confirmManual}
                    disabled={
                      calculating ||
                      (maxClassesPerWeek ? selectedSlots.size !== maxClassesPerWeek : false)
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
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
