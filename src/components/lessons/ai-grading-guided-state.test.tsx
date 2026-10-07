import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EssayAIGrading } from './essay-ai-grading'
import { RecordingAIGrading } from './recording-ai-grading'
import { canUseAIGrading, recordAIGradingUsage } from '@/lib/actions/ai-grading-limits'

vi.mock('@/lib/actions/ai-grading-limits', () => ({
  canUseAIGrading: vi.fn(),
  recordAIGradingUsage: vi.fn(),
}))
vi.mock('@/components/exams/essay-feedback-display', () => ({
  EssayFeedbackDisplay: () => <div>Essay feedback</div>,
}))
vi.mock('@/components/lessons/recording-feedback-display', () => ({
  RecordingFeedbackDisplay: () => <div>Recording feedback</div>,
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const gradingResult = {
  pointsEarned: 72,
  feedback: 'Good work',
  transcription: 'A short answer',
  detailedResult: {},
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.mocked(canUseAIGrading).mockResolvedValue({ allowed: true, remaining: 5, limit: 10 })
  vi.mocked(recordAIGradingUsage).mockResolvedValue({ success: true })
})

describe('AI grading guided completion callbacks', () => {
  it('keeps the classic essay label while reporting a successful guided grade', async () => {
    const onGraded = vi.fn()
    const onStateChange = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ gradingResult }),
      })
    )

    render(
      <EssayAIGrading
        essayText="This is a complete essay with enough words."
        prompt="Write a paragraph."
        onGraded={onGraded}
        onGradingStateChange={onStateChange}
      />
    )

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => expect(onGraded).toHaveBeenCalledWith(gradingResult))
    expect(onStateChange).toHaveBeenCalledWith('loading')
    expect(onStateChange).toHaveBeenLastCalledWith('success')
  })

  it('reports essay grading errors without reporting a grade', async () => {
    const onGraded = vi.fn()
    const onStateChange = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'failed' }),
      })
    )

    render(
      <EssayAIGrading
        essayText="This is a complete essay with enough words."
        prompt="Write a paragraph."
        onGraded={onGraded}
        onGradingStateChange={onStateChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => expect(onStateChange).toHaveBeenLastCalledWith('error'))
    expect(onGraded).not.toHaveBeenCalled()
  })

  it('reports recording completion only after successful correction', async () => {
    const onGraded = vi.fn()
    const onStateChange = vi.fn()
    const audioResponse = {
      ok: true,
      blob: async () => new Blob(['audio'], { type: 'audio/webm' }),
    }
    const gradingResponse = {
      ok: true,
      json: async () => ({ gradingResult }),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(audioResponse).mockResolvedValueOnce(gradingResponse))

    render(
      <RecordingAIGrading
        audioUrl="/recording.webm"
        instruction="Introduce yourself."
        onGraded={onGraded}
        onGradingStateChange={onStateChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Obtener Retroalimentación' }))

    await waitFor(() => expect(onGraded).toHaveBeenCalledWith(gradingResult))
    expect(onStateChange).toHaveBeenCalledWith('loading')
    expect(onStateChange).toHaveBeenLastCalledWith('success')
  })
})
