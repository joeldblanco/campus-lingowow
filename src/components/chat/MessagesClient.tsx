'use client'

import { usePusherChannel } from '@/hooks/use-pusher-channel'
import { MessageType, TeamBadge, UserRole } from '@prisma/client'
import React, { useCallback, useMemo, useState } from 'react'
import { ChatSidebar } from './ChatSidebar'
import { ChatWindow } from './ChatWindow'

interface ChatUser {
  id: string
  name: string
  lastName: string | null
  image: string | null
  teamBadge: TeamBadge | null
  roles?: UserRole[]
}

interface ChatParticipant {
  id: string
  conversationId: string
  userId: string
  joinedAt: Date
  lastReadAt: Date | null
  isArchived: boolean
  user: ChatUser
}

interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: MessageType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any
  timestamp: Date
  isRead: boolean
  sender: ChatUser
}

interface Conversation {
  id: string
  title: string | null
  isGroup: boolean
  lastMessage: string | null
  lastMessageAt: Date | null
  createdAt: Date
  updatedAt: Date
  participants: ChatParticipant[]
  messages: ChatMessage[]
}

interface ConversationUpdateEvent {
  conversationId: string
  lastMessage: string | null
  lastMessageAt: Date | null
  unreadCount: number
}

interface MessagesClientProps {
  initialConversations: Conversation[]
  currentUser: ChatUser
}

export const MessagesClient: React.FC<MessagesClientProps> = ({
  initialConversations,
  currentUser,
}) => {
  const [conversations, setConversations] = useState(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedConversation = conversations.find((c) => c.id === selectedId)
  const otherUser = selectedConversation?.participants.find(
    (p) => p.userId !== currentUser.id
  )?.user

  const handleConversationUpdate = useCallback((data: unknown) => {
    const event = data as ConversationUpdateEvent
    setConversations((prev) => {
      const index = prev.findIndex((c) => c.id === event.conversationId)
      if (index > -1) {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          lastMessage: event.lastMessage,
          lastMessageAt: event.lastMessageAt,
        }
        updated.sort(
          (a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
        )
        return updated
      }
      return prev
    })
  }, [])

  const handlePusherNewConversation = useCallback((data: unknown) => {
    setConversations((prev) => [data as Conversation, ...prev])
  }, [])

  const pusherEvents = useMemo(() => [
    { event: 'conversation-update', callback: handleConversationUpdate },
    { event: 'new-conversation', callback: handlePusherNewConversation },
  ], [handleConversationUpdate, handlePusherNewConversation])

  usePusherChannel(`user-${currentUser.id}`, pusherEvents)

  const handleNewConversation = (conversation: Conversation) => {
    setConversations((prev) => {
      if (prev.find((c) => c.id === conversation.id)) return prev
      return [conversation, ...prev]
    })
    setSelectedId(conversation.id)
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white border rounded-lg shadow-sm overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNewConversation={handleNewConversation}
        user={currentUser}
      />
      <div className="flex-1 min-w-0">
        {selectedId && otherUser ? (
          <ChatWindow
            key={selectedId} // Force remount on change
            conversationId={selectedId}
            currentUser={currentUser}
            otherUser={otherUser}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50/50">
            <div className="text-center">
              <p>Selecciona una conversación para empezar a chatear</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
