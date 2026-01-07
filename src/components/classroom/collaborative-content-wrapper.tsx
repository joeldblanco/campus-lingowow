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
  const markElementsRef = useRef<HTMLElement[]>([])

  // Find and highlight the selected text using mark elements
  useEffect(() => {
    // Cleanup previous highlights
    markElementsRef.current.forEach(el => {
      const parent = el.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el)
        parent.normalize()
      }
    })
    markElementsRef.current = []

    const container = containerRef.current
    if (!container || !selection.text || selection.text.length < 2) {
      return
    }

    const searchText = selection.text
    
    // Search in the entire container for the text
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script and style elements
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

    // Build full text and find the selection
    let fullText = ''
    const nodeMap: { node: Text; start: number; end: number }[] = []
    
    textNodes.forEach(textNode => {
      const start = fullText.length
      fullText += textNode.textContent || ''
      nodeMap.push({ node: textNode, start, end: fullText.length })
    })

    const matchIndex = fullText.indexOf(searchText)
    if (matchIndex === -1) return

    const matchEnd = matchIndex + searchText.length

    // Find which text nodes contain the match
    nodeMap.forEach(({ node: textNode, start, end }) => {
      if (end <= matchIndex || start >= matchEnd) return // No overlap

      const nodeText = textNode.textContent || ''
      const highlightStart = Math.max(0, matchIndex - start)
      const highlightEnd = Math.min(nodeText.length, matchEnd - start)

      if (highlightStart >= highlightEnd) return

      // Split the text node and wrap the matched part
      const before = nodeText.slice(0, highlightStart)
      const matched = nodeText.slice(highlightStart, highlightEnd)
      const after = nodeText.slice(highlightEnd)

      const parent = textNode.parentNode
      if (!parent) return

      const fragment = document.createDocumentFragment()
      
      if (before) fragment.appendChild(document.createTextNode(before))
      
      const mark = document.createElement('mark')
      mark.textContent = matched
      mark.className = selection.isTeacher 
        ? 'bg-blue-300/70 rounded-sm px-0.5 remote-highlight' 
        : 'bg-green-300/70 rounded-sm px-0.5 remote-highlight'
      mark.style.backgroundColor = selection.isTeacher ? 'rgba(147, 197, 253, 0.7)' : 'rgba(134, 239, 172, 0.7)'
      fragment.appendChild(mark)
      markElementsRef.current.push(mark)
      
      if (after) fragment.appendChild(document.createTextNode(after))

      parent.replaceChild(fragment, textNode)
    })

    return () => {
      // Cleanup on unmount
      markElementsRef.current.forEach(el => {
        const parent = el.parentNode
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el)
          parent.normalize()
        }
      })
      markElementsRef.current = []
    }
  }, [selection, containerRef])

  return null
}
