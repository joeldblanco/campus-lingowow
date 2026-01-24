'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/components/ui/sidebar'

const BUILDER_ROUTES = [
  '/admin/courses/',
  '/builder',
  '/admin/exams/edit/',
  '/admin/resources/new',
  '/admin/activities/',
  '/teacher/students/',
  '/teacher/exams/',
]

/**
 * Hook para cerrar automáticamente la sidebar en rutas de builders
 * Restaura el estado anterior al salir de la ruta
 */
export function useAutoCloseSidebar() {
  const { setOpen, open } = useSidebar()
  const previousStateRef = useRef<boolean | null>(null)
  const hasClosedRef = useRef(false)
  const pathname = usePathname()

  useEffect(() => {
    const isBuilderRoute = BUILDER_ROUTES.some((route) => pathname.includes(route))

    if (isBuilderRoute && !hasClosedRef.current) {
      // Guardar estado actual antes de cerrar (solo la primera vez)
      previousStateRef.current = open
      hasClosedRef.current = true
      
      // Cerrar sidebar si está abierta
      if (open) {
        setOpen(false)
      }
    }

    // Cleanup: restaurar estado anterior al desmontar
    return () => {
      if (hasClosedRef.current && previousStateRef.current !== null) {
        setOpen(previousStateRef.current)
        hasClosedRef.current = false
        previousStateRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])
}
