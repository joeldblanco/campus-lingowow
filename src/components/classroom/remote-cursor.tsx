'use client'

import { useCollaboration } from './collaboration-context'
import { cn } from '@/lib/utils'

interface RemoteCursorProps {
  containerRef: React.RefObject<HTMLDivElement>
}

export function RemoteCursor({ containerRef }: RemoteCursorProps) {
  const { remoteCursor } = useCollaboration()

  if (!remoteCursor || !containerRef.current) return null

  const containerRect = containerRef.current.getBoundingClientRect()
  
  // Convert percentage back to pixels
  const x = (remoteCursor.x / 100) * containerRect.width
  const y = (remoteCursor.y / 100) * containerRect.height

  return (
    <div
      className="pointer-events-none absolute z-50 transition-all duration-75 ease-out"
      style={{
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className={cn(
          "drop-shadow-md",
          remoteCursor.isTeacher ? "text-blue-500" : "text-green-500"
        )}
      >
        <path
          d="M5.65376 12.4563L5.65376 5.65376L12.4563 5.65376L5.65376 12.4563Z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1.5"
        />
        <path
          d="M5.65376 5.65376L12.4563 12.4563"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      
      {/* Name label */}
      <div
        className={cn(
          "absolute left-4 top-4 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap shadow-lg",
          remoteCursor.isTeacher ? "bg-blue-500" : "bg-green-500"
        )}
      >
        {remoteCursor.participantName}
      </div>
    </div>
  )
}
