'use client'

import React, { useState, useEffect } from 'react'
import { ChatSidebar } from './ChatSidebar'
import { ChatWindow } from './ChatWindow'
import { pusherClient } from '@/lib/pusher'
import { cn } from '@/lib/utils'

interface MessagesClientProps {
    initialConversations: any[]
    currentUser: any
}

export const MessagesClient: React.FC<MessagesClientProps> = ({ initialConversations, currentUser }) => {
    const [conversations, setConversations] = useState(initialConversations)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const selectedConversation = conversations.find(c => c.id === selectedId)
    const otherUser = selectedConversation?.participants.find((p: any) => p.userId !== currentUser.id)?.user

    useEffect(() => {
        // Listen for new conversations or updates to sidebar list
        const channel = pusherClient.subscribe(`user-${currentUser.id}`)

        channel.bind('conversation-update', (data: any) => {
            setConversations(prev => {
                const index = prev.findIndex(c => c.id === data.conversationId)
                if (index > -1) {
                    const updated = [...prev]
                    updated[index] = {
                        ...updated[index],
                        lastMessage: data.lastMessage,
                        lastMessageAt: data.lastMessageAt
                        // Unread count needing logic update in backend or here
                    }
                    // Move to top
                    updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
                    return updated
                }
                return prev
            })
        })

        channel.bind('new-conversation', (data: any) => {
            setConversations(prev => [data, ...prev])
        })

        return () => {
            pusherClient.unsubscribe(`user-${currentUser.id}`)
        }
    }, [currentUser.id])

    const handleNewConversation = (conversation: any) => {
        setConversations(prev => {
            // Check if already exists
            if (prev.find(c => c.id === conversation.id)) return prev
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
