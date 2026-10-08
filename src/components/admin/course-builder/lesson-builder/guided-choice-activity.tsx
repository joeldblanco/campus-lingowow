import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import motion from './guided-choice-activity.module.css'
import { shuffleGuidedChoices } from '@/lib/shuffle-guided-choices'

export interface GuidedChoice {
  id: string
  text: string
}

export interface GuidedChoiceQuestion {
  id: string
  prompt: string
  choices: GuidedChoice[]
  correctChoiceId: string
  explanation?: string
}

export interface GuidedChoiceActivityProps {
  questions: GuidedChoiceQuestion[]
  onCompletionChange?: (completed: boolean) => void
  shuffleChoices?: boolean
  onAnswer?: (questionId: string, choiceId: string, isCorrect: boolean) => void
  onNavigation?: (index: number, total: number) => void
  remoteIndex?: number
}

type ChoiceFeedback = {
  selectedChoiceId: string
  isCorrect: boolean
}

type PendingTimer = {
  questionIndex: number
  remaining: number
  startedAt: number | null
  timeoutId: ReturnType<typeof setTimeout> | null
}

type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong' | 'neutral'

const CORRECT_FEEDBACK_MS = 900
const WRONG_FEEDBACK_MS = 1800

function questionSetSignature(questions: GuidedChoiceQuestion[]) {
  return JSON.stringify(
    questions.map(({ id, prompt, choices, correctChoiceId, explanation }) => ({
      id,
      prompt,
      choices: choices.map(({ id: choiceId, text }) => ({ id: choiceId, text })),
      correctChoiceId,
      explanation: explanation ?? null,
    }))
  )
}

function isGuidedStepHidden(step: HTMLElement | null) {
  if (!step) return false
  if (
    step.hidden ||
    step.classList.contains('hidden') ||
    step.getAttribute('aria-hidden') === 'true'
  ) {
    return true
  }

  if (typeof window === 'undefined') return false
  const computedStyle = window.getComputedStyle(step)
  return computedStyle.display === 'none' || computedStyle.visibility === 'hidden'
}

function choiceState(
  choiceId: string,
  question: GuidedChoiceQuestion,
  selectedChoiceId: string | undefined,
  feedback: ChoiceFeedback | undefined
): ChoiceState {
  if (!feedback) return selectedChoiceId === choiceId ? 'selected' : 'idle'
  if (choiceId === question.correctChoiceId) return 'correct'
  if (choiceId === selectedChoiceId) return 'wrong'
  return 'neutral'
}

function stateLabel(state: ChoiceState) {
  switch (state) {
    case 'correct':
      return 'Correcta'
    case 'wrong':
      return 'Incorrecta'
    case 'selected':
      return 'Seleccionada'
    default:
      return ''
  }
}

const choiceBaseClass =
  'flex min-h-14 w-full min-w-0 items-center gap-4 rounded-2xl border px-5 py-3 text-left text-base leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10245C] focus-visible:ring-offset-2'

function choiceClassName(state: ChoiceState, isInteractive: boolean) {
  const interactionClass = isInteractive ? 'cursor-pointer' : 'cursor-default'

  switch (state) {
    case 'selected':
      return cn(
        choiceBaseClass,
        interactionClass,
        'border-[#10245C] bg-[#EEE8FA] text-[#10245C] ring-2 ring-[#10245C]/20'
      )
    case 'correct':
      return cn(
        choiceBaseClass,
        interactionClass,
        'border-[#08775E] bg-[#08775E]/10 text-[#08775E]'
      )
    case 'wrong':
      return cn(
        choiceBaseClass,
        interactionClass,
        'border-[#C13E50] bg-[#C13E50]/10 text-[#C13E50]'
      )
    case 'neutral':
      return cn(choiceBaseClass, interactionClass, 'border-[#EEE8FA] bg-white text-[#506187]')
    default:
      return cn(
        choiceBaseClass,
        interactionClass,
        'border-[#EEE8FA] bg-white text-[#10245C] shadow-[0_4px_12px_rgba(16,36,92,0.06)] hover:border-[#506187]/50 hover:bg-[#FAF8F4]'
      )
  }
}

