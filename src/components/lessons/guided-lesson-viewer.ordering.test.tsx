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
    const [checked, setChecked] = useState(false)

    useEffect(() => {
      if (block.type !== 'ordering') return
      onGuidedActionPresence?.(!checked)
      onGuidedCompletionChange?.(checked)
      return () => onGuidedActionPresence?.(false)
    }, [block.type, checked, onGuidedActionPresence, onGuidedCompletionChange])

    if (block.type !== 'ordering') return <p>Next scene</p>

    const action = !checked ? (
      <button type="button" onClick={() => setChecked(true)}>
        Comprobar
      </button>
    ) : null

    return (
      <>
        <p>Ordering block</p>
        {action && (guidedActionTarget ? createPortal(action, guidedActionTarget) : action)}
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

  it('keeps the next-scene action hidden until ordering reports completion', async () => {
    const blocks: Block[] = [
      authoredBlock(
        {
          id: 'ordering',
          type: 'ordering',
          order: 0,
          items: [{ id: 'one', text: 'One', correctPosition: 1 }],
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

    await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument())
  })
})
