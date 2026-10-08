import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Block } from '@/types/course-builder'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import { Unit1Production, isUnit1ProductionBlock } from './unit1-production'
import recordingControlStyles from './unit1-production.module.css'

type EssayGradingProps = {
  label?: string
  disabled?: boolean
  onGraded?: (result: unknown) => void
  onGradingStateChange?: (state: 'loading' | 'success' | 'error') => void
}

type RecordingGradingProps = {
  buttonText?: string
  disabled?: boolean
  onGraded?: (result: unknown) => void
  onGradingStateChange?: (state: 'loading' | 'success' | 'error') => void
}

const essayResult = {
  pointsEarned: 80,
  feedback: 'Good work.',
  detailedResult: {
    score: 80,
    maxScore: 100,
    percentage: 80,
    passed: true,
    feedback: {
      overall: 'Good work.',
      grammar: { score: 20, maxScore: 25, comments: '', corrections: [] },
      vocabulary: { score: 20, maxScore: 25, comments: '', suggestions: [] },
      coherence: { score: 20, maxScore: 25, comments: '' },
      taskCompletion: { score: 20, maxScore: 25, comments: '' },
    },
    wordCount: 16,
    estimatedLevel: 'A1',
    strengths: [],
    areasToImprove: [],
  },
}

vi.mock('@/components/lessons/essay-ai-grading', () => ({
  EssayAIGrading: ({ label = 'Enviar', disabled, onGraded, onGradingStateChange }: EssayGradingProps) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onGradingStateChange?.('success')
        onGraded?.(essayResult)
      }}
    >
      {label}
    </button>
  ),
}))

vi.mock('@/components/lessons/recording-ai-grading', () => ({
  RecordingAIGrading: ({ buttonText = 'Obtener Retroalimentación', disabled, onGraded, onGradingStateChange }: RecordingGradingProps) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onGradingStateChange?.('success')
        onGraded?.({})
      }}
    >
      {buttonText}
    </button>
  ),
}))

vi.mock('@/components/classroom/use-classroom-sync', () => ({
  useClassroomSync: () => ({
    isInClassroom: false,
    isTeacher: false,
    canInteract: false,
    getRemoteNavigation: () => undefined,
    syncBlockNavigation: vi.fn(),
    sendBlockResponse: vi.fn(),
  }),
}))

vi.mock('@/lib/actions/ai-grading-limits', () => ({
  canUseAIGrading: vi.fn(),
  recordAIGradingUsage: vi.fn(),
}))

function sentencesBlock(): Block {
  return {
    id: 'unit1-sentences',
    type: 'essay',
    order: 0,
    prompt: 'Escribe 8 frases con am, is o are.',
    aiGrading: true,
    data: { unit1Role: 'sentences' },
  }
}

function conversationBlock(): Block {
  return {
    id: 'unit1-conversation',
    type: 'recording',
    order: 0,
    instruction: 'Responde y pregunta lo mismo.',
    aiGrading: true,
    data: { unit1Role: 'conversation' },
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Unit 1 production routing', () => {
  it('recognises the four authored production roles and rejects unrelated blocks', () => {
    expect(isUnit1ProductionBlock(sentencesBlock())).toBe(true)
    expect(isUnit1ProductionBlock(conversationBlock())).toBe(true)
    expect(
      isUnit1ProductionBlock({
        id: 'profile',
        type: 'essay',
        order: 0,
        prompt: 'Profile',
        data: { unit1Role: 'profile' },
      })
    ).toBe(true)
    expect(
      isUnit1ProductionBlock({
        id: 'presentation',
        type: 'recording',
        order: 0,
        instruction: 'Presentation',
        data: { unit1Role: 'presentation' },
      })
    ).toBe(true)
    expect(isUnit1ProductionBlock({ id: 'essay', type: 'essay', order: 0, prompt: 'Other' })).toBe(false)
  })
})

