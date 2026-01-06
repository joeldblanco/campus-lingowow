'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DateRangePickerProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  className?: string
}

export function DateRangePicker({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const presets = [
    {
      label: 'Últimos 7 días',
      getValue: () => {
        const to = new Date()
        const from = new Date()
        from.setDate(from.getDate() - 7)
        return { from, to }
      },
    },
    {
      label: 'Últimos 30 días',
      getValue: () => {
        const to = new Date()
        const from = new Date()
        from.setDate(from.getDate() - 30)
        return { from, to }
      },
    },
    {
      label: 'Este mes',
      getValue: () => {
        const now = new Date()
        const from = new Date(now.getFullYear(), now.getMonth(), 1)
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return { from, to }
      },
    },
    {
      label: 'Mes anterior',
      getValue: () => {
        const now = new Date()
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const to = new Date(now.getFullYear(), now.getMonth(), 0)
        return { from, to }
      },
    },
    {
      label: 'Últimos 3 meses',
      getValue: () => {
        const to = new Date()
        const from = new Date()
        from.setMonth(from.getMonth() - 3)
        return { from, to }
      },
    },
    {
      label: 'Este año',
      getValue: () => {
        const now = new Date()
        const from = new Date(now.getFullYear(), 0, 1)
        const to = new Date()
        return { from, to }
      },
    },
    {
      label: 'Año anterior',
      getValue: () => {
        const now = new Date()
        const from = new Date(now.getFullYear() - 1, 0, 1)
        const to = new Date(now.getFullYear() - 1, 11, 31)
        return { from, to }
      },
    },
  ]

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd MMM yyyy', { locale: es })} -{' '}
                  {format(date.to, 'dd MMM yyyy', { locale: es })}
                </>
              ) : (
                format(date.from, 'dd MMM yyyy', { locale: es })
              )
            ) : (
              <span>Seleccionar rango de fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r p-2">
              <div className="px-2 py-1.5 text-sm font-semibold">Presets</div>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-normal"
                  onClick={() => {
                    onDateChange(preset.getValue())
                    setIsOpen(false)
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="p-2">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={onDateChange}
                numberOfMonths={2}
                locale={es}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface TimeFrameSelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TimeFrameSelector({
  value,
  onChange,
  className,
}: TimeFrameSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('w-[180px]', className)}>
        <SelectValue placeholder="Período" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="week">Esta semana</SelectItem>
        <SelectItem value="month">Este mes</SelectItem>
        <SelectItem value="quarter">Este trimestre</SelectItem>
        <SelectItem value="year">Este año</SelectItem>
        <SelectItem value="custom">Personalizado</SelectItem>
      </SelectContent>
    </Select>
  )
}
