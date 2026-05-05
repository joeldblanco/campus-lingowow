import { z } from 'zod'
import {
  getBlockResponses,
  getPendingBlockResponses,
  gradeBlockResponse,
} from '@/lib/actions/block-responses'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

export const blockResponseTools: AnyToolModule[] = [
  {
    name: 'lingowow_block_responses_list',
    description:
      'Lista las respuestas (block responses) de un bloque de contenido para un usuario específico. Si se omite userId, usa el dueño de la API key.',
    scopes: ['mcp:grades:read'],
    inputShape: {
      contentId: z.string().min(1),
      userId: z.string().optional(),
    },
    handler: async ({ contentId, userId }) => {
      const result = await getBlockResponses(contentId, userId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_block_responses_pending',
    description:
      'Lista respuestas pendientes de calificar (typically essay/recording). Filtro opcional por lessonId. Solo TEACHER/ADMIN.',
    scopes: ['mcp:grades:read'],
    inputShape: {
      lessonId: z.string().optional(),
    },
    handler: async ({ lessonId }) => {
      const result = await getPendingBlockResponses(lessonId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_block_responses_grade',
    description:
      'Califica una respuesta de bloque manualmente. Score no puede exceder maxScore del bloque (si está definido). El gradedBy se toma de la sesión/contexto MCP.',
    scopes: ['mcp:grades:write'],
    inputShape: {
      responseId: z.string().min(1),
      score: z.number().min(0),
      feedback: z.string().default(''),
    },
    handler: async ({ responseId, score, feedback }) => {
      const result = await gradeBlockResponse(responseId, score, feedback)
      return unwrapActionResult(result)
    },
  },
]
