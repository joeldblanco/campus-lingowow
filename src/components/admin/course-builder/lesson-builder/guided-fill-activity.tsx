import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefCallback } from 'react'

export const GUIDED_FILL_CORRECT_FEEDBACK_MS = 900
export const GUIDED_FILL_WRONG_FEEDBACK_MS = 1800

export interface GuidedFillActivityItem {
  id: string
  content: string
}

export interface GuidedFillActivityProps {
  items: GuidedFillActivityItem[]
  onCompletionChange?: (completed: boolean) => void
}

type ParsedPart =
  | { kind: 'text'; partIndex: number; value: string }
  | { kind: 'blank'; partIndex: number; expected: string }

type AnswersByItem = Record<string, Record<number, string>>

type Feedback = {
  itemIndex: number
  itemId: string
  isCorrect: boolean
  submitted: string[]
  expected: string[]
}

const BRACKET_PART_PATTERN = /(\[[^\]]*\])/g

function parseContent(content: string): ParsedPart[] {
  return content.split(BRACKET_PART_PATTERN).map((value, partIndex) => {
    if (value.startsWith('[') && value.endsWith(']')) {
      return {
        kind: 'blank',
        partIndex,
        expected: value.slice(1, -1),
      }
    }

    return { kind: 'text', partIndex, value }
  })
}

function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase()
}

function answerIsCorrect(answer: string, expected: string) {
  return normalizeAnswer(answer) === normalizeAnswer(expected)
}

