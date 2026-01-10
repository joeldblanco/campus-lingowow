'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldAlert, 
  AlertTriangle, 
  Eye, 
  ChevronDown, 
  ChevronUp,
  Monitor,
  Copy,
  MousePointer,
  Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getProctorEvents } from '@/lib/actions/proctoring'

interface ProctorEventsSummaryProps {
  attemptId: string
  compact?: boolean
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  tab_switch: <Monitor className="h-4 w-4" />,
  fullscreen_exit: <Monitor className="h-4 w-4" />,
  copy_attempt: <Copy className="h-4 w-4" />,
  paste_attempt: <Copy className="h-4 w-4" />,
  right_click: <MousePointer className="h-4 w-4" />,
  window_blur: <Eye className="h-4 w-4" />,
  window_focus: <Eye className="h-4 w-4" />,
  fullscreen_enter: <Monitor className="h-4 w-4" />,
  exam_start: <Clock className="h-4 w-4" />,
  exam_submit: <Clock className="h-4 w-4" />
}

export function ProctorEventsSummary({ attemptId, compact = false }: ProctorEventsSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Array<{
    id: string
    eventType: string
    severity: string
    description: string | null
    timestamp: Date
  }>>([])
  const [summary, setSummary] = useState<{
    total: number
    warnings: number
    critical: number
    tabSwitches: number
    fullscreenExits: number
  } | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      const result = await getProctorEvents(attemptId)
      if (result.success) {
        setEvents(result.events || [])
        setSummary(result.summary || null)
      }
      setIsLoading(false)
    }
    fetchEvents()
  }, [attemptId])

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      </div>
    )
  }

  if (!summary || summary.total === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <ShieldAlert className="h-5 w-5" />
          <span className="font-medium">Sin incidentes de proctoring</span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-500 mt-1">
          El estudiante completó el examen sin incidentes detectados.
        </p>
      </div>
    )
  }

  const hasCritical = summary.critical > 0
  const hasWarnings = summary.warnings > 0

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        hasCritical 
          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
          : hasWarnings
            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
            : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
      )}>
        {hasCritical ? (
          <ShieldAlert className="h-3.5 w-3.5" />
        ) : hasWarnings ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
        <span>{summary.total} incidente{summary.total !== 1 ? 's' : ''}</span>
      </div>
    )
  }

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      hasCritical 
        ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
        : "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800"
    )}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasCritical ? (
              <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            )}
            <div>
              <h4 className={cn(
                "font-bold",
                hasCritical ? "text-red-700 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"
              )}>
                {hasCritical ? 'Incidentes Críticos Detectados' : 'Advertencias de Proctoring'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {summary.total} incidente{summary.total !== 1 ? 's' : ''} registrado{summary.total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {summary.critical > 0 && (
              <Badge variant="destructive">{summary.critical} crítico{summary.critical !== 1 ? 's' : ''}</Badge>
            )}
            {summary.warnings > 0 && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                {summary.warnings} advertencia{summary.warnings !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span>Cambios de pestaña: <strong>{summary.tabSwitches}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span>Salidas de fullscreen: <strong>{summary.fullscreenExits}</strong></span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-4 flex items-center justify-center gap-2"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Ocultar Detalles
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Ver Todos los Eventos ({events.length})
            </>
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
          {events.map((event) => (
            <div
              key={event.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0",
                event.severity === 'critical' && "bg-red-50/50 dark:bg-red-900/10"
              )}
            >
              <div className={cn(
                "p-1.5 rounded",
                event.severity === 'critical' 
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                  : event.severity === 'warning'
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500"
              )}>
                {EVENT_ICONS[event.eventType] || <Eye className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.description || event.eventType}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  event.severity === 'critical' && "bg-red-100 text-red-700 border-red-300",
                  event.severity === 'warning' && "bg-yellow-100 text-yellow-700 border-yellow-300"
                )}
              >
                {event.severity}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
