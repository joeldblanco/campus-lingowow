'use client'

import { useState } from 'react'

export function getLearningReviewChecklist(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

/** Self-review records practice completion, not an assessed proficiency score. */
export function LearningReviewChecklist({ items, onReady }: { items: string[]; onReady: (ready: boolean) => void }) {
  const [checked, setChecked] = useState<number[]>([])
  return <fieldset className="space-y-3 text-base leading-6 text-[#10245C]">
    <legend className="mb-3 font-semibold">Revisa tu respuesta</legend>
    {items.map((item, index) => <label key={index} className="flex min-h-11 items-start gap-3">
      <input type="checkbox" checked={checked.includes(index)} className="mt-1 h-5 w-5 shrink-0 accent-[#245CFF]"
        onChange={event => {
          const next = event.target.checked ? [...checked, index] : checked.filter(value => value !== index)
          setChecked(next)
          onReady(next.length === items.length)
        }} />
      <span>{item}</span>
    </label>)}
  </fieldset>
}
