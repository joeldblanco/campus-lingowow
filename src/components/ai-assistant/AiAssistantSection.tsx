'use client'

import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { AiChatMessages } from './AiChatMessages'
import { AiChatInput } from './AiChatInput'
import { useAiChat } from '@/hooks/use-ai-chat'

const WELCOME_MESSAGES: Record<string, string> = {
  [UserRole.GUEST]:
    '¡Hola! Soy el asistente de Lingowow. Puedo ayudarte a conocer nuestros programas y planes de inglés, verificar disponibilidad de horarios y gestionar tu inscripción. ¿En qué puedo ayudarte?',
  [UserRole.STUDENT]:
    '¡Hola! Soy tu asistente de Lingowow. Puedo ayudarte a reagendar tus clases, consultar disponibilidad de horarios o responder preguntas sobre tu programa. ¿En qué puedo ayudarte hoy?',
  [UserRole.TEACHER]:
    '¡Hola! Soy el asistente de Lingowow. ¿En qué puedo ayudarte?',
  [UserRole.ADMIN]:
    '¡Hola! Soy el asistente de Lingowow. ¿En qué puedo ayudarte?',
}

export function AiAssistantSection() {
  const { data: session } = useSession()
  const { messages, isLoading, lastToolExecuted, sendMessage } = useAiChat()

  const userRoles = session?.user?.roles ?? []
  const primaryRole =
    userRoles.includes(UserRole.ADMIN)
      ? UserRole.ADMIN
      : userRoles.includes(UserRole.TEACHER)
        ? UserRole.TEACHER
        : userRoles.includes(UserRole.STUDENT)
          ? UserRole.STUDENT
          : UserRole.GUEST

  const welcomeMessage = WELCOME_MESSAGES[primaryRole]

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Bot className="h-5 w-5 text-primary" />
          Asistente Lingowow
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col" style={{ height: '480px' }}>
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-8 text-center">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                {welcomeMessage}
              </p>
            </div>
          ) : (
            <AiChatMessages
              messages={messages}
              isLoading={isLoading}
              lastToolExecuted={lastToolExecuted}
            />
          )}
          <AiChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
      </CardContent>
    </Card>
  )
}
