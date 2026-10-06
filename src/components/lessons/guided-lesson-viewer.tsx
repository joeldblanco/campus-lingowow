'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import { GuidedLessonBlock } from './guided-lesson-block'
import { GuidedLessonActionSlot, useGuidedLessonActions } from './guided-lesson-actions'
import { GuidedLessonScene, LessonSceneBackdrop } from './guided-lesson-scene'
import { focusGuidedLessonHeading, resetGuidedLessonViewport } from './guided-lesson-scroll'
import { cn } from '@/lib/utils'
import {
  buildGuidedLessonSteps,
  readGuidedLessonStepIndex,
  writeGuidedLessonStepIndex,
  type GuidedLessonStep,
} from '@/lib/guided-lesson'
import { buildIllustratedLessonSteps, getIllustratedLessonTaskTitle } from '@/lib/illustrated-lesson'
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

const STEP_ART: Partial<
  Record<GuidedLessonStep['kind'], { src: string; variant: 'portrait' | 'grammar' }>
> = {
  vocabulary: {
    src: '/images/lessons/this-is-me/peter.webp',
    variant: 'portrait',
  },
  reading: {
    src: '/images/lessons/this-is-me/carl.webp',
    variant: 'portrait',
  },
  grammar: {
    src: '/images/lessons/this-is-me/lucas.webp',
    variant: 'grammar',
  },
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
  const steps = useMemo(
    () =>
      illustratedContent ? buildIllustratedLessonSteps(blocks) : buildGuidedLessonSteps(blocks),
    [blocks, illustratedContent]
  )
  const positionStorageKey = illustratedContent ? `${storageKey}:scene-v2` : storageKey
  const { targets, presence, callbacks, captureTarget } = useGuidedLessonActions(steps)
  // Start at zero for the server and first client render, then restore the
  // session position after hydration so SSR markup stays deterministic.
  const [activeStep, setActiveStep] = useState(0)
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null)
  const [recordingByBlockId, setRecordingByBlockId] = useState<Record<string, boolean>>({})
  const [navigationNotice, setNavigationNotice] = useState<string | null>(null)
  const viewerRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousStepRef = useRef(activeStep)

  const activeStepIndex = steps.length > 0 ? Math.min(activeStep, steps.length - 1) : 0
  const currentStep = steps[activeStepIndex]
  const taskTitle = currentStep && illustratedContent ? getIllustratedLessonTaskTitle(currentStep) : currentStep?.label
  const isFinalStep = steps.length > 0 && activeStepIndex === steps.length - 1
  const isRecordingActive = Object.values(recordingByBlockId).some(Boolean)
  const currentStepArt = illustratedContent && currentStep ? STEP_ART[currentStep.kind] : undefined
  const currentSceneSubject =
    currentStep?.sceneSubject ??
    currentStep?.blocks
      .find((block) => block.type === 'vocabulary')
      ?.items?.find((item) => item.term.trim().toLowerCase() === 'name')?.definition
  const hasActivityAction =
    illustratedContent && currentStep?.blocks.some((block) => presence[block.id])
  const forwardActionClass = cn(
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10245C] disabled:cursor-wait disabled:opacity-60',
    hasActivityAction
      ? 'border border-[#506187] bg-[#FAF8F4] text-[#10245C] hover:bg-[#EEE8FA]'
      : 'bg-[#245CFF] text-white shadow-sm hover:bg-[#10245C]'
  )

  useEffect(() => {
    setHydratedStorageKey(positionStorageKey)
    setActiveStep(readGuidedLessonStepIndex(positionStorageKey, steps.length))
  }, [positionStorageKey, steps.length])

  useEffect(() => {
    setActiveStep((current) => (steps.length > 0 ? Math.min(current, steps.length - 1) : 0))
  }, [steps.length])

  useEffect(() => {
    if (hydratedStorageKey !== positionStorageKey) return
    writeGuidedLessonStepIndex(positionStorageKey, activeStepIndex)
  }, [activeStepIndex, hydratedStorageKey, positionStorageKey])

  useEffect(() => {
    const changedStep = previousStepRef.current !== activeStepIndex

    if (changedStep) {
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

      resetGuidedLessonViewport(viewerRef.current)
      previousStepRef.current = activeStepIndex
    }

    focusGuidedLessonHeading(headingRef.current)
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
      className="guided-lesson-viewer relative isolate overflow-clip bg-[#FAF8F4] font-sans text-[#10245C]"
      aria-label="Lección guiada"
      data-illustrated={illustratedContent || undefined}
    >
      {illustratedContent && <LessonSceneBackdrop variant={currentStepArt?.variant ?? 'plain'} />}
      <div className="relative border-b border-[#506187]/20 px-5 py-2 sm:px-8 sm:py-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-[#506187]">
            Paso {String(activeStepIndex + 1).padStart(2, '0')}
          </span>
          <span className="ml-auto shrink-0 text-sm text-[#506187]">
            {activeStepIndex + 1}/{steps.length}
          </span>
        </div>

        <ol className="mt-3 flex items-center gap-1.5" aria-label="Progreso de la lección">
          {steps.map((step, index) => {
            const isCurrent = index === activeStepIndex
            const isPast = index < activeStepIndex

            return (
              <li key={step.id} className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block h-1 rounded-full transition-colors',
                    isCurrent && 'bg-[#245CFF]',
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

      <div
        className={cn(
          'guided-lesson-main relative grid gap-x-6 gap-y-3 px-5 py-4 sm:px-8 sm:py-4 md:gap-x-12 md:gap-y-3 md:px-12',
          currentStepArt
            ? currentStepArt.variant === 'portrait'
              ? 'guided-lesson-main--portrait'
              : 'guided-lesson-main--grammar'
            : 'mx-auto w-full max-w-4xl'
        )}
        data-guided-layout={currentStepArt?.variant ?? 'plain'}
        data-guided-vocabulary-part={
          currentStep?.vocabularyPart
            ? `${currentStep.vocabularyPart.index}/${currentStep.vocabularyPart.total}`
            : undefined
        }
      >
        <div className="guided-lesson-content order-1 min-w-0 md:order-1" data-guided-content>
          <div className="mb-3 flex items-start justify-between gap-4">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="font-[Georgia,serif] text-[26px] font-bold leading-8 tracking-tight text-[#10245C] outline-none sm:text-[32px] sm:leading-10"
              data-task-heading
              aria-live="polite"
            >
              {taskTitle}
            </h2>
            {isCompleted && (
              <span className="shrink-0 rounded-full bg-[#08775E]/10 px-3 py-2 text-sm font-semibold text-[#08775E]">
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
              <div
                className={cn(
                  'space-y-5',
                  step.kind === 'grammar' &&
                    step.blocks.some((block) => block.type === 'structured-content') &&
                    step.blocks.some((block) => block.type === 'grammar-visualizer') &&
                    'guided-lesson-step--grammar-reference'
                )}
              >
                {step.blocks.map((block) => (
                  <div key={block.id} data-block-id={block.id} data-guided-block-type={block.type}>
                    <GuidedLessonBlock
                      block={block}
                      enabled={illustratedContent}
                      suppressHeading={block.type === 'title' && block.title.trim() === step.label}
                    >
                      <BlockPreview
                        block={block}
                        isTeacher={isTeacher}
                        isClassroom={isClassroom}
                        hideBlockHeader
                        guidedAppearance={illustratedContent}
                        guidedActionTarget={illustratedContent ? targets[step.id] : undefined}
                        onGuidedActionPresence={
                          illustratedContent ? callbacks[block.id] : undefined
                        }
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
          <GuidedLessonScene
            src={currentStepArt.src}
            kind={currentStep.kind}
            variant={currentStepArt.variant}
            subject={currentSceneSubject}
          />
        )}

        {navigationNotice && (
          <p
            className={cn(
              'order-3 rounded-[16px] border border-[#C13E50]/40 bg-[#FAF8F4] px-4 py-3 text-base font-medium text-[#C13E50]',
              currentStepArt && 'md:col-span-2'
            )}
            role="alert"
          >
            {navigationNotice}
          </p>
        )}

        <div
          className={cn(
            'guided-lesson-footer order-4 mt-2 flex flex-col-reverse gap-4 border-t border-[#506187]/20 pt-4 sm:flex-row sm:items-center sm:justify-between',
            currentStepArt && 'md:col-span-2'
          )}
          data-guided-footer-shell
        >
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
            {illustratedContent &&
              steps.map((step, index) => (
                <GuidedLessonActionSlot
                  key={step.id}
                  stepId={step.id}
                  active={index === activeStepIndex}
                  captureTarget={captureTarget}
                />
              ))}
          </div>
        </div>
      </div>

      <style>{`
        .guided-lesson-viewer {
          --guided-ivory: #FAF8F4;
          --guided-navy: #10245C;
          --guided-cobalt: #245CFF;
          --guided-lilac: #EEE8FA;
          --guided-slate: #506187;
          min-height: 100%;
          scroll-margin-top: 80px;
        }

        .guided-lesson-step[hidden], [data-guided-footer][hidden] {
          display: none !important;
        }

        .guided-lesson-main {
          grid-template-columns: minmax(0, 1fr);
        }

        .guided-lesson-viewer[data-illustrated] .guided-lesson-main {
          min-height: max(400px, calc(100svh - 260px));
          align-content: space-between;
        }

        .guided-lesson-main--portrait,
        .guided-lesson-main--grammar {
          max-width: 1120px;
          margin-inline: auto;
          width: 100%;
        }

        .guided-lesson-scene {
          contain: layout paint;
        }

        .guided-lesson-scene__figure img {
          max-height: 100%;
        }

        .guided-lesson-footer {
          min-height: 64px;
          position: sticky;
          bottom: 0;
          z-index: 20;
          background: #FAF8F4;
          padding-block: 8px;
        }

        .guided-lesson-step--grammar-reference {
          display: block;
        }

        @media (max-width: 639px) {
          .guided-lesson-footer [data-guided-footer] button {
            width: 100%;
          }
        }

        @media (min-width: 768px) {
          .guided-lesson-main--portrait {
            grid-template-columns: minmax(220px, 0.78fr) minmax(0, 1.22fr);
          }

          .guided-lesson-main--portrait .guided-lesson-content {
            grid-column: 2;
            grid-row: 1;
          }

          .guided-lesson-main--portrait .guided-lesson-art {
            grid-column: 1;
            grid-row: 1;
          }

          .guided-lesson-main--grammar {
            grid-template-columns: minmax(0, 1.8fr) minmax(190px, 0.6fr);
          }

          .guided-lesson-main--grammar .guided-lesson-content {
            grid-column: 1;
            grid-row: 1;
          }

          .guided-lesson-main--grammar .guided-lesson-art {
            grid-column: 2;
            grid-row: 1;
          }

          .guided-lesson-step--grammar-reference {
            display: grid;
            grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
            align-items: start;
            column-gap: 24px;
            row-gap: 24px;
          }

          .guided-lesson-step--grammar-reference > * {
            margin-top: 0 !important;
            min-width: 0;
          }

          .guided-lesson-step--grammar-reference > [data-guided-block-type='title'] {
            grid-column: 1 / -1;
          }

          .guided-lesson-step--grammar-reference
            [data-guided-block-type='structured-content'] {
            min-width: 0;
          }
        }

        .guided-lesson-viewer,
        .guided-lesson-viewer * {
          transition-duration: 160ms;
        }

        .guided-lesson-viewer :is(button, a, input, textarea, select):focus-visible {
          outline: 2px solid #10245C;
          outline-offset: 2px;
        }

        .guided-lesson-viewer [data-guided-block-type='vocabulary'] .grid {
          gap: 16px;
        }

        .guided-lesson-viewer [data-guided-block-type='vocabulary'] .grid > * {
          border-radius: 16px;
          border: 1px solid rgba(80, 97, 135, 0.2);
          background: rgba(255, 255, 255, 0.52);
          padding: 16px;
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
