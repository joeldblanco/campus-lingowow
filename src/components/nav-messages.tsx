'use client'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { usePusherChannel } from '@/hooks/use-pusher-channel'
import { getTotalUnreadCount } from '@/lib/actions/floating-chat'
import { MessageCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

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

  const fetchCount = useCallback(async () => {
    if (!userId) return
    const res = await getTotalUnreadCount(userId)
    if (res.success && typeof res.count === 'number') {
      setUnreadCount(res.count)
    }
  }, [userId])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  const handleConversationUpdate = useCallback((data: unknown) => {
    const event = data as ConversationUpdateEvent
    if (event.unreadCount > 0) {
      setUnreadCount((prev) => prev + 1)
    }
  }, [])

  const handleConversationRead = useCallback(() => {
    fetchCount()
  }, [fetchCount])

  const pusherEvents = useMemo(() => [
    { event: 'conversation-update', callback: handleConversationUpdate },
    { event: 'conversation-read', callback: handleConversationRead },
  ], [handleConversationUpdate, handleConversationRead])

  usePusherChannel(userId ? `user-${userId}` : null, pusherEvents)

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
