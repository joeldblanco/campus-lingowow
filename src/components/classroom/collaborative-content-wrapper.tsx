'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useCollaboration } from './collaboration-context'
import { RemoteCursor } from './remote-cursor'
import { cn } from '@/lib/utils'

interface CollaborativeContentWrapperProps {
  children: React.ReactNode
  className?: string
}

export function CollaborativeContentWrapper({ 
  children, 
  className 
}: CollaborativeContentWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { 
    updateCursorPosition, 
    updateTextSelection,
    remoteSelection,
  } = useCollaboration()

  // Track mouse movement
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    updateCursorPosition(e.clientX, e.clientY, rect)
  }, [updateCursorPosition])

  // Track mouse leave
  const handleMouseLeave = useCallback(() => {
    // Send cursor leave event - handled by the context
  }, [])

  // Track text selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      
      if (!selection || selection.isCollapsed || !containerRef.current) {
        updateTextSelection(null)
        return
      }

      const range = selection.getRangeAt(0)
      const container = containerRef.current
      
      // Check if selection is within our container
      if (!container.contains(range.commonAncestorContainer)) {
        return
      }

      // Find the block ID from the closest parent with data-block-id
      const blockElement = (range.commonAncestorContainer as Element).closest?.('[data-block-id]') 
        || (range.commonAncestorContainer.parentElement as Element)?.closest?.('[data-block-id]')
      
      const blockId = blockElement?.getAttribute('data-block-id') || 'unknown'

      updateTextSelection({
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        blockId,
        text: selection.toString(),
        participantId: '',
        participantName: '',
        isTeacher: false,
      })
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [updateTextSelection])

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {/* Remote cursor overlay */}
      <RemoteCursor containerRef={containerRef as React.RefObject<HTMLDivElement>} />
      
      {/* Remote selection highlight */}
      {remoteSelection && (
        <RemoteSelectionHighlight 
          selection={remoteSelection} 
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
        />
      )}
    </div>
  )
}

interface RemoteSelectionHighlightProps {
  selection: {
    blockId: string
    text: string
    participantName: string
    isTeacher: boolean
  }
  containerRef: React.RefObject<HTMLDivElement>
}

function RemoteSelectionHighlight({ selection, containerRef }: RemoteSelectionHighlightProps) {
  // Find the block element and highlight the text
  useEffect(() => {
    const container = containerRef.current
    if (!container || !selection.text) return

    const blockElement = container.querySelector(`[data-block-id="${selection.blockId}"]`)
    if (!blockElement) return

    // Create a highlight mark for the selected text
    const walker = document.createTreeWalker(
      blockElement,
      NodeFilter.SHOW_TEXT,
      null
    )

    let node: Node | null
    while ((node = walker.nextNode())) {
      const textContent = node.textContent || ''
      const index = textContent.indexOf(selection.text)
      
      if (index !== -1) {
        // Found the text - we'll use CSS to highlight it
        // For simplicity, we'll add a data attribute to mark it
        const parent = node.parentElement
        if (parent && !parent.classList.contains('remote-selection')) {
          parent.setAttribute('data-remote-selection', 'true')
        }
        break
      }
    }

    return () => {
      // Cleanup
      const marked = container.querySelector('[data-remote-selection]')
      marked?.removeAttribute('data-remote-selection')
    }
  }, [selection, containerRef])

  // Show a floating indicator of what's selected
  if (!selection.text) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2">
      <div 
        className={cn(
          "px-3 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2",
          selection.isTeacher 
            ? "bg-blue-500 text-white" 
            : "bg-green-500 text-white"
        )}
      >
        <span className="font-medium">{selection.participantName}</span>
        <span className="opacity-75">seleccionó:</span>
        <span className="font-mono bg-white/20 px-2 py-0.5 rounded max-w-[200px] truncate">
          &quot;{selection.text}&quot;
        </span>
      </div>
    </div>
  )
}
