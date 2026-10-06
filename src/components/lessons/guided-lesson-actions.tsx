'use client'

import { useCallback, useMemo, useState } from 'react'
import type { GuidedLessonStep } from '@/lib/guided-lesson'

/** Stable footer targets keep the exercise and grading component mounted between steps. */
export function useGuidedLessonActions(steps: GuidedLessonStep[]) {
  const [targets, setTargets] = useState<Record<string, HTMLElement | null>>({})
  const [presence, setPresence] = useState<Record<string, boolean>>({})
  const captureTarget = useCallback((stepId: string, element: HTMLElement | null) => {
    setTargets((current) => current[stepId] === element ? current : { ...current, [stepId]: element })
  }, [])
  const callbacks = useMemo(() => Object.fromEntries(
    steps.flatMap((step) => step.blocks.map((block) => [block.id, (present: boolean) => {
      setPresence((current) => current[block.id] === present ? current : { ...current, [block.id]: present })
    }] as const))
  ), [steps])

  return { targets, presence, callbacks, captureTarget }
}

export function GuidedLessonActionSlot({ stepId, active, captureTarget }: {
  stepId: string
  active: boolean
  captureTarget: (stepId: string, element: HTMLElement | null) => void
}) {
  const capture = useCallback((element: HTMLDivElement | null) => {
    captureTarget(stepId, element)
  }, [captureTarget, stepId])
  return <div ref={capture} hidden={!active} data-guided-footer={stepId} />
}
