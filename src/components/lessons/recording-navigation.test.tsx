import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'

vi.mock('@/components/lessons/essay-ai-grading', () => ({ EssayAIGrading: () => null }))
vi.mock('@/components/lessons/recording-ai-grading', () => ({ RecordingAIGrading: () => null }))
vi.mock('@/lib/actions/ai-grading-limits', () => ({ canUseAIGrading: vi.fn(), recordAIGradingUsage: vi.fn() }))

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('recording navigation lifecycle', () => {
  it('exposes keyboard controls and reports capture until the recording is finalized', async () => {
    const stopTrack = vi.fn()
    const stream = { getTracks: () => [{ stop: stopTrack }] }
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(stream) } })
    vi.stubGlobal('MediaRecorder', class {
      state = 'inactive'
      ondataavailable: ((event: { data: Blob }) => void) | null = null
      onstop: (() => void) | null = null
      start() { this.state = 'recording' }
      stop() { this.state = 'inactive'; this.onstop?.() }
    })
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:recording') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    const onState = vi.fn()
    render(<BlockPreview block={{ id: 'recording', type: 'recording', order: 0, aiGrading: false }} onRecordingStateChange={onState} />)
    fireEvent.click(screen.getByRole('button', { name: /^Grabar$/ }))
    expect(onState).toHaveBeenCalledWith(true)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Detener grabación' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Detener grabación' }))
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith(false))
    expect(stopTrack).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /^Grabar$/ })).toBeInTheDocument()
  })

  it('releases navigation when microphone permission fails', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) } })
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onState = vi.fn()
    render(<BlockPreview block={{ id: 'recording', type: 'recording', order: 0, aiGrading: false }} onRecordingStateChange={onState} />)
    fireEvent.click(screen.getByRole('button', { name: /^Grabar$/ }))
    await waitFor(() => expect(onState.mock.calls).toEqual([[true], [false]]))
  })
})
