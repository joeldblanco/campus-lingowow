'use client'

import { useSession } from 'next-auth/react'
import { useMemo } from 'react'

/**
 * Obtiene el offset GMT de una zona horaria
 * @param timezone - Zona horaria IANA (ej: 'America/Lima')
 * @returns Offset en formato GMT-5 o GMT+2
 */
function getGMTOffset(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    
    const parts = formatter.formatToParts(now)
    const offsetPart = parts.find(part => part.type === 'timeZoneName')
    
    if (offsetPart?.value) {
      // Convertir "GMT-5" o "GMT+5:30" al formato deseado
      return offsetPart.value
    }
    
    return 'GMT'
  } catch {
    return 'GMT'
  }
}

/**
 * Formatea la zona horaria para mostrar al usuario
 * @param timezone - Zona horaria IANA (ej: 'America/Lima')
 * @returns String formateado (ej: 'America/Lima (GMT-5)')
 */
export function formatTimezoneDisplay(timezone: string): string {
  const offset = getGMTOffset(timezone)
  return `${timezone} (${offset})`
}

/**
 * Obtiene el nombre corto de la zona horaria
 * @param timezone - Zona horaria IANA
 * @returns Nombre corto (ej: 'Lima' de 'America/Lima')
 */
export function getTimezoneShortName(timezone: string): string {
  const parts = timezone.split('/')
  return parts[parts.length - 1].replace(/_/g, ' ')
}

export interface TimezoneInfo {
  /** Zona horaria IANA del usuario (ej: 'America/Lima') */
  timezone: string
  /** Offset GMT (ej: 'GMT-5') */
  offset: string
  /** Texto formateado para mostrar (ej: 'Zona horaria: America/Lima (GMT-5)') */
  displayText: string
  /** Nombre corto de la zona (ej: 'Lima') */
  shortName: string
  /** Si está cargando la sesión */
  isLoading: boolean
}

/**
 * Hook para obtener la zona horaria del usuario actual
 * Usa la zona horaria de la sesión si está disponible,
 * de lo contrario usa la zona horaria del navegador
 */
export function useTimezone(): TimezoneInfo {
  const { data: session, status } = useSession()
  
  const timezoneInfo = useMemo(() => {
    // Obtener timezone: primero de la sesión, luego del navegador
    const timezone = session?.user?.timezone || 
      (typeof window !== 'undefined' 
        ? Intl.DateTimeFormat().resolvedOptions().timeZone 
        : 'America/Lima')
    
    const offset = getGMTOffset(timezone)
    const shortName = getTimezoneShortName(timezone)
    
    return {
      timezone,
      offset,
      displayText: `Zona horaria: ${timezone} (${offset})`,
      shortName,
      isLoading: status === 'loading',
    }
  }, [session?.user?.timezone, status])
  
  return timezoneInfo
}

/**
 * Obtiene la zona horaria del navegador (para uso en cliente sin sesión)
 */
export function getBrowserTimezone(): string {
  if (typeof window !== 'undefined') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
  return 'America/Lima'
}
