'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, Clock, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ClassroomLayoutProps {
  children: React.ReactNode // This will be the Lesson Content
  rightSidebar: React.ReactNode // This will be the Video/Chat Sidebar
  bottomControls: React.ReactNode // This will be the Control Bar
  contentTabs?: React.ReactNode // Tabs for switching between lesson/whiteboard/screenshare
  leftSidebar?: React.ReactNode // This will be the Lesson Selector (for teachers)
  className?: string
  lessonTitle?: string
  timeLeft?: string
  onBackClick?: () => void // Callback when back button is clicked
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
  onBackClick
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

        <div className="flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full flex items-center gap-2 font-medium text-sm">
            <Clock className="w-4 h-4" />
            <span>{timeLeft}</span>
          </div>
          <Button variant="ghost" size="icon" className="text-gray-500">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 overflow-hidden p-4 grid grid-cols-12 gap-4">
        {/* Left Panel: Lesson Selector (for teachers) */}
        {leftSidebar && (
          <div className="col-span-2 flex flex-col h-full overflow-hidden">
            {leftSidebar}
          </div>
        )}

        {/* Center Panel: Lesson Content */}
        <div className={`${leftSidebar ? 'col-span-6' : 'col-span-8'} flex flex-col h-full overflow-hidden gap-3`}>
          {/* Content Tabs - Top Right of Center Panel */}
          {contentTabs && (
            <div className="flex-none flex justify-end">
              {contentTabs}
            </div>
          )}
          
          {/* The Card wrapper gives it the white paper look from the design */}
          <Card className="flex-1 h-full shadow-sm border border-gray-100 overflow-hidden bg-white rounded-xl">
            <ScrollArea className="h-full w-full">
              <div className="p-8 h-full">
                {children}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right Panel: Video & Chat */}
        <div className="col-span-4 flex flex-col h-full gap-4 overflow-hidden">
          {rightSidebar}
        </div>
      </main>

      {/* Footer / Floating Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
        {bottomControls}
      </div>
    </div>
  )
}
