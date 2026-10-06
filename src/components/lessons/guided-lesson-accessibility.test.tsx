import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'

vi.mock('@/lib/actions/ai-grading-limits', () => ({ canUseAIGrading: vi.fn(), recordAIGradingUsage: vi.fn() }))

describe('guided essay field', () => {
  it('uses the authored instruction as the writing field accessible name', () => {
    render(<BlockPreview guidedAppearance block={{ id: 'profile', type: 'essay', order: 0, prompt: 'Write your own profile.', aiGrading: false }} />)
    expect(screen.getByRole('textbox', { name: 'Write your own profile.' })).toBeVisible()
  })
})
