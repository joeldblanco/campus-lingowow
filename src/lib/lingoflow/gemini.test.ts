import { describe, expect, it, vi } from 'vitest'
import { createLingoFlowDraft, LingoFlowAiResponseError } from './gemini'

const metrics = { activeStudents: 4, targetStudents: 30, gap: 26, progressPercent: 13.3 }

describe('createLingoFlowDraft', () => {
  it('sends only aggregate metrics and returns a validated draft', async () => {
    const generateText = vi.fn().mockResolvedValue(JSON.stringify({
      title: 'Próximo experimento',
      content: 'Pide una recomendación a alumnos actuales.',
      safetyNote: 'Borrador sin envío ni publicación; requiere revisión humana.',
    }))

    await expect(createLingoFlowDraft('whatsapp-referral-draft', metrics, generateText)).resolves.toEqual({
      isDraft: true,
      title: 'Próximo experimento',
      content: 'Pide una recomendación a alumnos actuales.',
      safetyNote: 'Borrador sin envío ni publicación; requiere revisión humana.',
    })
    expect(generateText).toHaveBeenCalledWith(expect.stringContaining('estudiantes activos=4'))
    expect(generateText.mock.calls[0][0]).not.toContain('student-')
  })

  it('rejects a response outside the closed output schema', async () => {
    await expect(createLingoFlowDraft('growth-analysis', metrics, async () => '{"content":"sin título"}')).rejects.toBeInstanceOf(LingoFlowAiResponseError)
  })
})