describe('Unit 1 sentence production', () => {
  it('keeps eight line answers, gates review until all lines are filled, and reports graded completion', () => {
    const target = document.createElement('div')
    const onCompletion = vi.fn()
    render(
      <Unit1Production
        block={sentencesBlock()}
        guidedActionTarget={target}
        onGuidedCompletionChange={onCompletion}
      />
    )

    expect(screen.getAllByRole('textbox')).toHaveLength(8)
    expect(target.querySelector('button')).toBeDisabled()
    expect(screen.queryByText('Autocorrección disponible')).not.toBeInTheDocument()

    const answers = Array.from({ length: 8 }, (_, index) => `I am line ${index + 1}.`)
    answers.forEach((answer, index) => {
      fireEvent.change(screen.getByRole('textbox', { name: `Frase ${index + 1}` }), {
        target: { value: answer },
      })
    })

    expect(screen.getByText('8/8 frases')).toBeInTheDocument()
    const review = target.querySelector('button') as HTMLButtonElement
    expect(review).toHaveTextContent('Revisar mis frases')
    expect(review).not.toBeDisabled()
    fireEvent.click(review)

    expect(onCompletion).toHaveBeenLastCalledWith(true)
    answers.forEach((answer, index) => {
      expect(screen.getByRole('textbox', { name: `Frase ${index + 1}` })).toHaveValue(answer)
    })
  })

  it('keeps idea help collapsed until the student asks for it', () => {
    render(<Unit1Production block={sentencesBlock()} />)
    expect(screen.queryByRole('list', { name: 'Ideas para tus frases' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver ideas' }))
    expect(screen.getByRole('list', { name: 'Ideas para tus frases' })).toBeVisible()
  })
})

describe('Unit 1 conversation production', () => {
  it('uses the reviewed course scenario and authored turn count in both study modes', () => {
    const block: Block = {
      id: 'unit-two-conversation', type: 'recording', order: 0,
      instruction: 'Introduce yourself to a classmate and discuss your origins.',
      data: {
        learningRevision: 'course-guided-v1', guidedRole: 'conversation',
        turns: [{ id: 'origins', question: 'Where does your family come from?' }],
      },
    }
    render(<Unit1Production block={block} />)
    expect(screen.getByText('Where does your family come from?')).toBeVisible()
    expect(screen.getByText('Turno 1 de 1')).toBeVisible()
    expect(screen.queryByText('What is your name?')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Con mi profesora' }))
    expect(screen.getByText('Where does your family come from?')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Grabar respuesta' })).not.toBeInTheDocument()
  })
  it('offers a teacher mode without recording or automatic grading, with explicit completion', () => {
    const target = document.createElement('div')
    const onCompletion = vi.fn()
    render(
      <Unit1Production
        block={conversationBlock()}
        guidedActionTarget={target}
        onGuidedCompletionChange={onCompletion}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Con mi profesora' }))
    expect(screen.getByText('Pregunten y respondan por turnos.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Grabar respuesta' })).not.toBeInTheDocument()
    expect(target.querySelector('button')).toHaveTextContent('He practicado')
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(onCompletion).toHaveBeenLastCalledWith(true)
  })

  it('records, submits through the existing grader, and advances one turn at a time', async () => {
    const stopTrack = vi.fn()
    const stream = { getTracks: () => [{ stop: stopTrack }] }
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    })
    vi.stubGlobal(
      'MediaRecorder',
      class {
        state = 'inactive'
        ondataavailable: ((event: { data: Blob }) => void) | null = null
        onstop: (() => void) | null = null

        start() {
          this.state = 'recording'
        }

        stop() {
          this.state = 'inactive'
          this.onstop?.()
        }
      }
    )
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:conversation'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })

    const target = document.createElement('div')
    const onRecordingStateChange = vi.fn()
    const onCompletion = vi.fn()
    render(
      <Unit1Production
        block={conversationBlock()}
        guidedActionTarget={target}
        onRecordingStateChange={onRecordingStateChange}
        onGuidedCompletionChange={onCompletion}
      />
    )

    const recordButton = screen.getByRole('button', { name: 'Grabar respuesta' })
    expect(recordButton).toHaveClass(recordingControlStyles.recordButton)
    expect(recordButton).toHaveAttribute('data-unit1-recording-control', 'circle')
    fireEvent.click(recordButton)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Detener grabación' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Detener grabación' })).toHaveClass(recordingControlStyles.recordButton)
    fireEvent.click(screen.getByRole('button', { name: 'Detener grabación' }))
    await waitFor(() => expect(target.querySelector('button')).toHaveTextContent('Enviar respuesta'))
    expect(onRecordingStateChange).toHaveBeenCalledWith(true)
    expect(onRecordingStateChange).toHaveBeenLastCalledWith(false)

    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(screen.getByText('Turno 2 de 5')).toBeInTheDocument()
    expect(onCompletion).toHaveBeenLastCalledWith(false)
    expect(stopTrack).toHaveBeenCalled()
  })

  it('does not show a play control when a turn has no authored audio source', () => {
    render(<Unit1Production block={conversationBlock()} />)
    expect(screen.queryByRole('button', { name: /reproducir/i })).not.toBeInTheDocument()
  })

  it('revokes local recordings when unmounted', () => {
    const revoke = vi.fn()
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
    const { unmount } = render(<Unit1Production block={conversationBlock()} />)
    unmount()
    expect(revoke).not.toHaveBeenCalled()
  })
})

describe('Unit 1 profile and presentation shared previews', () => {
  it('uses profile-specific cues, a neutral current/max counter, and the review label', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        block={{
          id: 'unit1-profile',
          type: 'essay',
          order: 0,
          prompt: 'Legacy prompt',
          aiGrading: true,
          data: { unit1Role: 'profile' },
        }}
      />
    )

    expect(screen.getByText(/Nombre.*Edad.*Origen/)).toBeInTheDocument()
    expect(screen.getByText(/Ocupación.*Dónde vives/)).toBeInTheDocument()
    expect(screen.getByText('0 / 50 palabras')).toBeInTheDocument()
    expect(screen.queryByText('Autocorrección disponible')).not.toBeInTheDocument()
    expect(target.querySelector('button')).toHaveTextContent('Revisar mi texto')
    expect(target.querySelector('button')).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Ver ejemplo' }))
    expect(screen.getByText(/My name is Sofia/)).toBeVisible()
  })

  it('keeps presentation recording gated behind a real preview and uses its send label', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        block={{
          id: 'unit1-presentation',
          type: 'recording',
          order: 0,
          instruction: 'Graba una presentación de 30–60 segundos.',
          aiGrading: true,
          data: { unit1Role: 'presentation' },
        }}
      />
    )

    expect(screen.getByText('Tu nombre y edad')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Grabar' })).toBeInTheDocument()
    const send = target.querySelector('button') as HTMLButtonElement
    expect(send).toHaveTextContent('Enviar grabación')
    expect(send).toBeDisabled()
  })
})