export function GuidedFillActivity({ items, onCompletionChange }: GuidedFillActivityProps) {
  const parsedItems = useMemo(
    () => items.map((item) => ({ item, parts: parseContent(item.content) })),
    [items]
  )
  const itemSignature = useMemo(
    () => items.map((item) => `${item.id}\u0000${item.content}`).join('\u0001'),
    [items]
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answersByItem, setAnswersByItem] = useState<AnswersByItem>({})
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [completed, setCompleted] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLElement>(null)
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const checkInFlightRef = useRef(false)
  const previousSignatureRef = useRef(itemSignature)
  const previousIndexRef = useRef(currentIndex)
  const completionCallbackRef = useRef(onCompletionChange)

  useEffect(() => {
    completionCallbackRef.current = onCompletionChange
  }, [onCompletionChange])

  useEffect(() => {
    if (previousSignatureRef.current === itemSignature) return

    previousSignatureRef.current = itemSignature
    checkInFlightRef.current = false
    setCurrentIndex(0)
    setAnswersByItem({})
    setFeedback(null)
    setCompleted(false)
  }, [itemSignature])

  useEffect(() => {
    completionCallbackRef.current?.(completed)
  }, [completed, parsedItems.length])

  const currentEntry = parsedItems[currentIndex]
  const currentItem = currentEntry?.item
  const currentParts = currentEntry?.parts ?? []
  const currentAnswers = currentItem ? answersByItem[currentItem.id] || {} : {}
  const currentBlanks = currentParts.filter(
    (part): part is Extract<ParsedPart, { kind: 'blank' }> => part.kind === 'blank'
  )
  const allBlanksFilled =
    currentBlanks.length > 0 &&
    currentBlanks.every((part) => Boolean(currentAnswers[part.partIndex]?.trim()))

  const setInputRef =
    (partIndex: number): RefCallback<HTMLInputElement> =>
    (element) => {
      inputRefs.current[partIndex] = element
    }

  const handleInputChange = (partIndex: number, value: string) => {
    if (!currentItem || feedback || completed) return

    setAnswersByItem((previous) => ({
      ...previous,
      [currentItem.id]: {
        ...(previous[currentItem.id] || {}),
        [partIndex]: value,
      },
    }))
  }

  const handleCheck = () => {
    if (!currentItem || completed || feedback || checkInFlightRef.current || !allBlanksFilled) {
      return
    }

    checkInFlightRef.current = true
    const submitted = currentBlanks.map((part) => currentAnswers[part.partIndex] || '')
    const expected = currentBlanks.map((part) => part.expected)
    const isCorrect = expected.every((answer, index) => answerIsCorrect(submitted[index], answer))

    setFeedback({
      itemIndex: currentIndex,
      itemId: currentItem.id,
      isCorrect,
      submitted,
      expected,
    })
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    if (allBlanksFilled) handleCheck()
  }

  useEffect(() => {
    if (previousIndexRef.current === currentIndex) return

    previousIndexRef.current = currentIndex
    if (completed) return

    const stepElement = rootRef.current?.closest<HTMLElement>('[data-guided-step]')
    if (stepElement?.hidden || stepElement?.getAttribute('aria-hidden') === 'true') return

    const firstBlank = parsedItems[currentIndex]?.parts.find((part) => part.kind === 'blank')
    if (firstBlank?.kind === 'blank') {
      inputRefs.current[firstBlank.partIndex]?.focus()
    }
  }, [completed, currentIndex, parsedItems])

  useEffect(() => {
    if (!completed) return

    const stepElement = rootRef.current?.closest<HTMLElement>('[data-guided-step]')
    if (stepElement?.hidden || stepElement?.getAttribute('aria-hidden') === 'true') return

    summaryRef.current?.focus()
  }, [completed])

  useEffect(() => {
    if (!feedback) return

    const currentFeedback = feedback
    const stepElement = rootRef.current?.closest<HTMLElement>('[data-guided-step]')
    const delay = currentFeedback.isCorrect
      ? GUIDED_FILL_CORRECT_FEEDBACK_MS
      : GUIDED_FILL_WRONG_FEEDBACK_MS
    let remainingDelay = delay
    let timeoutId: number | null = null
    let dueAt: number | null = null

    const isHidden = () =>
      Boolean(stepElement?.hidden || stepElement?.getAttribute('aria-hidden') === 'true')

    const clearTimer = (pause = false) => {
      if (timeoutId === null) return

      if (pause && dueAt !== null) {
        remainingDelay = Math.max(0, dueAt - Date.now())
      }

      window.clearTimeout(timeoutId)
      timeoutId = null
      dueAt = null
    }

    const advance = () => {
      timeoutId = null
      dueAt = null
      checkInFlightRef.current = false

      if (currentFeedback.itemIndex < parsedItems.length - 1) {
        setFeedback(null)
        setCurrentIndex(currentFeedback.itemIndex + 1)
        return
      }

      setFeedback(null)
      setCompleted(true)
    }

    const schedule = () => {
      if (timeoutId !== null || isHidden()) return

      dueAt = Date.now() + remainingDelay
      timeoutId = window.setTimeout(advance, remainingDelay)
    }

    let observer: MutationObserver | undefined
    if (stepElement && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        if (isHidden()) {
          clearTimer(true)
        } else {
          schedule()
        }
      })
      observer.observe(stepElement, {
        attributes: true,
        attributeFilter: ['hidden', 'aria-hidden'],
      })
    }

    schedule()

    return () => {
      clearTimer()
      observer?.disconnect()
    }
  }, [feedback, parsedItems.length])

  if (!parsedItems.length) {
    return (
      <div ref={rootRef} className="space-y-5 text-[#10245C]" data-guided-fill-activity>
        <p className="text-base leading-6 text-[#506187]">Sin ejercicios configurados</p>
      </div>
    )
  }

  if (completed) {
    const correctCount = parsedItems.filter(({ item, parts }) => {
      const blanks = parts.filter(
        (part): part is Extract<ParsedPart, { kind: 'blank' }> => part.kind === 'blank'
      )
      const answers = answersByItem[item.id] || {}
      return (
        blanks.length > 0 &&
        blanks.every((part) => answerIsCorrect(answers[part.partIndex] || '', part.expected))
      )
    }).length

    return (
      <div ref={rootRef} className="space-y-5 text-[#10245C]" data-guided-fill-activity>
        <section
          ref={summaryRef}
          tabIndex={-1}
          role="region"
          aria-label="Resultado de completar frases"
          className="space-y-5 outline-none"
        >
          <p role="status" aria-live="polite" className="text-base font-semibold leading-6">
            {correctCount === parsedItems.length
              ? '¡Perfecto! Todas las respuestas son correctas.'
              : `${correctCount} de ${parsedItems.length} respuestas correctas.`}
          </p>

          <div className="space-y-3" data-guided-fill-summary>
            {parsedItems.map(({ item, parts }) => {
              const blanks = parts.filter(
                (part): part is Extract<ParsedPart, { kind: 'blank' }> => part.kind === 'blank'
              )
              const answers = answersByItem[item.id] || {}
              const submitted = blanks.map((part) => answers[part.partIndex] || '')
              const expected = blanks.map((part) => part.expected)
              const isCorrect =
                blanks.length > 0 &&
                blanks.every((part) =>
                  answerIsCorrect(answers[part.partIndex] || '', part.expected)
                )

              return (
                <article
                  key={item.id}
                  data-guided-fill-summary-item={item.id}
                  className="rounded-2xl border border-[#EEE8FA] bg-white px-4 py-3 text-base leading-6 shadow-sm sm:px-5 sm:py-4"
                >
                  <p className="break-words font-semibold text-[#10245C]">{parts.map(part => part.kind === 'text' ? part.value : '___').join('')}</p>
                  <p className="text-[#506187]">
                    Tu respuesta:{' '}
                    <span className="text-[#10245C]">
                      {submitted.length > 0 ? submitted.join(', ') : '(sin respuesta)'}
                    </span>
                  </p>
                  {isCorrect ? (
                    <p className="font-semibold text-[#08775E]">Correcto</p>
                  ) : (
                    <p className="text-[#C13E50]">
                      Respuesta correcta: <strong>{expected.join(', ')}</strong>
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      </div>
    )
  }

  const feedbackId = currentItem ? `guided-fill-feedback-${currentItem.id}` : undefined
  const hasFeedback = feedback?.itemId === currentItem?.id ? feedback : null

  return (
    <div ref={rootRef} className="space-y-5 text-[#10245C]" data-guided-fill-activity>
      <p className="text-sm leading-6 text-[#506187]">
        Pregunta {currentIndex + 1} de {parsedItems.length}
      </p>

      <section aria-label="Actividad de completar frases" className="space-y-4">
        <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#EEE8FA] bg-white p-4 text-base leading-7 shadow-sm sm:p-6">
          <p className="break-words">
            {currentParts.map((part) => {
              if (part.kind === 'text') {
                return <span key={part.partIndex}>{part.value}</span>
              }

              const value = currentAnswers[part.partIndex] || ''
              const isCorrect = Boolean(hasFeedback && answerIsCorrect(value, part.expected))
              const isWrong = Boolean(hasFeedback && !isCorrect)

              return (
                <span key={part.partIndex} className="mx-1 inline-block max-w-full align-baseline">
                  <label
                    className="sr-only"
                    htmlFor={`guided-fill-${currentItem?.id}-${part.partIndex}`}
                  >
                    Respuesta {part.partIndex + 1}
                  </label>
                  <input
                    ref={setInputRef(part.partIndex)}
                    id={`guided-fill-${currentItem?.id}-${part.partIndex}`}
                    type="text"
                    value={value}
                    onChange={(event) => handleInputChange(part.partIndex, event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    disabled={Boolean(hasFeedback) || completed}
                    aria-label={`Respuesta ${part.partIndex + 1}`}
                    aria-describedby={feedbackId}
                    aria-invalid={isWrong || undefined}
                    style={{ width: '120px', maxWidth: '100%' }}
                    className={
                      'min-h-11 max-w-full min-w-0 rounded-none border-x-0 border-t-0 border-b-2 border-[#10245C] bg-transparent px-1 py-1 text-center text-base font-medium leading-6 text-[#10245C] outline-none transition-colors focus:border-[#245CFF] focus:outline-none focus:ring-0 focus-visible:border-[#245CFF] focus-visible:outline-none focus-visible:shadow-[0_2px_0_#245CFF] ' +
                      (isCorrect
                        ? 'border-[#08775E] text-[#08775E]'
                        : isWrong
                          ? 'border-[#C13E50] text-[#C13E50]'
                          : '')
                    }
                  />
                </span>
              )
            })}
            {currentParts.length === 1 &&
              currentParts[0]?.kind === 'text' &&
              !currentParts[0].value && (
                <span className="text-[#506187]">Contenido no configurado</span>
              )}
          </p>
        </div>

        {!hasFeedback && (
          <button
            type="button"
            onClick={handleCheck}
            disabled={!allBlanksFilled}
            className="min-h-11 w-full rounded-full bg-[#245CFF] px-5 py-2 text-base font-semibold leading-6 text-white transition-colors hover:bg-[#245CFF]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10245C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Comprobar
          </button>
        )}

        {hasFeedback && (
          <p
            id={feedbackId}
            role="status"
            aria-live="polite"
            className={
              hasFeedback.isCorrect
                ? 'min-h-6 text-base font-semibold leading-6 text-[#08775E]'
                : 'min-h-6 text-base leading-6 text-[#C13E50]'
            }
          >
            {hasFeedback.isCorrect
              ? '¡Correcto!'
              : `Respuesta correcta: ${hasFeedback.expected.join(', ')}`}
          </p>
        )}
      </section>
    </div>
  )
}
