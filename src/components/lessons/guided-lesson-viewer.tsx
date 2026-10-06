'use client'

import Image from 'next/image'
import {
  type ComponentProps,
  type ComponentType,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import { cn } from '@/lib/utils'
import {
  buildGuidedLessonSteps,
  readGuidedLessonStepIndex,
  writeGuidedLessonStepIndex,
  GuidedLessonStep,
} from '@/lib/guided-lesson'
import { Block } from '@/types/course-builder'

type GuidedBlockPreviewProps = ComponentProps<typeof BlockPreview> & {
  onRecordingStateChange?: (active: boolean) => void
}

// The callback is added to BlockPreview by the lesson viewer integration. The
// cast keeps this isolated pilot source compatible with the current renderer
// while allowing recording state to be reported when that prop is available.
const GuidedBlockPreview = BlockPreview as ComponentType<GuidedBlockPreviewProps>

interface GuidedLessonViewerProps {
  blocks: Block[]
  storageKey: string
  onComplete?: () => void
  isPending?: boolean
  isCompleted?: boolean
  isTeacher?: boolean
  isClassroom?: boolean
}

const STEP_ART: Record<GuidedLessonStep['kind'], string> = {
  reading: '/images/lessons/this-is-me/carl.png',
  listening: '/images/lessons/this-is-me/speaking.png',
  vocabulary: '/images/lessons/this-is-me/lucas.png',
  grammar: '/images/lessons/this-is-me/lucas.png',
  speaking: '/images/lessons/this-is-me/speaking.png',
  writing: '/images/lessons/this-is-me/writing.png',
  practice: '/images/lessons/this-is-me/speaking.png',
  content: '/images/lessons/this-is-me/lucas.png',
}

export function GuidedLessonViewer({
  blocks,
  storageKey,
  onComplete,
  isPending = false,
  isCompleted = false,
  isTeacher,
  isClassroom,
}: GuidedLessonViewerProps) {
  const steps = useMemo(() => buildGuidedLessonSteps(blocks), [blocks])
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
        className="rounded-[2rem] border border-[#e8dfd2] bg-[#fffaf1] p-8 text-[#14213d] shadow-sm"
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
      className="guided-lesson-viewer relative overflow-hidden bg-[#fffaf1] text-[#14213d]"
      aria-labelledby="guided-lesson-title"
    >
      <h1 id="guided-lesson-title" className="sr-only">
        Lección guiada
      </h1>

      <div className="relative border-b border-[#e8dfd2] px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#76609f]">
            Paso {String(activeStepIndex + 1).padStart(2, '0')}
          </span>
          <span className="h-1 w-1 rounded-full bg-[#c8bddc]" aria-hidden="true" />
          <span className="truncate font-semibold text-[#14213d]">{currentStep.label}</span>
          <span className="ml-auto shrink-0 font-mono text-xs text-[#766b86]">
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
                    isCurrent && 'bg-[#14213d]',
                    isPast && 'bg-[#76609f]',
                    !isCurrent && !isPast && 'bg-[#d9d0e5]'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`${index + 1}. ${step.label}`}
                >
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="relative grid gap-8 px-4 py-8 sm:px-8 sm:py-10 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)] md:gap-10 md:px-10">
        <div className="order-2 min-w-0 md:order-1">
          <div className="mb-7 flex items-start justify-between gap-4">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
              aria-live="polite"
            >
              {currentStep.label}
            </h2>
            {isCompleted && (
              <span className="shrink-0 rounded-full bg-[#e5f2e8] px-3 py-1 text-xs font-semibold text-[#2d6b45]">
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
              <div className="space-y-5">
                {step.blocks.map((block) => (
                  <div key={block.id} data-block-id={block.id} data-guided-block-type={block.type}>
                    <GuidedBlockPreview
                      block={block}
                      isTeacher={isTeacher}
                      isClassroom={isClassroom}
                      hideBlockHeader
                      onRecordingStateChange={(active) => {
                        setRecordingByBlockId((current) => ({ ...current, [block.id]: active }))
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className="relative order-1 flex min-h-[220px] items-end justify-center overflow-hidden rounded-[48%_52%_44%_56%/42%_44%_56%_58%] bg-[#eee8fa] md:order-2 md:min-h-[380px]">
          <div className="pointer-events-none absolute -left-10 top-8 h-32 w-32 rounded-full bg-[#f5d6b4]/50 blur-2xl" />
          <div className="relative h-[270px] w-full md:h-[430px]">
            <Image
              src={STEP_ART[currentStep.kind]}
              alt=""
              aria-hidden="true"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-contain object-bottom drop-shadow-[0_18px_20px_rgba(63,44,100,0.14)]"
            />
          </div>
        </aside>

        {navigationNotice && (
          <p
            className="mt-5 rounded-xl border border-[#e4b9a9] bg-[#fff1eb] px-4 py-3 text-sm font-medium text-[#8d3f2f]"
            role="alert"
          >
            {navigationNotice}
          </p>
        )}

        <div className="order-3 mt-8 flex flex-col-reverse gap-3 border-t border-[#e8dfd2] pt-6 sm:flex-row sm:items-center sm:justify-between md:col-span-2">
          <button
            type="button"
            onClick={() => goToStep(activeStepIndex - 1)}
            disabled={activeStepIndex === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#cfc5df] bg-white px-5 text-sm font-semibold text-[#3e3553] transition-colors hover:bg-[#f6f1fd] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Atrás
          </button>

          {isFinalStep ? (
            <button
              type="button"
              onClick={handleComplete}
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#14213d] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#273a64] disabled:cursor-wait disabled:opacity-60"
            >
              {isPending ? 'Guardando…' : 'Completar lección'}
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(activeStepIndex + 1)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#14213d] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#273a64]"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <style>{`
        .guided-lesson-viewer,
        .guided-lesson-viewer * {
          transition-duration: 180ms;
        }

        .guided-lesson-viewer [data-guided-block-type='vocabulary'] .grid {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .guided-lesson-viewer [data-guided-block-type='vocabulary'] .grid > * {
          border: 0;
          border-bottom: 1px solid #e8dfd2;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
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
