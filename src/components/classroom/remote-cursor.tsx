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
      }}
    >
      {/* Cursor SVG - proper pointer cursor shape */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        className="drop-shadow-md"
        style={{ transform: 'translate(-1px, -1px)' }}
      >
        <path
          d="M4 4L4 16L8.5 12.5L11 18L13 17L10.5 11.5L16 11L4 4Z"
          fill={remoteCursor.isTeacher ? "#3b82f6" : "#22c55e"}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      
      {/* Name label */}
      <div
        className={cn(
          "absolute left-5 top-3 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap shadow-lg",
          remoteCursor.isTeacher ? "bg-blue-500" : "bg-green-500"
        )}
      >
        {remoteCursor.participantName}
      </div>
    </div>
  )
}
