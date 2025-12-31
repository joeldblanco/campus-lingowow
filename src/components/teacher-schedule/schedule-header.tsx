'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CalendarPlus, X, Save, Rows3, Rows4 } from 'lucide-react'
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ScheduleViewType } from '@/types/schedule'

interface ScheduleHeaderProps {
  currentDate: Date
  viewType: ScheduleViewType
  onDateChange: (date: Date) => void
  onViewChange: (view: ScheduleViewType) => void
  onSetAvailability?: () => void
  lessonsCount?: number
  // Edit mode props
  isEditMode?: boolean
  onSaveChanges?: () => void
  onDiscardChanges?: () => void
  isSaving?: boolean
  // Compact mode props
  isCompact?: boolean
  onToggleCompact?: () => void
}

export function ScheduleHeader({
  currentDate,
  viewType,
  onDateChange,
  onViewChange,
  onSetAvailability,
  lessonsCount,
  isEditMode = false,
  onSaveChanges,
  onDiscardChanges,
  isSaving = false,
  isCompact = false,
  onToggleCompact,
}: ScheduleHeaderProps) {
  const goToToday = () => onDateChange(new Date())

  const goToPrevious = () => {
    switch (viewType) {
      case 'day':
        onDateChange(addDays(currentDate, -1))
        break
      case 'week':
        onDateChange(addWeeks(currentDate, -1))
        break
      case 'month':
        onDateChange(addMonths(currentDate, -1))
        break
    }
  }

  const goToNext = () => {
    switch (viewType) {
      case 'day':
        onDateChange(addDays(currentDate, 1))
        break
      case 'week':
        onDateChange(addWeeks(currentDate, 1))
        break
      case 'month':
        onDateChange(addMonths(currentDate, 1))
        break
    }
  }

  const getDateDisplay = () => {
    switch (viewType) {
      case 'day':
        return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        return `${format(weekStart, 'd', { locale: es })} - ${format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}`
      }
      case 'month':
        return format(currentDate, "MMMM yyyy", { locale: es })
    }
  }

  const getSubtitle = () => {
    switch (viewType) {
      case 'day':
        return lessonsCount !== undefined ? `${lessonsCount} clases programadas` : undefined
      case 'week':
      case 'month':
        return 'Zona horaria: America/Lima (GMT-5)'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-72 flex-col gap-1">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground">
            {isEditMode ? 'Configurar Disponibilidad' : 'Horario del Profesor'}
          </h1>
          <p className="text-muted-foreground text-base font-normal">
            {isEditMode 
              ? 'Define tu horario semanal y los slots disponibles para reservas.'
              : viewType === 'day' 
                ? `Vista Diaria - ${format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}`
                : 'Administra tus clases, asistencia y disponibilidad.'
            }
          </p>
        </div>
        <div className="flex gap-3">
          {isEditMode ? (
            <>
              <Button variant="outline" onClick={onDiscardChanges} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                <span className="truncate">Descartar</span>
              </Button>
              <Button onClick={onSaveChanges} disabled={isSaving} className="shadow-md">
                <Save className="mr-2 h-4 w-4" />
                <span className="truncate">{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </Button>
            </>
          ) : (
            <Button onClick={onSetAvailability} className="shadow-md">
              <CalendarPlus className="mr-2 h-4 w-4" />
              <span className="truncate">Configurar Disponibilidad</span>
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-sm border md:flex-row md:items-center md:justify-between">
        {/* Date Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-lg border bg-background p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="px-3 h-8 text-sm font-bold"
              onClick={goToToday}
            >
              Hoy
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground capitalize">
              {getDateDisplay()}
            </span>
            {getSubtitle() && (
              <span className="text-xs font-medium text-muted-foreground">
                {getSubtitle()}
              </span>
            )}
          </div>
        </div>

        {/* View Switcher and Compact Toggle */}
        <div className="flex items-center gap-2">
          {/* Compact Toggle */}
          {(viewType === 'week' || isEditMode) && onToggleCompact && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={onToggleCompact}
              title={isCompact ? 'Vista normal' : 'Vista compacta'}
            >
              {isCompact ? <Rows4 className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
            </Button>
          )}
          
          {/* View Switcher */}
          {!isEditMode && (
            <div className="flex h-10 items-center rounded-lg bg-muted p-1">
              {(['day', 'week', 'month'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => onViewChange(view)}
                  className={`h-full px-4 flex items-center justify-center rounded-md text-sm font-medium transition-all ${
                    viewType === view
                      ? 'bg-background shadow-sm text-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {view === 'day' ? 'Día' : view === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
