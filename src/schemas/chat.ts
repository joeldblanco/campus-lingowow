import * as z from 'zod'

export const MAX_CHAT_MESSAGE_CHARS = 4000
export const MAX_CHAT_HISTORY_MESSAGES = 50

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model'], {
    error: (issue) =>
      issue.input === undefined ? 'role es requerido' : 'role debe ser "user" o "model"',
  }),
  content: z
    .string({
      error: (issue) => (issue.input === undefined ? 'content es requerido' : undefined),
    })
    .min(1, 'content no puede estar vacío')
    .max(MAX_CHAT_MESSAGE_CHARS, `content excede ${MAX_CHAT_MESSAGE_CHARS} caracteres`),
})

export const AiChatRequestSchema = z.object({
  messages: z
    .array(ChatMessageSchema)
    .min(1, 'Se requiere al menos un mensaje')
    .max(MAX_CHAT_HISTORY_MESSAGES, `Máximo ${MAX_CHAT_HISTORY_MESSAGES} mensajes por solicitud`),
})

export type ValidatedChatMessage = z.infer<typeof ChatMessageSchema>
export type ValidatedAiChatRequest = z.infer<typeof AiChatRequestSchema>
