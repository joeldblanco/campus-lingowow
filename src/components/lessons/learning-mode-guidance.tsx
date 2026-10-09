'use client'

import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

/** Mode changes the practice instructions, never the answer, recording, or grading state. */
export function LearningModeGuidance({ modes, classroom = false }: { modes: unknown; classroom?: boolean }) {
  const [mode, setMode] = useState<'individual' | 'teacher'>(classroom ? 'teacher' : 'individual')
  const descriptionId = useId()
  if (!modes || typeof modes !== 'object') return null
  const instructions = modes as Record<string, unknown>
  if (typeof instructions.individual !== 'string' || !instructions.individual.trim() ||
      typeof instructions.teacher !== 'string' || !instructions.teacher.trim()) return null
  return <div className="mb-5 space-y-4" data-learning-mode={mode}>
    <div role="radiogroup" aria-label="Forma de practicar" aria-describedby={descriptionId}
      className="flex w-full max-w-lg rounded-full border border-[#506187]/30 bg-white p-1">
      {(['individual', 'teacher'] as const).map(value => <button key={value} type="button" role="radio"
        aria-checked={mode === value} tabIndex={mode === value ? 0 : -1} onClick={() => setMode(value)}
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const next = event.key === 'Home' ? 'individual' : event.key === 'End' ? 'teacher' : value === 'individual' ? 'teacher' : 'individual'
          setMode(next)
          const index = next === 'individual' ? 0 : 1
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[index]?.focus()
        }}
        className={cn('min-h-11 flex-1 rounded-full px-3 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10245C]',
          mode === value ? 'bg-[#245CFF] text-white' : 'text-[#10245C] hover:bg-[#EEE8FA]')}>
        {value === 'individual' ? 'Por mi cuenta' : 'Con mi profesora'}
      </button>)}
    </div>
    <p id={descriptionId} className="text-base leading-7 text-[#506187]">{String(instructions[mode])}</p>
  </div>
}
