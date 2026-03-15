'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Monitor, BookOpen, PenTool, X } from 'lucide-react'
import { ContentPicker } from './content-picker'
import { ShareableContent } from '@/lib/actions/classroom'

interface ShareContentPopoverProps {
  isTeacher: boolean
  isOpen: boolean
  onClose: () => void
  onShareScreen: () => void
  onShareContent: (contentId: string, contentType: ShareableContent['type']) => void
  onShareWhiteboard: () => void
  isScreenSharing?: boolean
  someoneElseIsSharing?: boolean
  preloadedContent?: ShareableContent[] | null
}

export function ShareContentPopover({
  isTeacher,
  isOpen,
  onClose,
  onShareScreen,
  onShareContent,
  onShareWhiteboard,
  isScreenSharing = false,
  someoneElseIsSharing = false,
  preloadedContent,
}: ShareContentPopoverProps) {
  const [showContentPicker, setShowContentPicker] = useState(false)

  if (!isOpen) return null

  // Teacher content picker sub-view
  if (showContentPicker && isTeacher) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowContentPicker(false); onClose() }}>
        <div className="bg-[#292a2d] rounded-2xl shadow-2xl w-[700px] max-w-[90vw] flex flex-col overflow-hidden border border-white/10" style={{ height: '80vh' }} onClick={(e) => e.stopPropagation()}>
          {/* Content Picker — fills entire modal, handles its own header and scroll */}
          <div className="flex-1 min-h-0 p-4 overflow-hidden">
            <ContentPicker
              initialContent={preloadedContent}
              onSelect={(contentId, contentType) => {
                onShareContent(contentId, contentType)
                setShowContentPicker(false)
                onClose()
              }}
              onCancel={() => setShowContentPicker(false)}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#292a2d] rounded-2xl shadow-2xl w-[400px] max-w-[90vw] overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Compartir</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2">
          {/* Screen Share - both teacher and student */}
          <button
            onClick={() => {
              onShareScreen()
              onClose()
            }}
            disabled={someoneElseIsSharing}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
              <Monitor className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                {isScreenSharing ? 'Dejar de compartir pantalla' : 'Compartir pantalla'}
              </p>
              <p className="text-xs text-white/50">
                {someoneElseIsSharing
                  ? 'Otro participante ya está compartiendo'
                  : 'Comparte una pestaña, ventana o pantalla completa'}
              </p>
            </div>
            {isScreenSharing && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
            )}
          </button>

          {/* Teacher-only options */}
          {isTeacher && (
            <>
              {/* Lingowow Content */}
              <button
                onClick={() => setShowContentPicker(true)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Contenido de Lingowow</p>
                  <p className="text-xs text-white/50">Comparte lecciones o recursos de la biblioteca</p>
                </div>
              </button>

              {/* Whiteboard */}
              <button
                onClick={() => {
                  onShareWhiteboard()
                  onClose()
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/30 transition-colors">
                  <PenTool className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Pizarra</p>
                  <p className="text-xs text-white/50">Abre una pizarra colaborativa para dibujar y anotar</p>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
