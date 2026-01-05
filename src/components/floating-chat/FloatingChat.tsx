'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { MessageCircle, X, Search, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserAvatar } from '@/components/ui/user-avatar'
import { getFloatingConversations, searchUsers, sendFloatingMessage, createFloatingConversation, getConversationMessages } from '@/lib/actions/floating-chat'
import { TeamBadge } from '@prisma/client'
import { io, Socket } from 'socket.io-client'

interface FloatingChatProps {
  userId: string
}

interface User {
  id: string
  name: string
  lastName: string | null
  image?: string | null
  teamBadge?: TeamBadge | null
}

interface Conversation {
  id: string
  title?: string | null
  isGroup: boolean
  lastMessage?: string | null
  lastMessageAt?: Date | null
  participants: {
    user: User
  }[]
}

interface Message {
  id: string
  content: string
  senderId: string
  timestamp: Date
  sender: User
}

export const FloatingChat: React.FC<FloatingChatProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'conversations' | 'search'>('conversations')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadConversations, setUnreadConversations] = useState<Set<string>>(new Set())
  
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await getFloatingConversations(userId)
      if (result.success && result.conversations) {
        setConversations(result.conversations)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const searchForUsers = useCallback(async () => {
    try {
      const result = await searchUsers(searchQuery)
      if (result.success && result.users) {
        setSearchResults(result.users)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }, [searchQuery])

  // Initialize Socket.io connection
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
        path: '/api/socket'
      })

      // Join user's personal room for notifications
      socketRef.current.emit('join-floating-chat', userId)

      // Listen for incoming messages
      socketRef.current.on('floating-chat-message', (data) => {
        const { conversationId, message } = data
        
        // Add message to current conversation if it's open
        if (selectedConversation === conversationId) {
          setMessages(prev => [...prev, message as Message])
        } else {
          // Add to unread conversations
          setUnreadConversations(prev => new Set([...prev, conversationId]))
          setUnreadCount(prev => prev + 1)
        }

        // Update conversation list
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, lastMessage: message.content, lastMessageAt: new Date(message.timestamp) }
              : conv
          )
        )
      })
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [userId, selectedConversation])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Load conversations when chat opens
  useEffect(() => {
    if (isOpen) {
      loadConversations()
    }
  }, [isOpen, loadConversations])

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.trim() && activeTab === 'search') {
      searchForUsers()
    } else {
      setSearchResults([])
    }
  }, [searchQuery, activeTab, searchForUsers])

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversation(conversationId)
    
    // Mark conversation as read
    setUnreadConversations(prev => {
      const newSet = new Set(prev)
      newSet.delete(conversationId)
      return newSet
    })
    
    try {
      const result = await getConversationMessages(conversationId, userId)
      if (result.success && result.messages) {
        setMessages(result.messages as Message[])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleStartConversation = async (targetUserId: string) => {
    try {
      const result = await createFloatingConversation([targetUserId])
      if (result.success && result.conversationId) {
        setSelectedConversation(result.conversationId)
        setActiveTab('conversations')
        setMessages([])
        // Reload conversations to include the new one
        loadConversations()
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    const messageContent = newMessage.trim()
    setNewMessage('')

    // Send via Socket.io for real-time delivery
    if (socketRef.current) {
      socketRef.current.emit('floating-chat-message', {
        conversationId: selectedConversation,
        senderId: userId,
        content: messageContent
      })
    }

    // Also save to database via API (fallback)
    try {
      await sendFloatingMessage(selectedConversation, userId, messageContent)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const getTeamBadgeColor = (badge?: TeamBadge) => {
    switch (badge) {
      case 'SALES': return 'bg-blue-500'
      case 'CUSTOMER_SERVICE': return 'bg-green-500'
      case 'ACADEMIC_COORDINATION': return 'bg-purple-500'
      case 'TECHNICAL_SUPPORT': return 'bg-orange-500'
      case 'ADMINISTRATION': return 'bg-red-500'
      case 'TEACHER': return 'bg-indigo-500'
      case 'STUDENT': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getTeamBadgeText = (badge?: TeamBadge) => {
    switch (badge) {
      case 'SALES': return 'Ventas'
      case 'CUSTOMER_SERVICE': return 'Atención'
      case 'ACADEMIC_COORDINATION': return 'Académico'
      case 'TECHNICAL_SUPPORT': return 'Soporte'
      case 'ADMINISTRATION': return 'Admin'
      case 'TEACHER': return 'Profesor'
      case 'STUDENT': return 'Estudiante'
      default: return ''
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow"
            size="lg"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 h-96 bg-white border rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold">Chat</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`flex-1 p-2 text-sm font-medium ${
            activeTab === 'conversations' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('conversations')}
        >
          Conversaciones
        </button>
        <button
          className={`flex-1 p-2 text-sm font-medium ${
            activeTab === 'search' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('search')}
        >
          Buscar
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'conversations' ? (
          selectedConversation ? (
            // Chat view
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-2 border-b bg-gray-50 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="text-xs"
                >
                  ← Volver
                </Button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full p-2">
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`w-3/4 px-4 py-3 rounded-lg ${
                            message.senderId === userId
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          <p className="text-sm break-words">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(new Date(message.timestamp))}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              <div className="p-2 border-t flex gap-2 flex-shrink-0 bg-white">
                <Input
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            // Conversations list
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Cargando conversaciones...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No hay conversaciones
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 border-b hover:bg-gray-50 cursor-pointer relative ${
                      unreadConversations.has(conversation.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectConversation(conversation.id)}
                  >
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        userId={conversation.participants[0]?.user.id || ''}
                        userName={conversation.participants[0]?.user.name || ''}
                        userLastName={conversation.participants[0]?.user.lastName}
                        userImage={conversation.participants[0]?.user.image}
                        className="w-8 h-8"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conversation.title || 
                           `${conversation.participants[0]?.user.name} ${conversation.participants[0]?.user.lastName || ''}`}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {conversation.lastMessage || 'Sin mensajes'}
                        </p>
                      </div>
                      {conversation.participants[0]?.user.teamBadge && (
                        <Badge className={`text-xs ${getTeamBadgeColor(conversation.participants[0].user.teamBadge)}`}>
                          {getTeamBadgeText(conversation.participants[0].user.teamBadge)}
                        </Badge>
                      )}
                      {unreadConversations.has(conversation.id) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          )
        ) : (
          // Search tab
          <div className="flex-1 flex flex-col">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleStartConversation(user.id)}
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      userId={user.id}
                      userName={user.name}
                      userLastName={user.lastName}
                      userImage={user.image}
                      className="w-8 h-8"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {user.name} {user.lastName}
                      </p>
                    </div>
                    {user.teamBadge && (
                      <Badge className={`text-xs ${getTeamBadgeColor(user.teamBadge)}`}>
                        {getTeamBadgeText(user.teamBadge)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No se encontraron usuarios
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
}
