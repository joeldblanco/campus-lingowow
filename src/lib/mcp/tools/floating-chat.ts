import { z } from 'zod'
import { db } from '@/lib/db'
import type { AnyToolModule } from '@/lib/mcp/types'

/**
 * Tools de administración de floating chat (vista admin).
 *
 * Las server actions originales en floating-chat.ts requieren que el caller
 * sea participante de la conversación, lo cual no aplica a un admin que solo
 * está monitoreando. Estas tools van DB-direct para esquivar esa restricción.
 */

export const floatingChatTools: AnyToolModule[] = [
  {
    name: 'lingowow_floating_chat_conversations_list',
    description:
      'Lista conversaciones del chat flotante (admin). Filtros opcionales: isGroup, userId (conversaciones donde participa).',
    scopes: ['mcp:notifications:read'],
    inputShape: {
      isGroup: z.boolean().optional(),
      userId: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ isGroup, userId, limit, offset }) => {
      const where: Record<string, unknown> = {}
      if (isGroup !== undefined) where.isGroup = isGroup
      if (userId) where.participants = { some: { userId } }
      const [conversations, total] = await Promise.all([
        db.floatingConversation.findMany({
          where,
          include: {
            participants: {
              include: {
                user: { select: { id: true, name: true, lastName: true, email: true } },
              },
            },
            _count: { select: { messages: true } },
          },
          orderBy: { lastMessageAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        db.floatingConversation.count({ where }),
      ])
      return { total, limit, offset, conversations }
    },
  },

  {
    name: 'lingowow_floating_chat_conversation_get',
    description:
      'Devuelve una conversación del chat flotante con sus participantes y los últimos mensajes.',
    scopes: ['mcp:notifications:read'],
    inputShape: {
      conversationId: z.string().min(1),
      messageLimit: z.number().int().min(1).max(500).optional().default(100),
    },
    handler: async ({ conversationId, messageLimit }) => {
      const conversation = await db.floatingConversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, lastName: true, email: true } },
            },
          },
          messages: {
            orderBy: { timestamp: 'desc' },
            take: messageLimit,
            include: {
              sender: { select: { id: true, name: true, lastName: true, email: true } },
            },
          },
        },
      })
      if (!conversation) throw new Error('Conversación no encontrada')
      return conversation
    },
  },

  {
    name: 'lingowow_floating_chat_messages_list',
    description: 'Lista mensajes de una conversación con paginación (orden cronológico).',
    scopes: ['mcp:notifications:read'],
    inputShape: {
      conversationId: z.string().min(1),
      limit: z.number().int().min(1).max(500).optional().default(100),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ conversationId, limit, offset }) => {
      const messages = await db.floatingChatMessage.findMany({
        where: { conversationId },
        orderBy: { timestamp: 'asc' },
        skip: offset,
        take: limit,
        include: {
          sender: { select: { id: true, name: true, lastName: true, email: true } },
        },
      })
      return messages
    },
  },

  {
    name: 'lingowow_floating_chat_archive',
    description:
      'Marca como archivada la conversación para todos sus participantes (admin maintenance).',
    scopes: ['mcp:notifications:write'],
    inputShape: { conversationId: z.string().min(1) },
    handler: async ({ conversationId }) => {
      const result = await db.conversationParticipant.updateMany({
        where: { conversationId },
        data: { isArchived: true },
      })
      return { success: true, updatedParticipants: result.count }
    },
  },
]
