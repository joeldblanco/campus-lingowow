'use client'

import { cn } from '@/lib/utils'
import { UserRole } from '@prisma/client'

interface TimeSlotProps {
  time: string
  isAvailable: boolean
  isBooked: boolean
  userRole: UserRole
  onClick: () => void
  onMouseEnter?: () => void
  onMouseDown?: () => void
  onMouseUp?: () => void
}

export function TimeSlot({
  time,
  isAvailable,
  isBooked,
  userRole,
  onClick,
  onMouseEnter,
  onMouseDown,
  onMouseUp,
}: TimeSlotProps) {
  // Determine the slot status and styling
  const getSlotStatus = () => {
    if (userRole === UserRole.TEACHER) {
      return {
        label: isAvailable ? 'Disponible' : 'No disponible',
        className: cn(
          'flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors',
          isAvailable
            ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50'
            : 'bg-muted hover:bg-muted/80'
        ),
      }
    } else {
      // For students
      if (!isAvailable) {
        return {
          label: 'No disponible',
          className:
            'flex items-center justify-between p-2 rounded-md bg-muted text-muted-foreground',
        }
      } else if (isBooked) {
        return {
          label: 'Reservado',
          className:
            'flex items-center justify-between p-2 rounded-md bg-primary/20 hover:bg-primary/30 cursor-pointer',
        }
      } else {
        return {
          label: 'Disponible',
          className:
            'flex items-center justify-between p-2 rounded-md bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 cursor-pointer',
        }
      }
    }
  }

  const { label, className } = getSlotStatus()

  return (
    <div
      className={`${className} select-none`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      <span>{time}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  )
}
