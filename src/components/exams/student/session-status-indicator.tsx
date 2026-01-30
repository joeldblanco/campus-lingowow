'use client'

import { CloudOff, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionStatusIndicatorProps {
  status: 'active' | 'expired' | 'syncing'
  unsyncedCount?: number
  className?: string
}

export function SessionStatusIndicator({
  status,
  unsyncedCount = 0,
  className,
}: SessionStatusIndicatorProps) {
  if (status === 'active') {
    return null
  }

  const isExpired = status === 'expired'
  const isSyncing = status === 'syncing'

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
        isExpired && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        isSyncing && 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        className
      )}
    >
      {isExpired ? (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Sesión expirada</span>
          {unsyncedCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-red-200 dark:bg-red-800 rounded text-xs font-bold">
              {unsyncedCount} sin sincronizar
            </span>
          )}
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4 animate-pulse" />
          <span>Sincronizando...</span>
        </>
      )}
    </div>
  )
}
