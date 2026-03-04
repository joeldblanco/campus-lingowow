'use client'

import { useState, useCallback } from 'react'
import type { ChatMessage, AiChatResponse } from '@/types/ai-chat'

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastToolExecuted, setLastToolExecuted] = useState<string | undefined>()

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      const userMessage: ChatMessage = { role: 'user', content: content.trim() }
      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)
      setIsLoading(true)
      setLastToolExecuted(undefined)

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedMessages }),
        })

        const data = (await response.json()) as AiChatResponse

        if (data.success && data.data) {
          setMessages((prev) => [
            ...prev,
            { role: 'model', content: data.data!.response },
          ])
          if (data.data.toolExecuted) {
            setLastToolExecuted(data.data.toolExecuted)
          }
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: 'model',
              content:
                'Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.',
            },
          ])
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content:
              'Error de conexión. Por favor verifica tu conexión e intenta de nuevo.',
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    setLastToolExecuted(undefined)
  }, [])

  return { messages, isLoading, lastToolExecuted, sendMessage, clearMessages }
}
