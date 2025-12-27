'use client'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { getTotalUnreadCount } from '@/lib/actions/floating-chat'
import { pusherClient } from '@/lib/pusher'
import { MessageCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ConversationUpdateEvent {
  conversationId: string
  lastMessage: string | null
  lastMessageAt: Date | null
  unreadCount: number
}

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

    channel.bind('conversation-update', (data: ConversationUpdateEvent) => {
      if (data.unreadCount > 0) {
        setUnreadCount((prev) => prev + 1)
      }
    })

    channel.bind('conversation-read', () => {
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
