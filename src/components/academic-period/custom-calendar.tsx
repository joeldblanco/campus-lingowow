import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  Locale,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useMemo } from 'react'

export interface CalendarEvent {
  id: string
  title: string
  time: string
  date: Date
}

export interface CalendarModifiers {
  [key: string]: (date: Date) => boolean
}

export interface CalendarModifiersClassNames {
  [key: string]: string
}

export interface CustomCalendarProps {
  month: Date
  selected?: Date
  onSelect?: (date: Date) => void
  onMonthChange?: (date: Date) => void
  modifiers?: CalendarModifiers
  modifiersClassNames?: CalendarModifiersClassNames
  className?: string
  locale?: Locale
  events?: CalendarEvent[]
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  month,
  selected,
  onSelect,
  onMonthChange,
  modifiers = {},
  modifiersClassNames = {},
  className,
  locale = es,
  events = [],
}) => {
  // Obtenemos todos los días del mes actual y los organizamos por semanas
  const calendarWeeks = useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd)

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    // Agrupamos por semanas (arrays de 7 días)
    const weeks = []
    let week = []

    for (const day of days) {
      week.push(day)
      if (week.length === 7) {
        weeks.push(week)
        week = []
      }
    }

    return weeks
  }, [month])

  // Obtener día de la semana como texto
  const getWeekDayName = (index: number) => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    return days[index]
  }

  // Filtrar eventos para una fecha específica
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(event.date, date))
  }

  // Navegación a mes anterior
  const handlePreviousMonth = () => {
    if (onMonthChange) {
      onMonthChange(subMonths(month, 1))
    }
  }

  // Navegación a mes siguiente
  const handleNextMonth = () => {
    if (onMonthChange) {
      onMonthChange(addMonths(month, 1))
    }
  }

  // Determinar si un día está seleccionado por algún modificador
  const hasModifier = (day: Date, modifierName: string): boolean => {
    return modifiers[modifierName] ? modifiers[modifierName](day) : false
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center p-4">
        <h2 className="text-lg font-medium uppercase">{format(month, 'MMMM yyyy', { locale })}</h2>
        <div className="flex">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
            className="h-8 w-8 p-0 rounded-r-none border-r-0"
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMonthChange && onMonthChange(new Date())}
            className="h-8 px-2 text-sm rounded-r-none rounded-l-none border-x-0"
            type="button"
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0 rounded-l-none border-l-0"
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {Array.from({ length: 7 }).map((_, i) => (
                <th
                  key={i}
                  className="border-b text-sm py-2 text-center font-medium text-muted-foreground w-[14.28571429%]"
                >
                  {getWeekDayName(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendarWeeks.map((week, weekIndex) => (
              <tr key={weekIndex}>
                {week.map((day, dayIndex) => {
                  const isCurrentMonth = isSameMonth(day, month)
                  const isToday = isSameDay(day, new Date())
                  const isSelectedDay = selected && isSameDay(day, selected)
                  const dayEvents = getEventsForDate(day)

                  // Determinar clases CSS para estilos
                  let dayClassName = cn(
                    'relative p-0 h-32 border align-top',
                    !isCurrentMonth && 'text-muted-foreground bg-muted/20',
                    isToday && (modifiersClassNames.today || 'font-medium'),
                    isSelectedDay && 'bg-primary/5'
                  )

                  // Aplicar modificadores personalizados
                  Object.keys(modifiers).forEach((modKey) => {
                    if (hasModifier(day, modKey)) {
                      dayClassName = cn(dayClassName, modifiersClassNames[modKey] || '')
                    }
                  })

                  return (
                    <td key={dayIndex} className={dayClassName}>
                      <button
                        onClick={() => onSelect && onSelect(day)}
                        className={cn(
                          'absolute top-1 left-1 h-6 w-6 text-sm flex items-center justify-center rounded-full',
                          isSelectedDay && 'bg-primary text-primary-foreground'
                        )}
                        type="button"
                        disabled={!onSelect}
                      >
                        {format(day, 'd')}
                      </button>

                      <div className="mt-8 px-1 space-y-1">
                        {dayEvents.map((event, eventIndex) => (
                          <div
                            key={event.id || eventIndex}
                            className="text-xs rounded px-1 py-0.5 truncate"
                          >
                            <span className="font-medium">{event.title}</span>
                            {event.time && (
                              <span className="float-right text-muted-foreground">
                                {event.time}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CustomCalendar
