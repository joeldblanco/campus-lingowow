'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import { GuidedLessonBlock } from './guided-lesson-block'
import { GuidedLessonActionSlot, useGuidedLessonActions } from './guided-lesson-actions'
import { cn } from '@/lib/utils'
import {
  buildGuidedLessonSteps,
  readGuidedLessonStepIndex,
  writeGuidedLessonStepIndex,
  GuidedLessonStep,
} from '@/lib/guided-lesson'
import { Block } from '@/types/course-builder'

interface GuidedLessonViewerProps {
  blocks: Block[]
  storageKey: string
  onComplete?: () => void
  isPending?: boolean
  isCompleted?: boolean
  isTeacher?: boolean
  isClassroom?: boolean
  illustratedContent?: boolean
}

const STEP_ART: Partial<Record<GuidedLessonStep['kind'], string>> = {
  reading: '/images/lessons/this-is-me/carl.webp',
  grammar: '/images/lessons/this-is-me/lucas.webp',
}

export function GuidedLessonViewer({
  blocks,
  storageKey,
  onComplete,
  isPending = false,
  isCompleted = false,
  isTeacher,
  isClassroom,
  illustratedContent = false,
}: GuidedLessonViewerProps) {
  const steps = useMemo(() => buildGuidedLessonSteps(blocks), [blocks])
  const { targets, presence, callbacks, captureTarget } = useGuidedLessonActions(steps)
  // Start at zero for the server and first client render, then restore the
  // session position after hydration so SSR markup stays deterministic.
  const [activeStep, setActiveStep] = useState(0)
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null)
  const [recordingByBlockId, setRecordingByBlockId] = useState<Record<string, boolean>>({})
  const [navigationNotice, setNavigationNotice] = useState<string | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousStepRef = useRef(activeStep)

  const activeStepIndex = steps.length > 0 ? Math.min(activeStep, steps.length - 1) : 0
  const currentStep = steps[activeStepIndex]
  const isFinalStep = steps.length > 0 && activeStepIndex === steps.length - 1
  const isRecordingActive = Object.values(recordingByBlockId).some(Boolean)
  const currentStepArt = illustratedContent && currentStep ? STEP_ART[currentStep.kind] : undefined
  const hasActivityAction = illustratedContent && currentStep?.blocks.some((block) => presence[block.id])
  const forwardActionClass = cn(
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10245C] disabled:cursor-wait disabled:opacity-60',
    hasActivityAction
      ? 'border border-[#506187] bg-[#FAF8F4] text-[#10245C] hover:bg-[#EEE8FA]'
      : 'bg-[#245CFF] text-white shadow-sm hover:bg-[#10245C]'
  )

  useEffect(() => {
    setHydratedStorageKey(storageKey)
    setActiveStep(readGuidedLessonStepIndex(storageKey, steps.length))
  }, [storageKey, steps.length])

  useEffect(() => {
    setActiveStep((current) => (steps.length > 0 ? Math.min(current, steps.length - 1) : 0))
  }, [steps.length])

  useEffect(() => {
    if (hydratedStorageKey !== storageKey) return
    writeGuidedLessonStepIndex(storageKey, activeStepIndex)
  }, [activeStepIndex, hydratedStorageKey, storageKey])

  useEffect(() => {
    if (previousStepRef.current === activeStepIndex) return

    const hiddenAudio = viewerRef.current?.querySelectorAll<HTMLAudioElement>(
      '[data-guided-step][hidden] audio'
    )

    hiddenAudio?.forEach((audio) => {
      try {
        audio.pause()
      } catch {
        // A media element can reject pause() while it is being removed.
      }
    })

    previousStepRef.current = activeStepIndex
  }, [activeStepIndex])

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [activeStepIndex])

  const goToStep = (nextStep: number) => {
    if (steps.length === 0) return

    if (nextStep !== activeStepIndex && isRecordingActive) {
      setNavigationNotice('Detén la grabación antes de cambiar de paso.')
      return
    }

    setNavigationNotice(null)
    setActiveStep(Math.min(Math.max(nextStep, 0), steps.length - 1))
  }

  const handleComplete = () => {
    if (isRecordingActive) {
      setNavigationNotice('Detén la grabación antes de completar la lección.')
      return
    }

    setNavigationNotice(null)
    onComplete?.()
  }

  if (steps.length === 0) {
    return (
      <section
        className="rounded-[24px] border border-[#506187]/20 bg-[#FAF8F4] p-8 text-[#10245C] shadow-sm"
        aria-labelledby="guided-lesson-empty"
      >
        <h2 id="guided-lesson-empty" className="text-xl font-semibold">
          Esta lección todavía no tiene contenido.
        </h2>
      </section>
    )
  }

  return (
    <section
      ref={viewerRef}
      className="guided-lesson-viewer relative overflow-hidden bg-[#FAF8F4] text-[#10245C] font-sans"
      aria-label="Lección guiada"
    >
      <div className="relative border-b border-[#506187]/20 px-6 py-6 sm:px-8">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-[#506187]">
            Paso {String(activeStepIndex + 1).padStart(2, '0')}
          </span>
          <span className="h-1 w-1 rounded-full bg-[#506187]/50" aria-hidden="true" />
          <span className="ml-auto shrink-0 text-sm text-[#506187]">
            {activeStepIndex + 1}/{steps.length}
          </span>
        </div>

        <ol className="mt-4 flex items-center gap-1" aria-label="Progreso de la lección">
          {steps.map((step, index) => {
            const isCurrent = index === activeStepIndex
            const isPast = index < activeStepIndex

            return (
              <li key={step.id} className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block h-1.5 rounded-full transition-colors',
                    isCurrent && 'bg-[#10245C]',
                    isPast && 'bg-[#506187]',
                    !isCurrent && !isPast && 'bg-[#506187]/20'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`${index + 1}. ${step.label}`}
                ></span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className={cn('relative grid gap-8 px-4 py-8 sm:px-8 sm:py-12 md:gap-8 md:px-12', currentStepArt ? 'md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]' : 'mx-auto w-full max-w-4xl')}>
        <div className="guided-lesson-content order-1 min-w-0 md:order-1" data-guided-content>
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="font-[Georgia,serif] text-[26px] font-bold leading-8 tracking-tight text-[#10245C] outline-none sm:text-[32px] sm:leading-10"
              data-task-heading
              aria-live="polite"
            >
              {currentStep.label}
            </h2>
            {isCompleted && (
              <span className="shrink-0 rounded-full bg-[#08775E]/10 px-4 py-2 text-sm font-semibold text-[#08775E]">
                Completada
              </span>
            )}
          </div>

          {steps.map((step, index) => (
            <div
              key={step.id}
              data-guided-step={step.id}
              hidden={index !== activeStepIndex}
              aria-hidden={index !== activeStepIndex}
              className="guided-lesson-step"
            >
              <div className="space-y-6">
                {step.blocks.map((block) => (
                  <div key={block.id} data-block-id={block.id} data-guided-block-type={block.type}>
                    <GuidedLessonBlock block={block} enabled={illustratedContent} suppressHeading={block.type === 'title' && block.title.trim() === step.label}>
                      <BlockPreview
                        block={block}
                        isTeacher={isTeacher}
                        isClassroom={isClassroom}
                        hideBlockHeader
                        guidedAppearance={illustratedContent}
                        guidedActionTarget={illustratedContent ? targets[step.id] : undefined}
                        onGuidedActionPresence={illustratedContent ? callbacks[block.id] : undefined}
                        onRecordingStateChange={(active) => {
                          setRecordingByBlockId((current) => ({ ...current, [block.id]: active }))
                        }}
                      />
                    </GuidedLessonBlock>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {currentStepArt && (
          <aside
            className="guided-lesson-art order-2 flex min-h-[240px] items-end justify-center overflow-hidden rounded-[48%_52%_44%_56%/42%_44%_56%_58%] bg-[#EEE8FA] md:order-2 md:min-h-[320px]"
            data-guided-art
            aria-hidden="true"
          >
            <div className="relative h-[280px] w-full md:h-[360px]">
              <Image
                src={currentStepArt}
                alt=""
                aria-hidden="true"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-contain object-bottom drop-shadow-[0_18px_20px_rgba(16,36,92,0.14)]"
              />
            </div>
          </aside>
        )}

        {navigationNotice && (
          <p
            className={cn('order-3 mt-6 rounded-[16px] border border-[#C13E50]/40 bg-[#FAF8F4] px-4 py-4 text-base font-medium text-[#C13E50]', currentStepArt && 'md:col-span-2')}
            role="alert"
          >
            {navigationNotice}
          </p>
        )}

        <div className={cn('order-4 mt-8 flex flex-col-reverse gap-4 border-t border-[#506187]/20 pt-6 sm:flex-row sm:items-center sm:justify-between', currentStepArt && 'md:col-span-2')}>
          <button
            type="button"
            onClick={() => goToStep(activeStepIndex - 1)}
            disabled={activeStepIndex === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#506187] bg-[#FAF8F4] px-5 text-base font-semibold text-[#10245C] transition-colors hover:bg-[#EEE8FA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10245C] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Atrás
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {isFinalStep ? (
            <button
              type="button"
              onClick={handleComplete}
              disabled={isPending}
              className={forwardActionClass}
            >
              {isPending ? 'Guardando…' : 'Completar lección'}
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(activeStepIndex + 1)}
              className={forwardActionClass}
            >
              {hasActivityAction ? 'Continuar lección' : 'Siguiente'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {illustratedContent && steps.map((step, index) => (
            <GuidedLessonActionSlot key={step.id} stepId={step.id} active={index === activeStepIndex} captureTarget={captureTarget} />
          ))}
          </div>
        </div>
      </div>

      <style>{`
        .guided-lesson-viewer,
        .guided-lesson-viewer * {
          transition-duration: 160ms;
        }

        .guided-lesson-viewer :is(button, a, input, textarea, select):focus-visible {
          outline: 2px solid #10245C;
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .guided-lesson-viewer,
          .guided-lesson-viewer * {
            scroll-behavior: auto !important;
            transition-duration: 0ms !important;
            animation-duration: 0ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </section>
  )
}

export type { GuidedLessonViewerProps }
