// /components/virtual-classroom/class-chat.tsx
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getDiceBearAvatar } from '@/lib/utils'
import { Send } from 'lucide-react'

interface ClassChatProps {
  classId: string
  studentId: string
  teacherId: string
}

type Message = {
  id: string
  sender: {
    id: string
    name: string
    role: 'teacher' | 'student'
  }
  content: string
  timestamp: Date
}

export const ClassChat: React.FC<ClassChatProps> = ({ classId, studentId, teacherId }) => {
  console.log(classId)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: {
        id: teacherId,
        name: 'John Smith',
        role: 'teacher',
      },
      content: '¡Hola a todos! Bienvenidos a la clase de hoy.',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
    {
      id: '2',
      sender: {
        id: studentId,
        name: 'María García',
        role: 'student',
      },
      content: 'Hola profesor, tengo una duda sobre el ejercicio 3.',
      timestamp: new Date(Date.now() - 1000 * 60 * 2),
    },
  ])

  const [newMessage, setNewMessage] = useState('')

  const sendMessage = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      sender: {
        id: studentId,
        name: 'María García',
        role: 'student',
      },
      content: newMessage,
      timestamp: new Date(),
    }

    setMessages([...messages, message])
    setNewMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start gap-2">
            <Avatar>
              <AvatarImage
                src={getDiceBearAvatar(message.sender.id)}
              />
              <AvatarFallback>
                {message.sender.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{message.sender.name}</span>
                <span className="text-xs text-gray-500">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          className="flex-grow"
        />
        <Button size="sm" onClick={sendMessage}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
