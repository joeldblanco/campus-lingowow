'use client'

import React, { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { getTotalUnreadCount } from '@/lib/actions/floating-chat'
import { pusherClient } from '@/lib/pusher'
import { cn } from '@/lib/utils'

export function NavMessages() {
    const { data: session } = useSession()
    const pathname = usePathname()
    const [unreadCount, setUnreadCount] = useState(0)

    const userId = session?.user?.id

    useEffect(() => {
        if (!userId) return

        const fetchCount = async () => {
            const res = await getTotalUnreadCount(userId)
            if (res.success && typeof res.count === 'number') {
                setUnreadCount(res.count)
            }
        }
        fetchCount()

        const channel = pusherClient.subscribe(`user-${userId}`)

        // Handle new message
        channel.bind('conversation-update', (data: any) => {
            if (data.unreadCount > 0) {
                setUnreadCount(prev => prev + 1) // Increment broadly, or refetch to be exact
                // Actually, refetching is safer to avoid drift, but slower. 
                // Incrementing is immediate.
                // But if I already have unread in this conversation?
                // Pusher 'conversation-update' is sent on EVERY message.
                // If I receive 2 messages in same convo, count +1 +1 ?
                // But I only want to count *messages* or *conversations*?
                // getTotalUnreadCount counts MESSAGES from query above.
                // So +1 is correct per message.
            }
        })

        // Handle read
        channel.bind('conversation-read', () => {
            // If a conversation is read, I don't know how many messages were in it easily without refetching.
            // So refetching total count is best strategy here.
            fetchCount()
        })

        return () => {
            pusherClient.unsubscribe(`user-${userId}`)
        }
    }, [userId])

    const isActive = pathname.startsWith('/messages')

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Comunicación</SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Mensajes" isActive={isActive} asChild>
                        <Link href="/messages" className="relative">
                            <MessageCircle />
                            <span>Mensajes</span>
                            {unreadCount > 0 && !isActive && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 h-4 min-w-[16px] flex items-center justify-center rounded-full">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}
