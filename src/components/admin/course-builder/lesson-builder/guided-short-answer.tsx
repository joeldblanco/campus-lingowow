import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { ShortAnswerItem } from '@/types/course-builder'
import { useClassroomSync } from '@/components/classroom/use-classroom-sync'

export const GUIDED_SHORT_ANSWER_FEEDBACK_MS = 900

export interface GuidedShortAnswerActivityProps {
  blockId: string
  items: ShortAnswerItem[]
  caseSensitive?: boolean
  context?: string
  guidedActionTarget?: HTMLElement | null
  onGuidedActionPresence?: (present: boolean) => void
  onCompletionChange?: (completed: boolean) => void
}

type Feedback = {
  itemId: string
  isCorrect: boolean
  submitted: string
}

function normalizeAnswer(value: string, caseSensitive: boolean) {
  const trimmed = value.trim().replace(/[‘’]/g, "'").replace(/\s+/g, ' ')
  return caseSensitive ? trimmed : trimmed.replace(/[.!?]+$/u, '').trim().toLocaleLowerCase()
}

function answerIsCorrect(item: ShortAnswerItem, answer: string, caseSensitive: boolean) {
  const accepted = [item.correctAnswer, ...(item.acceptedAnswers || [])]
  const normalizedAnswer = normalizeAnswer(answer, caseSensitive)
  return accepted.some((candidate) => normalizeAnswer(candidate, caseSensitive) === normalizedAnswer)
}

function expectedAnswers(item: ShortAnswerItem) {
  return [item.correctAnswer, ...(item.acceptedAnswers || [])].filter(
    (answer, index, answers) => answer.trim() && answers.indexOf(answer) === index
  )
}

function isStepHidden(element: HTMLElement | null) {
  if (!element) return false
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return true
  if (typeof window === 'undefined') return false
  const style = window.getComputedStyle(element)
  return style.display === 'none' || style.visibility === 'hidden'
}

