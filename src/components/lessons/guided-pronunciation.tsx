'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Block } from '@/types/course-builder'

/** Deliberate learner playback: one sound at a time, never on entry. */
export function GuidedPronunciation({ block }: { block: Extract<Block, { type: 'vocabulary' }> }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const requestRef = useRef(0)
  const [active, setActive] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    const requests = requestRef
    return () => { requests.current++; audio?.pause() }
  }, [])

  async function play(item: typeof block.items[number]) {
    const audio = audioRef.current
    if (!audio || !item.audioUrl) return
    const request = ++requestRef.current
    audio.pause()
    audio.src = item.audioUrl
    setError(false)
    setActive(item.id)
    try { await audio.play() } catch {
      if (request === requestRef.current) { setError(true); setActive(null) }
    }
  }

  return <div data-guided-pronunciation className="space-y-3">
    <p className="text-base leading-6 text-[#506187]">Voz sintética · Toca, escucha y repite.</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {block.items.map(item => <Button key={item.id} type="button" variant="outline"
        disabled={!item.audioUrl} aria-label={`Escuchar ${item.term}`}
        aria-pressed={active === item.id} onClick={() => void play(item)}
        className="h-auto min-h-20 whitespace-normal rounded-2xl border-[#D9DDF0] bg-white px-3 py-3 text-[#10245C] shadow-sm hover:bg-[#EEE8FA] focus-visible:ring-[#2D5BFF]">
        <span className="flex w-full flex-col items-start gap-1 text-left">
          <span className="flex w-full items-center justify-between gap-2 text-lg font-semibold"><span>{item.term}</span><Volume2 className="size-5 shrink-0" aria-hidden="true" /></span>
          {item.definition && <span className="text-sm font-normal leading-5 text-[#506187]">{item.definition}</span>}
        </span>
      </Button>)}
    </div>
    <audio ref={audioRef} preload="none" onEnded={() => setActive(null)} onPause={() => setActive(null)} />
    {error && <p role="alert" className="text-sm text-[#C13E50]">No se pudo reproducir. Toca la opción para intentar de nuevo.</p>}
  </div>
}
