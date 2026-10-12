import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import type { EssayBlock } from '@/types/course-builder'
vi.mock('@/lib/actions/ai-grading-limits', () => ({ canUseAIGrading: vi.fn(), recordAIGradingUsage: vi.fn() }))
afterEach(cleanup)
const block: EssayBlock = { id: 'pilot-write', type: 'essay', order: 0, prompt: 'Escribe dos frases con los datos de la tarjeta.', aiGrading: false,
  data: { pilotRevision: 'a1-module1-pilot-v1', teachingRevision: 'a1-teaching-v2', promptPresentedSeparately: true } }
describe('reviewed pilot avoids repeated writing instructions', () => {
  it('keeps the complete accessible textarea label while the introduction supplies visible instructions', () => {
    render(<BlockPreview guidedAppearance block={block} />)
    expect(screen.getByRole('textbox', { name: block.prompt })).toBeVisible()
    expect(screen.getByText(block.prompt!)).toHaveClass('sr-only')
  })
  it('keeps standalone and other course prompts visible', () => {
    const { rerender } = render(<BlockPreview guidedAppearance block={{ ...block, data: { ...block.data, pilotRevision: undefined } }} />)
    expect(screen.getByText(block.prompt!)).not.toHaveClass('sr-only')
    rerender(<BlockPreview block={block} />)
    expect(screen.getByText(block.prompt!)).toBeVisible()
  })
})
