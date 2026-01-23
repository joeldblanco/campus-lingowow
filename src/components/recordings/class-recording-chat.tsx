'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, MessageCircle } from 'lucide-react'
import { getChatMessagesForRecording } from '@/lib/actions/recordings'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderImage?: string
  content: string
  createdAt: Date
  isOwn: boolean
}

interface ClassRecordingChatProps {
  recordingId: string
}

export function ClassRecordingChat({ recordingId }: ClassRecordingChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    setIsLoading(true)
    const result = await getChatMessagesForRecording(recordingId)
    if (result.success && result.data) {
      setMessages(result.data)
    } else {
      setMessages([])
    }
    setIsLoading(false)
  }, [recordingId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 min-h-0 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hubo mensajes de chat durante esta clase.</p>
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
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                    {msg.senderName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2",
                  msg.isOwn 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 text-gray-900"
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
                    msg.isOwn ? "text-blue-200" : "text-gray-400"
                  )}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
