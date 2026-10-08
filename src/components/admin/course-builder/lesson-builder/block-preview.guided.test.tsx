import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BlockPreview,
  GUIDED_MATCH_CORRECT_FEEDBACK_MS,
  GUIDED_MATCH_WRONG_FEEDBACK_MS,
} from './block-preview'
import { ClassroomSyncContext } from '@/components/classroom/use-classroom-sync'

vi.mock('next/image', () => ({
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-src={src} onError={() => onError?.()} />
  ),
}))

vi.mock('@/components/lessons/essay-ai-grading', () => ({
  EssayAIGrading: ({
    label = 'Enviar',
    onGraded,
    onGradingStateChange,
  }: {
    label?: string
    onGraded?: () => void
    onGradingStateChange?: (state: 'loading' | 'success' | 'error') => void
  }) => (
    <button
      type="button"
      onClick={() => {
        onGradingStateChange?.('success')
        onGraded?.()
      }}
    >
      {label}
    </button>
  ),
}))
vi.mock('@/components/lessons/recording-ai-grading', () => ({
  RecordingAIGrading: ({
    onGraded,
    onGradingStateChange,
  }: {
    onGraded?: () => void
    onGradingStateChange?: (state: 'loading' | 'success' | 'error') => void
  }) => (
    <button
      type="button"
      onClick={() => {
        onGradingStateChange?.('success')
        onGraded?.()
      }}
    >
      Obtener Retroalimentación
    </button>
  ),
}))
vi.mock('@/lib/actions/ai-grading-limits', () => ({
  canUseAIGrading: vi.fn(),
  recordAIGradingUsage: vi.fn(),
}))

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('BlockPreview guided appearance', () => {
  it('does not reveal answers or auto-advance in exam mode even with guided appearance', () => {
    vi.useFakeTimers()
    const changed = vi.fn()
    render(<BlockPreview guidedAppearance isExamMode onAnswerChange={changed} answer={{}}
      block={{ id: 'exam', type: 'true_false', order: 0, items: [
        { id: 'first', statement: 'Exam statement.', correctAnswer: true },
        { id: 'second', statement: 'Second exam statement.', correctAnswer: false },
      ] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Verdadero' }))
    expect(changed).toHaveBeenCalledWith({ first: true })
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByText('Exam statement.')).toBeInTheDocument()
    expect(screen.queryByText('Correcta')).not.toBeInTheDocument()
    expect(screen.queryByText('¡Correcto!')).not.toBeInTheDocument()
  })

  it('suppresses repeated labels and titles while preserving authored prompts', () => {
    render(
      <>
        <BlockPreview
          guidedAppearance
          block={{
            id: 'audio',
            type: 'audio',
            order: 0,
            title: 'Listen to the conversation',
            url: '/conversation.mp3',
          }}
        />
        <BlockPreview
          guidedAppearance
          block={{
            id: 'true-false',
            type: 'true_false',
            order: 1,
            title: 'True or false practice',
            items: [{ id: 'statement', statement: 'Lucas lives in Lima.', correctAnswer: true }],
          }}
        />
        <BlockPreview
          guidedAppearance
          block={{ id: 'essay', type: 'essay', order: 2, prompt: 'Write about your routine.' }}
        />
        <BlockPreview
          guidedAppearance
          block={{
            id: 'recording',
            type: 'recording',
            order: 3,
            instruction: 'Record a short introduction.',
            aiGrading: false,
          }}
        />
      </>
    )

    expect(screen.queryByText('Pronunciación')).not.toBeInTheDocument()
    expect(screen.queryByText('Verdadero o Falso')).not.toBeInTheDocument()
    expect(screen.queryByText('True or false practice')).not.toBeInTheDocument()
    expect(screen.queryByText('Ensayo')).not.toBeInTheDocument()
    expect(screen.queryByText('Grabación')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Listen to the conversation' })
    ).not.toBeInTheDocument()

    expect(screen.getByText('Lucas lives in Lima.')).toHaveClass('text-base', 'leading-6')
    expect(screen.getByText('Write about your routine.')).toHaveClass('text-base', 'leading-6')
    expect(screen.getByText('Record a short introduction.')).toHaveClass('text-base', 'leading-6')
    expect(screen.getByRole('button', { name: 'Reproducir audio' })).toBeInTheDocument()
  })

  it('hides the repeated video title in guided mode while keeping the authored thumbnail', () => {
    const video = {
      id: 'video',
      type: 'video' as const,
      order: 0,
      title: 'Watch the conversation about introductions',
      url: 'https://youtu.be/EMWmCb1CIdc',
    }

    const { rerender } = render(<BlockPreview guidedAppearance block={video} />)

    expect(
      screen.queryByRole('heading', { name: 'Watch the conversation about introductions' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Watch the conversation about introductions' })).toHaveAttribute(
      'data-src',
      'https://img.youtube.com/vi/EMWmCb1CIdc/hqdefault.jpg'
    )

    rerender(<BlockPreview block={video} />)
    expect(
      screen.getByRole('heading', { name: 'Watch the conversation about introductions' })
    ).toBeInTheDocument()
  })

  it('keeps the original video URL in an accessible fallback when the thumbnail fails', () => {
    const video = {
      id: 'video-fallback',
      type: 'video' as const,
      order: 0,
      title: 'Watch the conversation about introductions',
      url: 'https://youtu.be/EMWmCb1CIdc',
    }

    render(<BlockPreview guidedAppearance block={video} />)

    fireEvent.error(screen.getByRole('img', { name: video.title }))

    expect(screen.queryByRole('img', { name: video.title })).not.toBeInTheDocument()
    const fallback = screen.getByRole('link', { name: `Abrir video original: ${video.title}` })
    expect(fallback).toHaveAttribute('href', video.url)
    expect(fallback).toHaveAttribute('data-video-thumbnail-fallback', 'true')
    expect(fallback).toHaveTextContent('Abrir video original')
  })

  it('hydrates guided audio duration from an already-loaded media element', () => {
    const durationDescriptor = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      'duration'
    )
    const readyStateDescriptor = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      'readyState'
    )

    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      configurable: true,
      get: () => 24.85,
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      get: () => 1,
    })

    try {
      render(
        <BlockPreview
          guidedAppearance
          block={{ id: 'loaded-audio', type: 'audio', order: 0, url: '/lesson.mp3' }}
        />
      )

      expect(screen.getByText('0:24')).toBeInTheDocument()
    } finally {
      if (durationDescriptor) {
        Object.defineProperty(HTMLMediaElement.prototype, 'duration', durationDescriptor)
      }
      if (readyStateDescriptor) {
        Object.defineProperty(HTMLMediaElement.prototype, 'readyState', readyStateDescriptor)
      }
    }
  })

  it('keeps the default renderer appearance when guided mode is omitted', () => {
    render(
      <BlockPreview
        block={{
          id: 'true-false',
          type: 'true_false',
          order: 0,
          title: 'True or false practice',
          items: [{ id: 'statement', statement: 'Lucas lives in Lima.', correctAnswer: true }],
        }}
      />
    )

    expect(screen.getByText('Verdadero o Falso')).toBeInTheDocument()
    expect(screen.getByText('True or false practice')).toBeInTheDocument()
  })

  it('checks true/false on selection without a footer checking action', () => {
    vi.useFakeTimers()
    const target = document.createElement('div')
    document.body.appendChild(target)
    const presence = vi.fn()
    render(<BlockPreview guidedAppearance guidedActionTarget={target} onGuidedActionPresence={presence}
      block={{ id: 'tf', type: 'true_false', order: 0, items: [
        { id: 'first', statement: 'First statement.', correctAnswer: true },
        { id: 'second', statement: 'Second statement.', correctAnswer: false },
      ] }} />)
    expect(target.querySelector('button')).toBeNull()
    expect(presence).toHaveBeenLastCalledWith(false)
    fireEvent.click(screen.getByRole('button', { name: 'Verdadero' }))
    expect(screen.queryByRole('button', { name: 'Comprobar' })).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(900))
    expect(screen.getByText('Second statement.')).toBeInTheDocument()
  })

  it('keeps the default matching renderer and labels when guided mode is omitted', () => {
    render(
      <BlockPreview
        block={{
          id: 'match',
          type: 'match',
          order: 0,
          title: 'Práctica de vocabulario',
          pairs: [{ id: 'name', left: 'Name', right: 'Peter' }],
        }}
      />
    )

    expect(screen.getByText('Emparejar')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Práctica de vocabulario' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reiniciar' })).toBeInTheDocument()
  })

  it('waits for final true/false feedback before reporting completion', () => {
    vi.useFakeTimers()
    const complete = vi.fn()
    render(<BlockPreview guidedAppearance onGuidedCompletionChange={complete} block={{
      id: 'tf', type: 'true_false', order: 0, items: [
        { id: 'first', statement: 'First statement.', correctAnswer: true },
        { id: 'second', statement: 'Second statement.', correctAnswer: false },
      ]
    }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Falso' }))
    expect(complete).toHaveBeenLastCalledWith(false)
    act(() => vi.advanceTimersByTime(1800))
    fireEvent.click(screen.getByRole('button', { name: 'Falso' }))
    expect(complete).toHaveBeenLastCalledWith(false)
    act(() => vi.advanceTimersByTime(900))
    expect(complete).toHaveBeenLastCalledWith(true)
  })

  it('sends guided true/false feedback and navigation with retained answers in student classroom mode', () => {
    vi.useFakeTimers()
    const sendBlockResponse = vi.fn()
    const syncBlockNavigation = vi.fn()
    const classroom = {
      isInClassroom: true,
      isTeacher: false,
      remoteBlockNavigation: new Map(),
      sendBlockResponse,
      syncBlockNavigation,
    }

    render(
      <ClassroomSyncContext.Provider value={classroom}>
        <BlockPreview
          guidedAppearance
          block={{
            id: 'student-tf',
            type: 'true_false',
            order: 0,
            items: [
              { id: 'first', statement: 'First statement.', correctAnswer: true },
              { id: 'second', statement: 'Second statement.', correctAnswer: false },
            ],
          }}
        />
      </ClassroomSyncContext.Provider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Verdadero' }))
    expect(sendBlockResponse).toHaveBeenCalledWith(
      'student-tf',
      'true_false',
      { itemId: 'first', answer: true, isCorrect: true },
      true,
      1
    )
    expect(syncBlockNavigation).toHaveBeenLastCalledWith(
      'student-tf',
      0,
      2,
      true,
      false,
      { first: 'true' }
    )

    act(() => vi.advanceTimersByTime(900))
    expect(screen.getByText('Second statement.')).toBeInTheDocument()
    expect(syncBlockNavigation).toHaveBeenLastCalledWith(
      'student-tf',
      1,
      2,
      true,
      false,
      { first: 'true' }
    )

    fireEvent.click(screen.getByRole('button', { name: 'Falso' }))
    act(() => vi.advanceTimersByTime(900))
    expect(syncBlockNavigation).toHaveBeenLastCalledWith(
      'student-tf',
      1,
      2,
      true,
      true,
      { first: 'true', second: 'false' }
    )
  })

  it('sends guided multiple-choice feedback while leaving the classic teacher renderer intact', () => {
    vi.useFakeTimers()
    const sendBlockResponse = vi.fn()
    const syncBlockNavigation = vi.fn()
    const classroom = {
      isInClassroom: true,
      isTeacher: false,
      remoteBlockNavigation: new Map(),
      sendBlockResponse,
      syncBlockNavigation,
    }

    render(
      <ClassroomSyncContext.Provider value={classroom}>
        <BlockPreview
          guidedAppearance
          block={{
            id: 'student-mc',
            type: 'multiple_choice',
            order: 0,
            items: [
              {
                id: 'first',
                question: 'Which answer is first?',
                options: [
                  { id: 'alpha', text: 'Alpha' },
                  { id: 'beta', text: 'Beta' },
                ],
                correctOptionId: 'alpha',
              },
              {
                id: 'second',
                question: 'Which answer is second?',
                options: [
                  { id: 'gamma', text: 'Gamma' },
                  { id: 'delta', text: 'Delta' },
                ],
                correctOptionId: 'gamma',
              },
            ],
          }}
        />
      </ClassroomSyncContext.Provider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(sendBlockResponse).toHaveBeenCalledWith(
      'student-mc',
      'multiple_choice',
      { itemId: 'first', answer: 'alpha', isCorrect: true },
      true,
      1
    )
    expect(syncBlockNavigation).toHaveBeenLastCalledWith(
      'student-mc',
      0,
      2,
      true,
      false,
      { first: 'alpha' }
    )
  })

  it('keeps the teacher true/false renderer on the student navigation and answers', () => {
    const sendBlockResponse = vi.fn()
    const syncBlockNavigation = vi.fn()
    const classroom = {
      isInClassroom: true,
      isTeacher: true,
      remoteBlockNavigation: new Map([
        [
          'teacher-tf',
          {
            blockId: 'teacher-tf',
            currentStep: 1,
            totalSteps: 2,
            hasStarted: true,
            isCompleted: false,
            participantName: 'Student',
            timestamp: Date.now(),
            currentAnswers: { first: 'true', second: 'false' },
          },
        ],
      ]),
      sendBlockResponse,
      syncBlockNavigation,
    }

    render(
      <ClassroomSyncContext.Provider value={classroom}>
        <BlockPreview
          guidedAppearance
          block={{
            id: 'teacher-tf',
            type: 'true_false',
            order: 0,
            items: [
              { id: 'first', statement: 'First statement.', correctAnswer: true },
              { id: 'second', statement: 'Second statement.', correctAnswer: false },
            ],
          }}
        />
      </ClassroomSyncContext.Provider>
    )

    expect(screen.getByText('Second statement.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Falso' })).toHaveAttribute('aria-pressed', 'true')
    expect(sendBlockResponse).not.toHaveBeenCalled()
    expect(syncBlockNavigation).not.toHaveBeenCalled()
  })

  const guidedPairs = [
    { id: 'first', left: 'First', right: 'Alpha' },
    { id: 'second', left: 'Second', right: 'Beta' },
  ]

  it('teaches category recognition with four stable choices and advances after correction', () => {
    vi.useFakeTimers()
    const pilotPairs = [
      { id: 'name', left: 'Name', right: 'Peter' },
      { id: 'family', left: 'Family Name', right: 'Smith' },
      { id: 'occupation', left: 'Occupation', right: 'Teacher' },
      { id: 'spelling', left: 'Spelling', right: 'P-E-T-E-R' },
      { id: 'age', left: 'Age', right: '20 years old' },
      { id: 'origin', left: 'Origin', right: 'The US' },
      { id: 'address', left: 'Address', right: 'Lincoln Avenue, 23rd' },
      { id: 'phone', left: 'Phone/Mail', right: '01 154 8593' },
      { id: 'marital', left: 'Marital Status', right: 'I am married but Jake is single' },
    ]
    const { rerender, container } = render(
      <BlockPreview
        guidedAppearance
        block={{ id: 'dev-unit1-interleaved-vocabulary', type: 'match', order: 0, pairs: pilotPairs }}
      />
    )

    const firstOrder = Array.from(container.querySelectorAll('[data-guided-match-choice]')).map(
      (button) => button.textContent
    )
    expect(container.querySelectorAll('[data-guided-match-choice]')).toHaveLength(4)
    expect(screen.getByRole('heading', { name: 'My first name is Ana.' })).toBeInTheDocument()
    expect(screen.getByText('¿Qué tipo de dato es?')).toBeInTheDocument()
    expect(firstOrder).toContain('Name')
    expect(firstOrder).not.toEqual(expect.arrayContaining(['Peter', 'Lucas', 'Carl', 'Jake']))

    rerender(
      <BlockPreview
        guidedAppearance
        block={{ id: 'dev-unit1-interleaved-vocabulary', type: 'match', order: 0, pairs: pilotPairs }}
      />
    )
    expect(
      Array.from(container.querySelectorAll('[data-guided-match-choice]')).map(
        (button) => button.textContent
      )
    ).toEqual(firstOrder)
    fireEvent.click(screen.getByRole('button', { name: 'Name' }))
    expect(screen.getByRole('status')).toHaveTextContent('¡Correcto!')
    act(() => vi.advanceTimersByTime(GUIDED_MATCH_CORRECT_FEEDBACK_MS))
    expect(screen.getByRole('heading', { name: 'My surname is Brown.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Family Name' })).toBeInTheDocument()
  })

  it('confirms immediately, guards duplicate clicks, announces wrong feedback, and advances', () => {
    vi.useFakeTimers()
    render(
      <BlockPreview
        guidedAppearance
        block={{ id: 'match-feedback', type: 'match', order: 0, pairs: guidedPairs }}
      />
    )

    const wrongChoice = screen.getByRole('button', { name: 'Beta' })
    fireEvent.click(wrongChoice)
    fireEvent.click(wrongChoice)

    expect(screen.getByRole('status')).toHaveTextContent('Respuesta correcta: Alpha')
    expect(wrongChoice).toBeDisabled()
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(GUIDED_MATCH_WRONG_FEEDBACK_MS - 1))
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()
  })

  it('supports keyboard activation and reports a complete summary, including wrong answers', () => {
    vi.useFakeTimers()
    const onGuidedCompletionChange = vi.fn()
    render(
      <BlockPreview
        guidedAppearance
        onGuidedCompletionChange={onGuidedCompletionChange}
        block={{ id: 'match-summary', type: 'match', order: 0, pairs: guidedPairs }}
      />
    )

    fireEvent.keyDown(screen.getByRole('button', { name: 'Beta' }), { key: 'Enter' })
    act(() => vi.advanceTimersByTime(GUIDED_MATCH_WRONG_FEEDBACK_MS))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Beta' }), { key: ' ' })
    act(() => vi.advanceTimersByTime(GUIDED_MATCH_CORRECT_FEEDBACK_MS))

    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(true)
    const summary = screen.getByRole('region', { name: 'Resultado de asociaciones' })
    expect(summary).toHaveTextContent('First')
    expect(summary).toHaveTextContent('Tu respuesta: Beta')
    expect(summary).toHaveTextContent('Respuesta correcta: Alpha')
    expect(summary).toHaveTextContent('Second')
    expect(summary).toHaveTextContent('Second → Beta')
    expect(summary).toHaveTextContent('Correcto')
  })

  it('reports completion after all correct answers and keeps the guided footer action absent', () => {
    vi.useFakeTimers()
    const target = document.createElement('div')
    const onGuidedActionPresence = vi.fn()
    const onGuidedCompletionChange = vi.fn()
    document.body.appendChild(target)

    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        onGuidedActionPresence={onGuidedActionPresence}
        onGuidedCompletionChange={onGuidedCompletionChange}
        block={{ id: 'match-complete', type: 'match', order: 0, pairs: guidedPairs }}
      />
    )

    expect(onGuidedActionPresence).toHaveBeenLastCalledWith(false)
    expect(target).toBeEmptyDOMElement()
    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    act(() => vi.advanceTimersByTime(GUIDED_MATCH_CORRECT_FEEDBACK_MS))
    fireEvent.click(screen.getByRole('button', { name: 'Beta' }))
    act(() => vi.advanceTimersByTime(GUIDED_MATCH_CORRECT_FEEDBACK_MS))

    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(true)
    expect(screen.getByRole('region', { name: 'Resultado de asociaciones' })).toHaveTextContent(
      'Todas las respuestas son correctas'
    )
    expect(target).toBeEmptyDOMElement()
  })

  it('cleans up the feedback timer when the guided match unmounts', () => {
    vi.useFakeTimers()
    const { unmount } = render(
      <BlockPreview
        guidedAppearance
        block={{ id: 'match-cleanup', type: 'match', order: 0, pairs: guidedPairs }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('checks fill blanks locally with Enter and automatically advances', () => {
    vi.useFakeTimers()
    const complete = vi.fn()
    const target = document.createElement('div')
    document.body.appendChild(target)
    render(<BlockPreview guidedAppearance guidedActionTarget={target} onGuidedCompletionChange={complete}
      block={{ id: 'fill', type: 'fill_blanks', order: 0, items: [
        { id: 'first', content: 'I [am] ready.' }, { id: 'second', content: 'You [are] ready.' },
      ] }} />)
    expect(target.querySelector('button')).toBeNull()
    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled()
    const input = screen.getByRole('textbox', { name: 'Respuesta 2' })
    fireEvent.change(input, { target: { value: 'is' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(complete).toHaveBeenLastCalledWith(false)
    act(() => vi.advanceTimersByTime(1800))
    const second = screen.getByRole('textbox', { name: 'Respuesta 2' })
    fireEvent.change(second, { target: { value: 'are' } })
    fireEvent.keyDown(second, { key: 'Enter' })
    act(() => vi.advanceTimersByTime(900))
    expect(complete).toHaveBeenLastCalledWith(true)
    expect(screen.queryByRole('button', { name: 'Pregunta anterior' })).not.toBeInTheDocument()
  })

  it('checks multiple choice directly and waits until final feedback to complete', () => {
    vi.useFakeTimers()
    const complete = vi.fn()
    render(<BlockPreview guidedAppearance onGuidedCompletionChange={complete} block={{
      id: 'mc', type: 'multiple_choice', order: 0, items: [
        { id: 'first', question: 'First?', options: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }], correctOptionId: 'yes' },
        { id: 'second', question: 'Second?', options: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }], correctOptionId: 'no' },
      ]
    }} />)
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(complete).toHaveBeenLastCalledWith(false)
    act(() => vi.advanceTimersByTime(1800))
    expect(screen.getByText('Second?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    act(() => vi.advanceTimersByTime(900))
    expect(complete).toHaveBeenLastCalledWith(true)
  })

  it('uses Corregir for guided essay grading and invalidates completion when the draft changes', () => {
    const target = document.createElement('div')
    const onGuidedCompletionChange = vi.fn()
    document.body.appendChild(target)

    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        onGuidedCompletionChange={onGuidedCompletionChange}
        block={{
          id: 'essay-completion',
          type: 'essay',
          order: 0,
          prompt: 'Write a paragraph.',
          aiGrading: true,
        }}
      />
    )

    expect(target.querySelector('button')).toHaveTextContent('Corregir')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A complete draft.' } })
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(true)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'An edited draft.' } })
    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(false)
  })

  it('supports automatic checking for legacy single-question multiple choice', () => {
    vi.useFakeTimers()
    const complete = vi.fn()
    render(<BlockPreview guidedAppearance onGuidedCompletionChange={complete} block={{
      id: 'legacy', type: 'multiple_choice', order: 0, question: 'Choose a possessive.',
      options: [{ id: 'my', text: 'My' }, { id: 'your', text: 'Your' }], correctOptionId: 'my',
    }} />)
    fireEvent.click(screen.getByRole('button', { name: 'My' }))
    act(() => vi.advanceTimersByTime(900))
    expect(complete).toHaveBeenLastCalledWith(true)
  })
})
