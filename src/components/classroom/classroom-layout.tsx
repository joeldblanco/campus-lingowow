'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'

interface ClassroomLayoutProps {
  children: React.ReactNode // This will be the Lesson Content
  rightSidebar: React.ReactNode // This will be the Video/Chat Sidebar
  bottomControls: React.ReactNode // This will be the Control Bar
  contentTabs?: React.ReactNode // Tabs for switching between lesson/whiteboard/screenshare
  leftSidebar?: React.ReactNode // This will be the Lesson Selector (for teachers)
  className?: string
  lessonTitle?: string
  timeLeft?: string
  isGracePeriod?: boolean // Whether the class is in grace period (extra 10 min)
  onBackClick?: () => void // Callback when back button is clicked
  fullscreenContent?: boolean // When true, children render without ScrollArea wrapper (for whiteboard/canvas)
}

export function ClassroomLayout({
  children,
  rightSidebar,
  bottomControls,
  contentTabs,
  leftSidebar,
  className = '',
  lessonTitle = 'English Lesson',
  timeLeft = '45:00',
  isGracePeriod = false,
  onBackClick,
  fullscreenContent = false,
}: ClassroomLayoutProps) {
  const router = useRouter()

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      router.back()
    }
  }

  return (
    <div className={`flex flex-col h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <header className="flex-none h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackClick}
            className="text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-900">{lessonTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Controls in header */}
          {bottomControls}

          {/* Timer */}
          <div
            className={`px-3 py-1.5 rounded-full flex items-center gap-2 font-medium text-sm ${
              isGracePeriod ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{timeLeft}</span>
            {isGracePeriod && <span className="text-xs">(gracia)</span>}
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 overflow-hidden p-4 grid grid-cols-12 gap-4">
        {/* Left Panel: Lesson Selector (for teachers) */}
        {leftSidebar && (
          <div className="col-span-2 flex flex-col h-full overflow-hidden">{leftSidebar}</div>
        )}

        {/* Center Panel: Lesson Content */}
        <div
          className={`${leftSidebar ? 'col-span-6' : 'col-span-8'} flex flex-col h-full overflow-hidden gap-3`}
        >
          {/* Content Tabs - Top Right of Center Panel */}
          {contentTabs && <div className="flex-none flex justify-end">{contentTabs}</div>}

          {/* The Card wrapper gives it the white paper look from the design */}
          <Card className="flex-1 h-full shadow-sm border border-gray-100 overflow-hidden bg-white rounded-xl flex flex-col">
            {fullscreenContent ? (
              <div className="h-full w-full">{children}</div>
            ) : (
              <ScrollArea className="h-full w-full">
                <div className="p-8">{children}</div>
              </ScrollArea>
            )}
          </Card>
        </div>

        {/* Right Panel: Video & Chat */}
        <div className="col-span-4 flex flex-col h-full gap-4 overflow-hidden">{rightSidebar}</div>
      </main>
    </div>
  )
}