function ChoiceMarker({ state, celebrate = false }: { state: ChoiceState; celebrate?: boolean }) {
  const markerClass = cn(
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold leading-none',
    state === 'correct' && 'border-[#08775E] bg-[#08775E] text-white',
    state === 'wrong' && 'border-[#C13E50] bg-[#C13E50] text-white',
    state === 'selected' && 'border-[#10245C] bg-[#10245C] text-white',
    (state === 'idle' || state === 'neutral') && 'border-[#506187]/50 bg-white text-transparent',
    celebrate && motion.correctMarker
  )

  return (
    <span className={markerClass} aria-hidden="true">
      {state === 'correct' && (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path
            d="M20 6 9 17l-5-5"
            pathLength="1"
            className={celebrate ? motion.correctCheckPath : undefined}
          />
        </svg>
      )}
      {state === 'wrong' && <X className="h-4 w-4" strokeWidth={2.5} />}
      {state === 'selected' && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
    </span>
  )
}

function SummaryChoiceRow({ choice, state }: { choice: GuidedChoice; state: ChoiceState }) {
  const label = stateLabel(state)

  return (
    <div
      className={choiceClassName(state, false)}
      data-guided-choice={choice.id}
      data-guided-choice-state={state}
      aria-label={label ? `${choice.text}, ${label}` : choice.text}
    >
      <ChoiceMarker state={state} />
      <span className="min-w-0 flex-1 break-words">{choice.text}</span>
      {label && (
        <span className="shrink-0 text-sm font-semibold" aria-hidden="true">
          {label}
        </span>
      )}
    </div>
  )
}

export function GuidedChoiceActivity({
  questions,
  onCompletionChange,
  shuffleChoices = false,
  onAnswer,
  onNavigation,
  remoteIndex,
}: GuidedChoiceActivityProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const promptRef = useRef<HTMLParagraphElement>(null)
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null)
  const pendingTimerRef = useRef<PendingTimer | null>(null)
  const selectionLockRef = useRef(false)
  const questionIndexRef = useRef(0)
  const questionSignature = questionSetSignature(questions)
  const questionSignatureRef = useRef(questionSignature)
  const advanceQuestionRef = useRef<(questionIndex: number) => void>(() => undefined)
  const pauseTimerRef = useRef<() => void>(() => undefined)
  const resumeTimerRef = useRef<() => void>(() => undefined)
  const clearTimerRef = useRef<() => void>(() => undefined)
  const focusIfVisibleRef = useRef<() => void>(() => undefined)
  const pendingFocusRef = useRef<'prompt' | 'summary' | null>(null)
  const completionCallbackRef = useRef(onCompletionChange)
  const answerCallbackRef = useRef(onAnswer)
  const navigationCallbackRef = useRef(onNavigation)
  const previousQuestionIndexRef = useRef(0)

  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<Record<string, ChoiceFeedback>>({})
  const [announcement, setAnnouncement] = useState('')
  const [completed, setCompleted] = useState(false)

  questionIndexRef.current = questionIndex
  completionCallbackRef.current = onCompletionChange
  answerCallbackRef.current = onAnswer
  navigationCallbackRef.current = onNavigation

  const clearTimer = () => {
    const pendingTimer = pendingTimerRef.current
    if (!pendingTimer) return
    if (pendingTimer.timeoutId !== null) clearTimeout(pendingTimer.timeoutId)
    pendingTimerRef.current = null
  }

  clearTimerRef.current = clearTimer

  const advanceQuestion = (indexThatFinished: number) => {
    const pendingTimer = pendingTimerRef.current
    if (pendingTimer && pendingTimer.questionIndex !== indexThatFinished) return

    pendingTimerRef.current = null
    selectionLockRef.current = false
    setAnnouncement('')

    if (indexThatFinished < questions.length - 1) {
      const nextIndex = indexThatFinished + 1
      setQuestionIndex((currentIndex) =>
        currentIndex === indexThatFinished ? nextIndex : currentIndex
      )
      navigationCallbackRef.current?.(nextIndex, questions.length)
      return
    }

    setCompleted(true)
  }

  advanceQuestionRef.current = advanceQuestion

  const pauseTimer = () => {
    const pendingTimer = pendingTimerRef.current
    if (!pendingTimer || pendingTimer.timeoutId === null || pendingTimer.startedAt === null) return

    const elapsed = Date.now() - pendingTimer.startedAt
    pendingTimer.remaining = Math.max(0, pendingTimer.remaining - elapsed)
    clearTimeout(pendingTimer.timeoutId)
    pendingTimer.timeoutId = null
    pendingTimer.startedAt = null
  }

  pauseTimerRef.current = pauseTimer

  const resumeTimer = () => {
    const pendingTimer = pendingTimerRef.current
    if (!pendingTimer || pendingTimer.timeoutId !== null) return

    const step = rootRef.current?.closest<HTMLElement>('[data-guided-step]') ?? null
    if (isGuidedStepHidden(step)) return

    if (pendingTimer.remaining <= 0) {
      advanceQuestionRef.current(pendingTimer.questionIndex)
      return
    }

    pendingTimer.startedAt = Date.now()
    const timer = pendingTimer
    timer.timeoutId = setTimeout(() => {
      if (pendingTimerRef.current !== timer) return
      timer.timeoutId = null
      timer.startedAt = null
      timer.remaining = 0
      advanceQuestionRef.current(timer.questionIndex)
    }, timer.remaining)
  }

  resumeTimerRef.current = resumeTimer

  const focusIfVisible = () => {
    const step = rootRef.current?.closest<HTMLElement>('[data-guided-step]') ?? null
    if (isGuidedStepHidden(step)) {
      pendingFocusRef.current = completed ? 'summary' : 'prompt'
      return
    }

    const target = completed ? summaryHeadingRef.current : promptRef.current
    if (!target) {
      pendingFocusRef.current = completed ? 'summary' : 'prompt'
      return
    }

    target.focus()
    pendingFocusRef.current = null
  }

  focusIfVisibleRef.current = focusIfVisible

  const startTimer = (index: number, delay: number) => {
    pendingTimerRef.current = {
      questionIndex: index,
      remaining: delay,
      startedAt: null,
      timeoutId: null,
    }
    resumeTimerRef.current()
  }

  useEffect(() => {
    const step = rootRef.current?.closest<HTMLElement>('[data-guided-step]') ?? null
    let observer: MutationObserver | null = null

    if (step && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        if (isGuidedStepHidden(step)) {
          pauseTimerRef.current()
        } else {
          resumeTimerRef.current()
          if (pendingFocusRef.current) focusIfVisibleRef.current()
        }
      })
      observer.observe(step, {
        attributes: true,
        attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'],
      })
    }

    if (isGuidedStepHidden(step)) pauseTimerRef.current()
    else resumeTimerRef.current()

    return () => {
      observer?.disconnect()
      clearTimerRef.current()
    }
  }, [])

  useEffect(() => {
    if (questionSignatureRef.current === questionSignature) return

    questionSignatureRef.current = questionSignature
    clearTimerRef.current()
    selectionLockRef.current = false
    setQuestionIndex(0)
    setAnswers({})
    setFeedbackByQuestion({})
    setAnnouncement('')
    setCompleted(false)
    pendingFocusRef.current = null
  }, [questionSignature])

  useEffect(() => {
    if (remoteIndex === undefined || questions.length === 0) return

    const nextIndex = Math.min(Math.max(remoteIndex, 0), questions.length - 1)
    if (nextIndex === questionIndexRef.current) return

    clearTimerRef.current()
    selectionLockRef.current = false
    setAnnouncement('')
    setQuestionIndex(nextIndex)
  }, [questionSignature, questions.length, remoteIndex])

  useEffect(() => {
    completionCallbackRef.current?.(completed)
  }, [completed])

  useEffect(() => {
    return () => completionCallbackRef.current?.(false)
  }, [])

  useLayoutEffect(() => {
    if (previousQuestionIndexRef.current === questionIndex) return
    previousQuestionIndexRef.current = questionIndex
    focusIfVisibleRef.current()
  }, [questionIndex])

  useLayoutEffect(() => {
    if (completed) focusIfVisibleRef.current()
  }, [completed])

  if (questions.length === 0) {
    return (
      <div
        ref={rootRef}
        data-guided-choice-activity
        className="w-full min-w-0 text-base leading-6 text-[#10245C]"
        role="status"
      >
        No hay preguntas configuradas.
      </div>
    )
  }

  const currentQuestion = questions[questionIndex] ?? questions[0]
  const selectedChoiceId = answers[currentQuestion.id]
  const currentFeedback = feedbackByQuestion[currentQuestion.id]
  const feedbackId = `guided-choice-feedback-${currentQuestion.id}`
  const promptId = `guided-choice-prompt-${currentQuestion.id}`

  const handleChoice = (choiceId: string) => {
    const question = questions[questionIndexRef.current]
    if (!question || completed || currentFeedback || selectionLockRef.current) return
    if (!question.choices.some((choice) => choice.id === choiceId)) return

    selectionLockRef.current = true
    const isCorrect = choiceId === question.correctChoiceId
    setAnswers((previousAnswers) => ({ ...previousAnswers, [question.id]: choiceId }))
    setFeedbackByQuestion((previousFeedback) => ({
      ...previousFeedback,
      [question.id]: { selectedChoiceId: choiceId, isCorrect },
    }))
    setAnnouncement(isCorrect ? '¡Correcto!' : 'Respuesta incorrecta.')
    answerCallbackRef.current?.(question.id, choiceId, isCorrect)
    startTimer(questionIndexRef.current, isCorrect ? CORRECT_FEEDBACK_MS : WRONG_FEEDBACK_MS)
  }

  const renderChoiceButton = (choice: GuidedChoice) => {
    const state = choiceState(choice.id, currentQuestion, selectedChoiceId, currentFeedback)
    const label = stateLabel(state)
    const isCorrectSelection = state === 'correct' && selectedChoiceId === choice.id

    return (
      <button
        key={choice.id}
        type="button"
        onClick={() => handleChoice(choice.id)}
        disabled={Boolean(currentFeedback) || completed}
        aria-label={choice.text}
        aria-pressed={selectedChoiceId === choice.id}
        aria-describedby={currentFeedback ? feedbackId : undefined}
        className={cn(
          choiceClassName(state, !currentFeedback && !completed),
          isCorrectSelection && motion.correctChoice
        )}
        data-guided-choice={choice.id}
        data-guided-choice-state={state}
        data-guided-choice-celebrating={isCorrectSelection ? 'true' : undefined}
      >
        <ChoiceMarker state={state} celebrate={isCorrectSelection} />
        <span className="min-w-0 flex-1 break-words">{choice.text}</span>
        {label && (
          <span className="shrink-0 text-sm font-semibold" aria-hidden="true">
            {label}
          </span>
        )}
      </button>
    )
  }

  const renderSummary = () => (
    <div
      data-guided-choice-summary
      className="w-full min-w-0 space-y-8 text-[#10245C]"
      aria-labelledby="guided-choice-summary-heading"
    >
      <h2
        ref={summaryHeadingRef}
        id="guided-choice-summary-heading"
        tabIndex={-1}
        className="text-base font-semibold leading-6 text-[#506187] outline-none"
      >
        Resumen
      </h2>
      <div className="space-y-8">
        {questions.map((question, index) => {
          const selectedId = answers[question.id]
          const feedback = feedbackByQuestion[question.id]
          const selectedChoice = question.choices.find((choice) => choice.id === selectedId)
          const correctChoice = question.choices.find(
            (choice) => choice.id === question.correctChoiceId
          )
          const summaryChoices = selectedChoice
            ? selectedChoice.id === correctChoice?.id || !correctChoice
              ? [selectedChoice]
              : [selectedChoice, correctChoice]
            : correctChoice
              ? [correctChoice]
              : []

          return (
            <section
              key={question.id}
              className="min-w-0 space-y-4"
              aria-labelledby={`guided-choice-summary-question-${question.id}`}
              data-guided-choice-summary-question={question.id}
            >
              <h3
                id={`guided-choice-summary-question-${question.id}`}
                className="text-base font-bold leading-6 text-[#10245C] sm:text-lg"
              >
                {index + 1}. {question.prompt}
              </h3>
              <div className="space-y-3">
                {summaryChoices.map((choice) => (
                  <SummaryChoiceRow
                    key={choice.id}
                    choice={choice}
                    state={choiceState(choice.id, question, selectedId, feedback)}
                  />
                ))}
              </div>
              {question.explanation && (
                <p className="text-base leading-6 text-[#506187]">{question.explanation}</p>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )

  return (
    <div
      ref={rootRef}
      data-guided-choice-activity
      className="w-full min-w-0 space-y-6 text-[#10245C]"
    >
      {completed ? (
        renderSummary()
      ) : (
        <>
          <div className="min-w-0 space-y-3">
            <p className="text-sm leading-6 text-[#506187]">
              Pregunta {questionIndex + 1} de {questions.length}
            </p>
            <p
              ref={promptRef}
              id={promptId}
              tabIndex={-1}
              className="max-w-[38rem] break-words text-base font-semibold leading-6 text-[#10245C] outline-none"
            >
              {currentQuestion.prompt}
            </p>
          </div>

          <div
            role="group"
            aria-labelledby={promptId}
            className="w-full min-w-0 space-y-3"
            data-guided-choice-options
          >
            {(shuffleChoices ? shuffleGuidedChoices(currentQuestion.choices, currentQuestion.id) : currentQuestion.choices).map(renderChoiceButton)}
          </div>

          {currentFeedback && (
            <p
              id={feedbackId}
              role="status"
              aria-live="polite"
              className={cn(
                'text-base leading-6',
                currentFeedback.isCorrect ? 'text-[#08775E]' : 'text-[#C13E50]'
              )}
            >
              {announcement || (currentFeedback.isCorrect ? '¡Correcto!' : 'Respuesta incorrecta.')}
              {currentQuestion.explanation ? ` ${currentQuestion.explanation}` : ''}
            </p>
          )}
        </>
      )}
    </div>
  )
}

export { CORRECT_FEEDBACK_MS, WRONG_FEEDBACK_MS }
