'use client'

import { useState, useCallback } from 'react'
import type { ChatMessage, ChatInteraction, AiChatResponse } from '@/types/ai-chat'

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastToolExecuted, setLastToolExecuted] = useState<string | undefined>()
  const [pendingInteraction, setPendingInteraction] = useState<ChatInteraction | undefined>()

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      const userMessage: ChatMessage = { role: 'user', content: content.trim() }
      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)
      setIsLoading(true)
      setLastToolExecuted(undefined)
      setPendingInteraction(undefined)

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedMessages }),
        })

        const data = (await response.json()) as AiChatResponse

        if (data.success && data.data) {
          const modelMessage: ChatMessage = {
            role: 'model',
            content: data.data.response,
            ...(data.data.interaction && { interaction: data.data.interaction }),
          }
          setMessages((prev) => [...prev, modelMessage])
          if (data.data.toolExecuted) {
            setLastToolExecuted(data.data.toolExecuted)
          }
          if (data.data.interaction) {
            setPendingInteraction(data.data.interaction)
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

  const selectOption = useCallback(
    (label: string) => {
      setPendingInteraction(undefined)
      sendMessage(label)
    },
    [sendMessage]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    setLastToolExecuted(undefined)
    setPendingInteraction(undefined)
  }, [])

  return { messages, isLoading, lastToolExecuted, pendingInteraction, sendMessage, selectOption, clearMessages }
}