export function GuidedShortAnswerActivity({
  blockId,
  items,
  caseSensitive = false,
  context,
  guidedActionTarget,
  onGuidedActionPresence,
  onCompletionChange,
}: GuidedShortAnswerActivityProps) {
  const classroomSync = useClassroomSync()
  const itemSignature = useMemo(
    () => JSON.stringify(items.map((item) => ({ ...item, acceptedAnswers: item.acceptedAnswers || [] }))),
    [items]
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [completed, setCompleted] = useState(false)
  const itemCount = items.length
  const currentItemId = items[currentIndex]?.id
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const feedbackTimerRef = useRef<number | null>(null)
  const previousSignatureRef = useRef(itemSignature)
  const completionCallbackRef = useRef(onCompletionChange)
  const actionPresenceCallbackRef = useRef(onGuidedActionPresence)
  const answersRef = useRef(answers)

  answersRef.current = answers

  useEffect(() => {
    completionCallbackRef.current = onCompletionChange
  }, [onCompletionChange])

  useEffect(() => {
    actionPresenceCallbackRef.current = onGuidedActionPresence
  }, [onGuidedActionPresence])

  useEffect(() => {
    if (previousSignatureRef.current === itemSignature) return

    previousSignatureRef.current = itemSignature
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = null
    setCurrentIndex(0)
    setAnswers({})
    setFeedback(null)
    setCompleted(false)
  }, [itemSignature])

  useEffect(() => {
    completionCallbackRef.current?.(completed)
  }, [completed])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
      completionCallbackRef.current?.(false)
    }
  }, [])

  useEffect(() => {
    if (!feedback || !itemCount) return

    const stepElement = rootRef.current?.closest<HTMLElement>('[data-guided-step]') || null
    let remaining = GUIDED_SHORT_ANSWER_FEEDBACK_MS
    let dueAt: number | null = null
    let observer: MutationObserver | null = null

    const clearTimer = (pause: boolean) => {
      if (feedbackTimerRef.current === null) return
      if (pause && dueAt !== null) remaining = Math.max(0, dueAt - Date.now())
      window.clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
      dueAt = null
    }

    const advance = () => {
      feedbackTimerRef.current = null
      dueAt = null
      if (feedback.itemId !== currentItemId) return
      if (currentIndex < itemCount - 1) {
        setFeedback(null)
        setCurrentIndex((index) => index + 1)
      } else {
        setFeedback(null)
        setCompleted(true)
      }
    }

    const schedule = () => {
      if (feedbackTimerRef.current !== null || isStepHidden(stepElement)) return
      if (remaining <= 0) {
        advance()
        return
      }
      dueAt = Date.now() + remaining
      feedbackTimerRef.current = window.setTimeout(advance, remaining)
    }

    if (stepElement && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        if (isStepHidden(stepElement)) clearTimer(true)
        else schedule()
      })
      observer.observe(stepElement, {
        attributes: true,
        attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'],
      })
    }

    schedule()
    return () => {
      clearTimer(false)
      observer?.disconnect()
    }
  }, [currentIndex, currentItemId, feedback, itemCount, itemSignature])

  useEffect(() => {
    if (completed || !currentItemId) return
    const stepElement = rootRef.current?.closest<HTMLElement>('[data-guided-step]') || null
    if (!isStepHidden(stepElement)) inputRef.current?.focus()
  }, [completed, currentIndex, currentItemId, itemSignature])

  const currentItem = items[currentIndex]
  const currentAnswer = currentItem ? answers[currentItem.id] || '' : ''
  const feedbackId = currentItem ? `guided-short-answer-feedback-${currentItem.id}` : undefined
  const hasCheckAction = Boolean(currentItem && !feedback && !completed)

  useEffect(() => {
    actionPresenceCallbackRef.current?.(hasCheckAction)
    return () => actionPresenceCallbackRef.current?.(false)
  }, [hasCheckAction])

  const updateAnswer = (value: string) => {
    if (!currentItem || feedback || completed) return
    const nextAnswers = { ...answersRef.current, [currentItem.id]: value }
    setAnswers(nextAnswers)
    if (classroomSync.canInteract) {
      classroomSync.syncBlockNavigation(
        blockId,
        currentIndex,
        items.length,
        true,
        false,
        nextAnswers
      )
    }
  }

  const checkAnswer = () => {
    if (!currentItem || completed || feedback || !currentAnswer.trim()) return
    const isCorrect = answerIsCorrect(currentItem, currentAnswer, caseSensitive)
    setFeedback({ itemId: currentItem.id, isCorrect, submitted: currentAnswer })
    if (classroomSync.canInteract) {
      classroomSync.sendBlockResponse(
        blockId,
        'short_answer',
        { itemId: currentItem.id, answer: currentAnswer, isCorrect },
        isCorrect,
        isCorrect ? 1 : 0
      )
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    checkAnswer()
  }

  const checkAction = currentItem && !feedback ? (
    <button
      type="button"
      onClick={checkAnswer}
      disabled={!currentAnswer.trim()}
      className="min-h-11 w-full rounded-full bg-[#245CFF] px-5 py-2 text-base font-semibold leading-6 text-white transition-colors hover:bg-[#245CFF]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10245C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      Comprobar
    </button>
  ) : null
  const renderedCheckAction = checkAction && guidedActionTarget
    ? createPortal(checkAction, guidedActionTarget)
    : checkAction

  if (!items.length) {
    return (
      <div ref={rootRef} className="space-y-5 text-[#10245C]" data-guided-short-answer>
        <p className="text-base leading-6 text-[#506187]">Sin preguntas configuradas</p>
      </div>
    )
  }

  if (completed) {
    return (
      <div ref={rootRef} className="space-y-5 text-[#10245C]" data-guided-short-answer>
        <section
          tabIndex={-1}
          role="region"
          aria-label="Resultado de respuestas cortas"
          className="space-y-4 outline-none"
        >
          <p role="status" aria-live="polite" className="text-base font-semibold leading-6">
            ¡Actividad completada!
          </p>
          <div className="space-y-3" data-guided-short-answer-summary>
            {items.map((item) => {
              const answer = answers[item.id] || ''
              const isCorrect = answerIsCorrect(item, answer, caseSensitive)
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#EEE8FA] bg-white px-4 py-3 text-base leading-6 shadow-sm sm:px-5 sm:py-4"
                >
                  <p className="break-words font-semibold text-[#10245C]">{item.question}</p>
                  <p className="text-[#506187]">
                    Tu respuesta: <span className="text-[#10245C]">{answer || '(sin respuesta)'}</span>
                  </p>
                  <p className={isCorrect ? 'font-semibold text-[#08775E]' : 'text-[#C13E50]'}>
                    {isCorrect ? 'Correcto' : `Respuesta correcta: ${expectedAnswers(item).join(' / ')}`}
                  </p>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    )
  }

  const isCorrect = feedback?.itemId === currentItem.id ? feedback.isCorrect : undefined

  return (
    <div ref={rootRef} className="space-y-5 text-[#10245C]" data-guided-short-answer>
      <p className="text-sm leading-6 text-[#506187]">
        Pregunta {currentIndex + 1} de {items.length}
      </p>

      {context && (
        <div className="text-base leading-7 text-[#506187]">
          {context}
        </div>
      )}

      <section aria-label="Actividad de respuesta corta" className="space-y-4">
        <label htmlFor={`guided-short-answer-${currentItem.id}`} className="block text-base font-semibold leading-6">
          {currentItem.question}
        </label>
        <input
          ref={inputRef}
          id={`guided-short-answer-${currentItem.id}`}
          type="text"
          value={currentAnswer}
          onChange={(event) => updateAnswer(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={Boolean(feedback) || completed}
          aria-describedby={feedbackId}
          aria-invalid={isCorrect === false || undefined}
          autoComplete="off"
          className={
            'min-h-12 w-full appearance-none rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-1 py-2 text-base leading-6 text-[#10245C] outline-none transition-colors focus:border-[#245CFF] focus:shadow-[0_2px_0_#245CFF] focus:outline-none focus:ring-0 focus-visible:border-[#245CFF] focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[0_2px_0_#245CFF] ' +
            (isCorrect === true
              ? 'border-[#08775E] text-[#08775E]'
              : isCorrect === false
                ? 'border-[#C13E50] text-[#C13E50]'
                : 'border-[#506187]')
          }
        />

        {renderedCheckAction}

        {feedback && (
          <p
            id={feedbackId}
            role="status"
            aria-live="polite"
            className={feedback.isCorrect ? 'min-h-6 text-base font-semibold leading-6 text-[#08775E]' : 'min-h-6 text-base leading-6 text-[#C13E50]'}
          >
            {feedback.isCorrect
              ? '¡Correcto!'
              : `Respuesta correcta: ${expectedAnswers(currentItem).join(' / ')}`}
          </p>
        )}
      </section>
    </div>
  )
}
