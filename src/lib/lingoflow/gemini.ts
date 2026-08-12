import { GoogleGenerativeAI } from '@google/generative-ai'
import { LINGOFLOW_AI_MODEL } from '@/config/lingoflow'
import { lingoFlowDraftSchema } from '@/schemas/lingoflow'
import type { LingoFlowDraft, LingoFlowMode, LingoFlowReadModel } from '@/types/lingoflow'

export class LingoFlowAiUnavailableError extends Error {}
export class LingoFlowAiResponseError extends Error {}

type GeminiTextGenerator = (prompt: string) => Promise<string>

const MODE_INSTRUCTIONS: Record<LingoFlowMode, string> = {
  'growth-analysis': 'Analiza el avance hacia la meta y propone hasta tres próximos experimentos concretos.',
  'whatsapp-referral-draft': 'Redacta un mensaje breve para pedir referidos por WhatsApp, sin presión ni promesas.',
  'instagram-draft': 'Redacta un borrador breve para Instagram, sin métricas no proporcionadas ni llamados a publicar.',
}

function buildPrompt(mode: LingoFlowMode, metrics: LingoFlowReadModel): string {
  return `Eres un asistente interno de Lingowow. ${MODE_INSTRUCTIONS[mode]}
Usa exclusivamente estos agregados: estudiantes activos=${metrics.activeStudents}, meta=${metrics.targetStudents}, brecha=${metrics.gap}, avance=${metrics.progressPercent}%.
Contexto declarado, no medido: referidos por WhatsApp son el canal principal e Instagram es secundario. Newsletter es un opt-in separado.
No inventes métricas, no incluyas datos personales, identificadores, enlaces, ni instrucciones para enviar o publicar. Esto es solo un borrador para revisión humana.
Responde exclusivamente JSON válido con title, content y safetyNote. safetyNote debe indicar que es un borrador sin envío ni publicación.`
}

function createGeminiTextGenerator(): GeminiTextGenerator {
  if (!process.env.GEMINI_API_KEY) throw new LingoFlowAiUnavailableError('Gemini is not configured')

  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = client.getGenerativeModel({
    model: LINGOFLOW_AI_MODEL,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  })

  return async (prompt) => (await model.generateContent(prompt)).response.text()
}

export async function createLingoFlowDraft(
  mode: LingoFlowMode,
  metrics: LingoFlowReadModel,
  generateText: GeminiTextGenerator = createGeminiTextGenerator()
): Promise<LingoFlowDraft> {
  let responseText: string
  try {
    responseText = await generateText(buildPrompt(mode, metrics))
  } catch (error) {
    if (error instanceof LingoFlowAiUnavailableError) throw error
    throw new LingoFlowAiUnavailableError('Gemini request failed')
  }

  try {
    return { ...lingoFlowDraftSchema.parse(JSON.parse(responseText)), isDraft: true }
  } catch {
    throw new LingoFlowAiResponseError('Gemini returned an invalid draft')
  }
}
