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
    localSelection,
  } = useCollaboration()

  // Track if user is actively selecting (mouse is down) - use ref to avoid re-renders
  // and to access current value in selectionchange callback
  const isSelectingRef = useRef(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Track mouse down/up to know when user is actively selecting
  useEffect(() => {
    const handleMouseDown = () => {
      // Cancel any pending timeout from previous selection
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
        selectionTimeoutRef.current = null
      }
      isSelectingRef.current = true
      setIsSelecting(true)
    }
    const handleMouseUp = () => {
      // Set ref to false immediately so selectionchange can process
      isSelectingRef.current = false
      // Small delay for the UI state to avoid flickering
      selectionTimeoutRef.current = setTimeout(() => setIsSelecting(false), 50)
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }
    }
  }, [])

  // Track text selection - only send when there's actual selected text
  useEffect(() => {
    const handleSelectionChange = () => {
      // Don't process selection changes while user is actively selecting (mouse down)
      // This prevents interference with the native browser selection
      if (isSelectingRef.current) {
        return
      }

      const selection = window.getSelection()

      // Only process if there's a non-collapsed selection
      if (!selection || selection.isCollapsed || !containerRef.current) {
        updateTextSelection(null)
        return
      }

      const range = selection.getRangeAt(0)
      const container = containerRef.current

      // Check if selection is within our container
      // Handle text nodes by checking their parent element
      const nodeToCheck = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? range.commonAncestorContainer.parentElement 
        : range.commonAncestorContainer;
      
      if (!nodeToCheck || !container.contains(nodeToCheck)) {
        updateTextSelection(null)
        return
      }

      const selectedText = selection.toString().trim()
      if (!selectedText || selectedText.length < 1) {
        return
      }

      // Find the block ID from the closest parent with data-block-id
      const blockElement = (range.commonAncestorContainer as Element).closest?.('[data-block-id]')
        || (range.commonAncestorContainer.parentElement as Element)?.closest?.('[data-block-id]')

      const blockId = blockElement?.getAttribute('data-block-id') || 'unknown'

      // Calculate absolute offsets within the container/block
      // This is crucial for multi-line support and avoiding string-matching ambiguity
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

      let currentOffset = 0
      let startOffset = -1
      let endOffset = -1
      let node: Node | null

      while ((node = walker.nextNode())) {
        const length = node.textContent?.length || 0

        // Check if this node contains the start of selection
        if (startOffset === -1 && node === range.startContainer) {
          startOffset = currentOffset + range.startOffset
        }

        // Check if this node contains the end of selection
        if (endOffset === -1 && node === range.endContainer) {
          endOffset = currentOffset + range.endOffset
        }

        currentOffset += length

        if (startOffset !== -1 && endOffset !== -1) break
      }

      if (startOffset !== -1 && endOffset !== -1) {
        updateTextSelection({
          startOffset,
          endOffset,
          blockId,
          text: selectedText,
          participantId: '',
          participantName: '',
          isTeacher: false,
        })
      }
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

      {/* Local selection highlight (persistent) - only show when not actively selecting to avoid interference */}
      {localSelection && !isSelecting && (
        <RemoteSelectionHighlight
          selection={localSelection}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
        />
      )}
    </div>
  )
}

interface RemoteSelectionHighlightProps {
  selection: {
    startOffset: number
    endOffset: number
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

  // Find text and calculate highlight rectangles using absolute offsets
  useEffect(() => {
    const container = containerRef.current
    if (!container || selection.startOffset === undefined || selection.endOffset === undefined) {
      setHighlightRects([])
      setScrollIndicator(null)
      return
    }

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

      let currentOffset = 0
      let startNode: Node | null = null
      let startNodeOffset = 0
      let endNode: Node | null = null
      let endNodeOffset = 0

      let node: Node | null
      while ((node = walker.nextNode())) {
        const length = node.textContent?.length || 0
        const nodeEnd = currentOffset + length

        // Find start node
        if (!startNode && selection.startOffset >= currentOffset && selection.startOffset <= nodeEnd) {
          startNode = node
          startNodeOffset = selection.startOffset - currentOffset
        }

        // Find end node
        if (!endNode && selection.endOffset >= currentOffset && selection.endOffset <= nodeEnd) {
          endNode = node
          endNodeOffset = selection.endOffset - currentOffset
        }

        currentOffset += length

        if (startNode && endNode) break
      }

      if (!startNode || !endNode) return null

      const range = document.createRange()
      try {
        range.setStart(startNode, startNodeOffset)
        range.setEnd(endNode, endNodeOffset)
        return range
      } catch (e) {
        console.error('Error setting range:', e)
        return null
      }
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
