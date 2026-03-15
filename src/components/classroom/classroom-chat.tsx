'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Loader2 } from 'lucide-react'
import { getChatMessages, sendChatMessage, ChatMessage } from '@/lib/actions/classroom-chat'
import { cn } from '@/lib/utils'

interface ClassroomChatProps {
  bookingId: string
  onNewMessage?: () => void
}

export function ClassroomChat({ bookingId, onNewMessage }: ClassroomChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevMessageCountRef = useRef(0)
  const onNewMessageRef = useRef(onNewMessage)

  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  const loadMessages = useCallback(async () => {
    const msgs = await getChatMessages(bookingId)
    // Detect new messages from others
    if (prevMessageCountRef.current > 0 && msgs.length > prevMessageCountRef.current) {
      const newMsgs = msgs.slice(prevMessageCountRef.current)
      const hasNewFromOthers = newMsgs.some(m => !m.isOwn)
      if (hasNewFromOthers) {
        onNewMessageRef.current?.()
      }
    }
    prevMessageCountRef.current = msgs.length
    setMessages(msgs)
    setIsLoading(false)
  }, [bookingId])

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [loadMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    const result = await sendChatMessage(bookingId, newMessage.trim())
    
    if (result.success && result.message) {
      setMessages(prev => [...prev, result.message!])
      setNewMessage('')
      inputRef.current?.focus()
    }
    
    setIsSending(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 min-h-0 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-white/40 text-sm py-8">
              No hay mensajes aún. ¡Inicia la conversación!
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  msg.isOwn ? "flex-row-reverse" : "flex-row"
                )}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={msg.senderImage} />
                  <AvatarFallback className="text-xs bg-blue-600 text-white">
                    {msg.senderName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2",
                  msg.isOwn 
                    ? "bg-blue-600 text-white" 
                    : "bg-white/10 text-white"
                )}>
                  {!msg.isOwn && (
                    <div className="text-xs font-medium mb-1 opacity-70">
                      {msg.senderName}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <div className={cn(
                    "text-xs mt-1",
                    msg.isOwn ? "text-blue-200" : "text-white/40"
                  )}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="flex-none p-3 border-t border-white/10 bg-[#292a2d]">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            disabled={isSending}
            className="flex-1 bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/20"
          />
          <Button 
            onClick={handleSend} 
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
