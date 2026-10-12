import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Block } from '@/types/course-builder'
import { GuidedLessonViewer } from './guided-lesson-viewer'

vi.mock('next/image', () => ({
  default: () => null,
}))

vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: ({
    block,
    guidedActionTarget,
    onGuidedActionPresence,
    onGuidedCompletionChange,
  }: {
    block: Block
    guidedActionTarget?: HTMLElement | null
    onGuidedActionPresence?: (present: boolean) => void
    onGuidedCompletionChange?: (completed: boolean) => void
  }) => {
    const [items, setItems] = useState(() => {
      if (block.type !== 'ordering') return []
      return [block.items[1], block.items[0], block.items[2]]
    })
    const completed = block.type === 'ordering' && items.length > 0 && items.every((item, index) => item.correctPosition === index + 1)

    useEffect(() => {
      if (block.type !== 'ordering') return
      onGuidedActionPresence?.(!completed)
      onGuidedCompletionChange?.(completed)
      return () => onGuidedActionPresence?.(false)
    }, [block.type, completed, onGuidedActionPresence, onGuidedCompletionChange])

    if (block.type !== 'ordering') return <p>Next scene</p>

    return (
      <>
        <p>Ordering block</p>
        {items.map((item, index) => (
          <div key={item.id} data-testid="viewer-ordering-item" data-viewer-ordering-item={item.id}>
            <span>{item.text}</span>
            {!completed && <>
              <button
                type="button"
                onClick={() => {
                  if (index === 0) return
                  setItems((current) => {
                    const next = [...current]
                    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                    return next
                  })
                }}
                disabled={index === 0}
                aria-label={`Subir ${item.text}`}
              >
                Subir
              </button>
              <button
                type="button"
                onClick={() => {
                  if (index === items.length - 1) return
                  setItems((current) => {
                    const next = [...current]
                    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                    return next
                  })
                }}
                disabled={index === items.length - 1}
                aria-label={`Bajar ${item.text}`}
              >
                Bajar
              </button>
            </>}
          </div>
        ))}
        {!completed && (() => {
          const action = <button type="button">Reiniciar orden</button>
          return guidedActionTarget ? createPortal(action, guidedActionTarget) : action
        })()}
      </>
    )
  },
}))

function authoredBlock(block: Block, sceneId: string): Block {
  return {
    ...block,
    data: {
      ...block.data,
      learningRevision: 'course-guided-v1',
      pilotRevision: 'a1-module1-pilot-v1',
      pilotSceneId: sceneId,
    },
  }
}

describe('GuidedLessonViewer ordering activity', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('does not auto-pass the initial shuffled order and advances after the last move', async () => {
    const blocks: Block[] = [
      authoredBlock(
        {
          id: 'ordering',
          type: 'ordering',
          order: 0,
          items: [
            { id: 'one', text: 'One', correctPosition: 1 },
            { id: 'two', text: 'Two', correctPosition: 2 },
            { id: 'three', text: 'Three', correctPosition: 3 },
          ],
        },
        'ordering-scene'
      ),
      authoredBlock(
        {
          id: 'next',
          type: 'text',
          order: 1,
          content: 'Next scene',
        },
        'next-scene'
      ),
    ]

    render(
      <GuidedLessonViewer
        blocks={blocks}
        storageKey="guided-ordering"
        illustratedContent
      />
    )

    await waitFor(() => expect(screen.getByRole('button', { name: 'Bajar Two' })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Comprobar' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Bajar Two' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument())
  })
})
