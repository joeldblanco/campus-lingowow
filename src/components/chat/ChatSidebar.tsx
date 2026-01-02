'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Search } from 'lucide-react'
import React, { useState } from 'react'
import { NewChatDialog } from './NewChatDialog'
import { MessageType, TeamBadge, UserRole } from '@prisma/client'

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
  metadata: Record<string, unknown> | null
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

interface ChatSidebarProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNewConversation: (conversation: Conversation) => void
  user: ChatUser
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
  user,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all')
  const [search, setSearch] = useState('')

  const filteredConversations = conversations.filter((conv) => {
    // Filter by search
    const otherParticipant = conv.participants.find((p) => p.userId !== user.id)?.user
    const name = `${otherParticipant?.name || ''} ${otherParticipant?.lastName || ''}`.toLowerCase()
    const matchesSearch = name.includes(search.toLowerCase())

    // Filter by tab
    const participantInfo = conv.participants.find((p) => p.userId === user.id)
    if (filter === 'archived') return matchesSearch && participantInfo?.isArchived
    if (filter === 'unread') {
      // Simple logic for unread: check if last message wasn't from me and not read (this logic needs refinement based on DB structure)
      // For now relying on visual unread indicator logic if available or just 'all' logic
      const lastMsg = conv.messages[0]
      const isUnread = lastMsg && lastMsg.senderId !== user.id && !lastMsg.isRead
      return matchesSearch && isUnread
    }

    return matchesSearch && !participantInfo?.isArchived
  })

  return (
    <div className="w-80 border-r h-full flex flex-col bg-white">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Mensajes</h2>
          <NewChatDialog onConversationCreated={onNewConversation}>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Plus className="h-5 w-5 text-gray-600" />
            </button>
          </NewChatDialog>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar estudiantes o profesores..."
            className="pl-8 bg-gray-50 border-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4 text-sm font-medium border-b">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'pb-2 border-b-2 transition-colors',
              filter === 'all' ? 'border-black text-black' : 'border-transparent text-gray-500'
            )}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'pb-2 border-b-2 transition-colors',
              filter === 'unread' ? 'border-black text-black' : 'border-transparent text-gray-500'
            )}
          >
            No leídos
          </button>
          <button
            onClick={() => setFilter('archived')}
            className={cn(
              'pb-2 border-b-2 transition-colors',
              filter === 'archived' ? 'border-black text-black' : 'border-transparent text-gray-500'
            )}
          >
            Archivados
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map((conv) => {
          const otherParticipant = conv.participants.find((p) => p.userId !== user.id)?.user
          const lastMsg = conv.messages[0]

          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'p-4 flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors border-l-4',
                selectedId === conv.id ? 'border-blue-500 bg-blue-50/50' : 'border-transparent'
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherParticipant?.image || undefined} />
                  <AvatarFallback>{otherParticipant?.name[0]}</AvatarFallback>
                </Avatar>
                {/* Online indicator placeholder - needs real status logic */}
                {/* Removed misleading indicator for now or need real logic, user asked about fake status in window but sidebar had it too */}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm truncate">
                    {otherParticipant?.name} {otherParticipant?.lastName}
                    {otherParticipant?.roles?.includes('TEACHER') && ' 🎓'}
                  </span>
                  {lastMsg && (
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                      {formatDistanceToNow(new Date(lastMsg.timestamp), {
                        addSuffix: true,
                        locale: es,
                      }).replace('alrededor de ', '')}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p
                    className={cn(
                      'text-xs truncate max-w-[150px]',
                      lastMsg?.senderId !== user.id && !lastMsg?.isRead && selectedId !== conv.id
                        ? 'font-bold text-gray-900'
                        : 'text-gray-500'
                    )}
                  >
                    {lastMsg?.senderId === user.id ? 'Tú: ' : ''}
                    {lastMsg?.content || 'Inició una conversación'}
                  </p>
                  {lastMsg?.senderId !== user.id && !lastMsg?.isRead && selectedId !== conv.id && (
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
