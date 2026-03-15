'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock } from 'lucide-react'
import React from 'react'

interface ClassroomLayoutProps {
  children: React.ReactNode // This will be the Lesson Content
  videoArea: React.ReactNode // Main video area (large remote + PiP local)
  compactVideoArea?: React.ReactNode // Compact stacked videos for sharing mode
  bottomControls: React.ReactNode // This will be the Control Bar
  sidePanel?: React.ReactNode // Chat / Content side panel
  contentTabs?: React.ReactNode // Tabs for switching between lesson/whiteboard/screenshare
  topBanner?: React.ReactNode // Banner for device errors or notifications
  sharingBanner?: React.ReactNode // Banner showing what's being shared with stop button
  className?: string
  lessonTitle?: string
  timeLeft?: string
  isGracePeriod?: boolean
  isPreClass?: boolean
  isContentSharing?: boolean // When true, content fills main area, videos float top-right
  fullscreenContent?: boolean
}

export function ClassroomLayout({
  children,
  videoArea,
  compactVideoArea,
  bottomControls,
  sidePanel,
  contentTabs,
  topBanner,
  sharingBanner,
  className = '',
  lessonTitle = 'English Lesson',
  timeLeft = '45:00',
  isGracePeriod = false,
  isPreClass = false,
  isContentSharing = false,
  fullscreenContent = false,
}: ClassroomLayoutProps) {

  return (
    <div className={`flex flex-col h-screen bg-[#202124] ${className}`}>
      {/* Top Banner for device errors */}
      {topBanner}

      {/* Minimal Top Bar */}
      <header className="flex-none h-12 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white/90 truncate max-w-[300px]">{lessonTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Timer */}
          <div
            className={`px-3 py-1 rounded-full flex items-center gap-2 font-mono text-sm ${isGracePeriod
                ? 'bg-orange-500/20 text-orange-400'
                : isPreClass
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-white/10 text-white/80'
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}</span>
            {isGracePeriod && <span className="text-xs opacity-80">(extra)</span>}
            {isPreClass && <span className="text-xs opacity-80">(inicia en)</span>}
          </div>

          {/* Content Tabs */}
          {contentTabs}
        </div>
      </header>

      {/* Sharing Banner */}
      {sharingBanner}

      {/* Main Area */}
      <main className="flex-1 overflow-hidden flex relative">
        {isContentSharing ? (
          <>
            {/* Content Sharing Mode: shared content fills main area */}
            <div className="flex-1 flex flex-col min-w-0 p-2">
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden bg-white">
                {fullscreenContent ? (
                  <div className="h-full w-full">{children}</div>
                ) : (
                  <ScrollArea className="h-full w-full">
                    <div className="p-4">{children}</div>
                  </ScrollArea>
                )}
              </div>
            </div>

            {/* Floating compact videos - below header area to avoid overlapping stop-share button */}
            {compactVideoArea && (
              <div className="absolute top-12 right-2 w-[180px] h-[260px] z-20 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                {compactVideoArea}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Normal Mode: videos fill main area */}
            <div className="flex-1 flex flex-col min-w-0 p-2">
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden">
                {videoArea}
              </div>
            </div>
          </>
        )}

        {/* Side Panel: Chat (slides in from right) */}
        <div
          className={`flex-none flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out ${
            sidePanel ? 'w-[380px] opacity-100' : 'w-0 opacity-0'
          }`}
        >
          {sidePanel && (
            <div className="h-full flex flex-col pr-2 py-2 gap-2">
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden">
                {sidePanel}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Control Bar - centered like Google Meet */}
      <footer className="flex-none h-16 px-4 flex items-center justify-between">
        <div className="flex-1" />
        <div className="flex items-center">
          {bottomControls}
        </div>
        <div className="flex-1" />
      </footer>
    </div>
  )
}
