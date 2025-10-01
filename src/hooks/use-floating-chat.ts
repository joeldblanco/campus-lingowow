'use client'

import { useState } from 'react'
import { getConversationMessages, createFloatingConversation } from '@/lib/actions/floating-chat'

interface Message {
  id: string
  content: string
  senderId: string
  timestamp: Date
  sender: {
    id: string
    name: string
    lastName: string
    image?: string | null
    teamBadge?: string | null
  }
}

export function useFloatingChat(userId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoading(true)
      const result = await getConversationMessages(conversationId, userId)
      if (result.success && result.messages) {
        setMessages(result.messages as Message[])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startConversation = async (participantId: string) => {
    try {
      const result = await createFloatingConversation([participantId])
      if (result.success && result.conversationId) {
        await loadMessages(result.conversationId)
        return result.conversationId
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
    return null
  }

  return {
    messages,
    isLoading,
    loadMessages,
    startConversation,
    setMessages
  }
}
