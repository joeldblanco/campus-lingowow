'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCollaboration } from './collaboration-context'
import { RemoteCursor } from './remote-cursor'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown } from 'lucide-react'

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

  // Track text selection - only send when there's actual selected text
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      
      // Only process if there's a non-collapsed selection
      if (!selection || selection.isCollapsed || !containerRef.current) {
        // Don't send deselect - let the remote selection persist
        return
      }

      const range = selection.getRangeAt(0)
      const container = containerRef.current
      
      // Check if selection is within our container
      if (!container.contains(range.commonAncestorContainer)) {
        return
      }

      const selectedText = selection.toString().trim()
      if (!selectedText || selectedText.length < 2) {
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
        text: selectedText,
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
      {remoteSelection && remoteSelection.text && (
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
  const [highlightRects, setHighlightRects] = useState<DOMRect[]>([])
  const [scrollIndicator, setScrollIndicator] = useState<'above' | 'below' | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Find text and calculate highlight rectangles (without modifying DOM)
  useEffect(() => {
    const container = containerRef.current
    if (!container || !selection.text || selection.text.length < 2) {
      setHighlightRects([])
      setScrollIndicator(null)
      return
    }

    const searchText = selection.text
    
    const findTextRange = (): Range | null => {
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement
            if (parent?.tagName === 'SCRIPT' || parent?.tagName === 'STYLE') {
              return NodeFilter.FILTER_REJECT
            }
            return NodeFilter.FILTER_ACCEPT
          }
        }
      )

      const textNodes: Text[] = []
      let node: Node | null
      while ((node = walker.nextNode())) {
        textNodes.push(node as Text)
      }

      let fullText = ''
      const nodeMap: { node: Text; start: number; end: number }[] = []
      
      textNodes.forEach(textNode => {
        const start = fullText.length
        fullText += textNode.textContent || ''
        nodeMap.push({ node: textNode, start, end: fullText.length })
      })

      const matchIndex = fullText.indexOf(searchText)
      if (matchIndex === -1) return null

      const matchEnd = matchIndex + searchText.length

      let startNode: Text | null = null
      let startOffset = 0
      let endNode: Text | null = null
      let endOffset = 0

      for (const { node: textNode, start, end } of nodeMap) {
        if (!startNode && matchIndex >= start && matchIndex < end) {
          startNode = textNode
          startOffset = matchIndex - start
        }
        if (matchEnd > start && matchEnd <= end) {
          endNode = textNode
          endOffset = matchEnd - start
          break
        }
      }

      if (!startNode || !endNode) return null

      const range = document.createRange()
      range.setStart(startNode, startOffset)
      range.setEnd(endNode, endOffset)
      return range
    }

    const updateRects = () => {
      const range = findTextRange()
      if (!range) {
        setHighlightRects([])
        return
      }

      const rects = Array.from(range.getClientRects())
      const containerRect = container.getBoundingClientRect()
      
      const relativeRects = rects.map(rect => 
        new DOMRect(
          rect.left - containerRect.left,
          rect.top - containerRect.top,
          rect.width,
          rect.height
        )
      )

      setHighlightRects(relativeRects)

      // Check visibility for scroll indicator
      if (rects.length > 0) {
        const firstRect = rects[0]
        const viewportHeight = window.innerHeight
        if (firstRect.bottom < 100) {
          setScrollIndicator('above')
        } else if (firstRect.top > viewportHeight - 100) {
          setScrollIndicator('below')
        } else {
          setScrollIndicator(null)
        }
      }
    }

    updateRects()

    // Update on scroll
    const handleScroll = () => updateRects()
    window.addEventListener('scroll', handleScroll, true)
    container.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [selection, containerRef])

  const scrollToHighlight = useCallback(() => {
    if (overlayRef.current && highlightRects.length > 0) {
      overlayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setScrollIndicator(null)
    }
  }, [highlightRects])

  const bgColor = selection.isTeacher 
    ? 'rgba(147, 197, 253, 0.5)' 
    : 'rgba(134, 239, 172, 0.5)'

  return (
    <>
      {/* Highlight overlay rectangles */}
      {highlightRects.map((rect, i) => (
        <div
          key={i}
          ref={i === 0 ? overlayRef : undefined}
          className="absolute pointer-events-none rounded-sm"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            backgroundColor: bgColor,
          }}
        />
      ))}

      {/* Scroll indicator */}
      {scrollIndicator && (
        <button
          onClick={scrollToHighlight}
          className={cn(
            "fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all hover:scale-105",
            selection.isTeacher 
              ? "bg-blue-500 text-white hover:bg-blue-600" 
              : "bg-green-500 text-white hover:bg-green-600",
            scrollIndicator === 'above' ? "top-20" : "bottom-20"
          )}
        >
          {scrollIndicator === 'above' ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          <span>{selection.participantName} seleccionó texto {scrollIndicator === 'above' ? 'arriba' : 'abajo'}</span>
        </button>
      )}
    </>
  )
}
