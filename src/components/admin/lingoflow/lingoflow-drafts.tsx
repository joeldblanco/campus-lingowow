'use client'

import { useState } from 'react'
import { Bot, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { LingoFlowDraft, LingoFlowMode } from '@/types/lingoflow'

const MODES: { value: LingoFlowMode; label: string; description: string }[] = [
  { value: 'growth-analysis', label: 'Análisis de crecimiento', description: 'Próximos experimentos basados en agregados.' },
  { value: 'whatsapp-referral-draft', label: 'Borrador de referidos', description: 'Mensaje para WhatsApp, sin enviar.' },
  { value: 'instagram-draft', label: 'Borrador para Instagram', description: 'Texto para revisar, sin publicar.' },
]

export function LingoFlowDrafts() {
  const [loading, setLoading] = useState<LingoFlowMode | null>(null)
  const [draft, setDraft] = useState<LingoFlowDraft | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate(mode: LingoFlowMode) {
    setLoading(mode)
    setError(null)
    try {
      const response = await fetch('/api/admin/lingoflow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const data: { draft?: LingoFlowDraft; error?: string } = await response.json()
      if (!response.ok || !data.draft) throw new Error(data.error ?? 'No fue posible generar el borrador')
      setDraft(data.draft)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible generar el borrador')
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2 font-display text-xl"><Bot className="size-5 shrink-0 text-primary" />Borradores con Gemini</CardTitle>
        <CardDescription>Recibe solo métricas agregadas. No guarda, envía ni publica contenido.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          {MODES.map((mode) => (
            <Button key={mode.value} type="button" variant="outline" className="h-auto min-h-20 min-w-0 whitespace-normal p-3 text-left" onClick={() => generate(mode.value)} disabled={loading !== null}>
              {loading === mode.value ? <Loader2 className="size-4 shrink-0 animate-spin" /> : null}
              <span className="min-w-0"><span className="block font-medium">{mode.label}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{mode.description}</span></span>
            </Button>
          ))}
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {draft ? (
          <section aria-live="polite" className="min-w-0 rounded-lg border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900 dark:bg-teal-950/20">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">Borrador — requiere revisión humana</p>
            <h3 className="break-words font-display text-lg font-semibold">{draft.title}</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{draft.content}</p>
            <p className="mt-3 text-xs text-muted-foreground">{draft.safetyNote}</p>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
