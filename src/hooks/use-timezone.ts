'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { updateUserTimezone } from '@/lib/actions/user-timezone'

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
 * de lo contrario usa la zona horaria del navegador.
 * 
 * Si el usuario está autenticado y la timezone del navegador difiere
 * de la almacenada en la DB, se actualiza automáticamente la DB.
 */
export function useTimezone(): TimezoneInfo {
  const { data: session, status } = useSession()
  const hasSyncedRef = useRef(false)
  
  // Usar estado para timezone del navegador para evitar SSR hydration mismatch
  // Se inicializa con null y se actualiza en cliente después de la hidratación
  const [browserTimezone, setBrowserTimezone] = useState<string | null>(null)
  
  useEffect(() => {
    setBrowserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])
  
  // La timezone final: de la sesión si existe, sino del navegador, sino fallback
  const timezone = session?.user?.timezone || browserTimezone || 'America/Lima'
  
  // Auto-sincronizar timezone con la DB si difiere del navegador
  // NO sincronizar si el usuario está siendo impersonado (para no cambiar la timezone del usuario real)
  useEffect(() => {
    const syncTimezone = async () => {
      // Solo sincronizar si:
      // 1. El usuario está autenticado
      // 2. La sesión ya cargó
      // 3. No hemos sincronizado ya en esta sesión
      // 4. browserTimezone ya se cargó (no es null)
      // 5. La timezone de la DB EXISTE y difiere del navegador
      // 6. NO es una sesión de impersonación
      if (
        session?.user?.id && 
        status === 'authenticated' && 
        !hasSyncedRef.current &&
        browserTimezone && // Asegurar que browserTimezone ya se cargó
        session.user.timezone && // Asegurar que existe timezone en sesión
        session.user.timezone !== browserTimezone &&
        !session.user.isImpersonating
      ) {
        hasSyncedRef.current = true
        try {
          const result = await updateUserTimezone(browserTimezone)
          if (result.updated) {
            console.log(`Timezone actualizada: ${session.user.timezone} -> ${browserTimezone}`)
          }
        } catch (error) {
          console.error('Error syncing timezone:', error)
        }
      }
    }
    
    syncTimezone()
  }, [session?.user?.id, session?.user?.timezone, session?.user?.isImpersonating, status, browserTimezone])
  
  const timezoneInfo = useMemo(() => {
    const offset = getGMTOffset(timezone)
    const shortName = getTimezoneShortName(timezone)
    
    return {
      timezone,
      offset,
      displayText: `Zona horaria: ${timezone} (${offset})`,
      shortName,
      isLoading: status === 'loading',
    }
  }, [timezone, status])
  
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
