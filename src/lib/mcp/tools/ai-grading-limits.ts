import { z } from 'zod'
import { getAIGradingUsageHistory, getUserAIGradingLimits } from '@/lib/actions/ai-grading-limits'
import type { AnyToolModule } from '@/lib/mcp/types'

export const aiGradingLimitsTools: AnyToolModule[] = [
  {
    name: 'lingowow_ai_grading_limits_get',
    description:
      'Devuelve límites, uso del mes en curso, restantes y plan slug para un usuario (o el dueño de la API key si se omite userId). -1 = ilimitado.',
    scopes: ['mcp:ai-grading:read'],
    inputShape: {
      userId: z.string().optional(),
    },
    handler: async ({ userId }) => getUserAIGradingLimits(userId),
  },

  {
    name: 'lingowow_ai_grading_history',
    description:
      'Historial de uso de calificación con IA del usuario autenticado (vía la API key). Limit por defecto 10.',
    scopes: ['mcp:ai-grading:read'],
    inputShape: {
      limit: z.number().int().min(1).max(200).optional().default(10),
    },
    handler: async ({ limit }) => getAIGradingUsageHistory(limit),
  },
]
