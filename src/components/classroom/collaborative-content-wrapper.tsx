'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCollaboration } from './collaboration-context'
import { RemoteCursor } from './remote-cursor'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, Highlighter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CollaborativeContentWrapperProps {
  children: React.ReactNode
  className?: string
}

interface PendingSelection {
  startOffset: number
  endOffset: number
  blockId: string
  text: string
  rect: { top: number; left: number }
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

  // Pending selection waiting for user to click "Highlight" button
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null)
  
  // Track if user is actively selecting (mouse is down)
  const isSelectingRef = useRef(false)

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
      isSelectingRef.current = true
    }
    const handleMouseUp = () => {
      isSelectingRef.current = false
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Track text selection - store locally but don't send until user clicks Highlight
  useEffect(() => {
    let selectionTimeout: NodeJS.Timeout | null = null

    const handleSelectionChange = () => {
      // Clear any pending timeout
      if (selectionTimeout) {
        clearTimeout(selectionTimeout)
      }

      // Don't show button while user is actively selecting
      if (isSelectingRef.current) {
        return
      }

      // Small delay to ensure mouseup has fired (race condition fix)
      selectionTimeout = setTimeout(() => {
        // Double-check mouse is up
        if (isSelectingRef.current) {
          return
        }

        const selection = window.getSelection()

        // Only process if there's a non-collapsed selection
        if (!selection || selection.isCollapsed || !containerRef.current) {
          setPendingSelection(null)
          return
        }

        const range = selection.getRangeAt(0)
        const container = containerRef.current

        // Check if selection is within our container
        const nodeToCheck = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
          ? range.commonAncestorContainer.parentElement 
          : range.commonAncestorContainer;
        
        if (!nodeToCheck || !container.contains(nodeToCheck)) {
          setPendingSelection(null)
          return
        }

        const selectedText = selection.toString().trim()
        if (!selectedText || selectedText.length < 1) {
          setPendingSelection(null)
          return
        }

        // Find the block ID from the closest parent with data-block-id
        const blockElement = (range.commonAncestorContainer as Element).closest?.('[data-block-id]')
          || (range.commonAncestorContainer.parentElement as Element)?.closest?.('[data-block-id]')

        const blockId = blockElement?.getAttribute('data-block-id') || 'unknown'

        // Calculate absolute offsets within the container
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

          if (startOffset === -1 && node === range.startContainer) {
            startOffset = currentOffset + range.startOffset
          }

          if (endOffset === -1 && node === range.endContainer) {
            endOffset = currentOffset + range.endOffset
          }

          currentOffset += length

          if (startOffset !== -1 && endOffset !== -1) break
        }

        if (startOffset !== -1 && endOffset !== -1) {
          // Get position for the floating button
          const rangeRect = range.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()

          // Calculate button position with boundary checking
          const buttonWidth = 100 // Approximate button width
          const buttonHalfWidth = buttonWidth / 2
          let leftPos = rangeRect.left - containerRect.left + (rangeRect.width / 2)
          
          // Clamp to container bounds
          const minLeft = buttonHalfWidth + 8
          const maxLeft = containerRect.width - buttonHalfWidth - 8
          leftPos = Math.max(minLeft, Math.min(maxLeft, leftPos))

          setPendingSelection({
            startOffset,
            endOffset,
            blockId,
            text: selectedText,
            rect: {
              top: rangeRect.bottom - containerRect.top + 8,
              left: leftPos,
            }
          })
        }
      }, 10) // Small delay to handle race condition
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      if (selectionTimeout) {
        clearTimeout(selectionTimeout)
      }
    }
  }, [])

  // Handle highlight button click
  const handleHighlight = useCallback(() => {
    if (!pendingSelection) return

    updateTextSelection({
      startOffset: pendingSelection.startOffset,
      endOffset: pendingSelection.endOffset,
      blockId: pendingSelection.blockId,
      text: pendingSelection.text,
      participantId: '',
      participantName: '',
      isTeacher: false,
    })

    // Clear the native selection
    window.getSelection()?.removeAllRanges()
    setPendingSelection(null)
  }, [pendingSelection, updateTextSelection])

  // Handle clear highlight
  const handleClearHighlight = useCallback(() => {
    updateTextSelection(null)
    window.getSelection()?.removeAllRanges()
    setPendingSelection(null)
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

      {/* Floating Highlight button - appears when text is selected */}
      {pendingSelection && (
        <div
          className="absolute z-50 -translate-x-1/2 animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: pendingSelection.rect.top,
            left: pendingSelection.rect.left,
          }}
        >
          <Button
            size="sm"
            onClick={handleHighlight}
            className="gap-1.5 shadow-lg bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <Highlighter className="w-3.5 h-3.5" />
            Highlight
          </Button>
        </div>
      )}

      {/* Remote selection highlight */}
      {remoteSelection && (
        <RemoteSelectionHighlight
          selection={remoteSelection}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
        />
      )}

      {/* Local selection highlight (persistent) with clear button */}
      {localSelection && (
        <RemoteSelectionHighlight
          selection={localSelection}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          onClear={handleClearHighlight}
          showClearButton
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
  onClear?: () => void
  showClearButton?: boolean
}

function RemoteSelectionHighlight({ selection, containerRef, onClear, showClearButton }: RemoteSelectionHighlightProps) {
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

      {/* Clear button for local highlight */}
      {showClearButton && onClear && highlightRects.length > 0 && (
        <button
          onClick={onClear}
          className="absolute z-50 p-1 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors"
          style={{
            top: highlightRects[0].top - 12,
            left: highlightRects[0].left + highlightRects[0].width - 4,
          }}
          title="Quitar highlight"
        >
          <X className="w-3 h-3" />
        </button>
      )}

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
