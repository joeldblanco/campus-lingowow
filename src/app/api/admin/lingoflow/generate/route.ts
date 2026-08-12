import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { auth } from '@/auth'
import { LINGOFLOW_AI_RATE_LIMIT } from '@/config/lingoflow'
import { createLingoFlowDraft, LingoFlowAiResponseError, LingoFlowAiUnavailableError } from '@/lib/lingoflow/gemini'
import { getLingoFlowReadModel } from '@/lib/lingoflow/read-model'
import { getRateLimitHeaders, rateLimit } from '@/lib/rate-limit'
import { lingoFlowGenerateSchema } from '@/schemas/lingoflow'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (!session.user.roles?.includes(UserRole.ADMIN)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  if (process.env.LINGOFLOW_AI_ENABLED !== 'true') {
    return NextResponse.json({ error: 'LingoFlow AI no está disponible' }, { status: 503 })
  }

  const limit = rateLimit(`lingoflow:${session.user.id}`, LINGOFLOW_AI_RATE_LIMIT)
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Demasiados borradores solicitados. Intenta nuevamente en un momento.' },
      { status: 429, headers: getRateLimitHeaders(limit) }
    )
  }

  try {
    const body = lingoFlowGenerateSchema.parse(await request.json())
    const metrics = await getLingoFlowReadModel()
    const draft = await createLingoFlowDraft(body.mode, metrics)

    return NextResponse.json({ draft }, { headers: getRateLimitHeaders(limit) })
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }
    if (error instanceof LingoFlowAiUnavailableError) {
      return NextResponse.json({ error: 'No fue posible generar el borrador' }, { status: 502 })
    }
    if (error instanceof LingoFlowAiResponseError) {
      return NextResponse.json({ error: 'La respuesta de IA no fue válida' }, { status: 502 })
    }
    return NextResponse.json({ error: 'No fue posible generar el borrador' }, { status: 502 })
  }
}
