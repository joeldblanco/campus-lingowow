'use client'

import { Home, MessageCircle, Store, Video, Shapes, Library, UserRound } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useSocketChannel } from '@/hooks/use-socket-channel'
import { getTotalUnreadCount } from '@/lib/actions/floating-chat'

export function NavStudent() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const [unreadMessages, setUnreadMessages] = useState(0)
  const userId = session?.user?.id

  // Fetch unread messages count
  const fetchMessagesCount = useCallback(async () => {
    if (!userId) return
    const res = await getTotalUnreadCount(userId)
    if (res.success && typeof res.count === 'number') {
      setUnreadMessages(res.count)
    }
  }, [userId])

  useEffect(() => {
    fetchMessagesCount()
  }, [fetchMessagesCount])

  const handleConversationUpdate = useCallback(() => {
    fetchMessagesCount()
  }, [fetchMessagesCount])

  const socketEvents = useMemo(
    () => [
      { event: 'conversation-update', callback: handleConversationUpdate },
      { event: 'conversation-read', callback: fetchMessagesCount },
    ],
    [handleConversationUpdate, fetchMessagesCount]
  )

  useSocketChannel(userId ? `user-${userId}` : null, socketEvents)

  const isDashboardActive = pathname === '/dashboard'
  const isMessagesActive = pathname.startsWith('/messages')
  const isRecordingsActive = pathname.startsWith('/recordings')
  const isActivitiesActive = pathname.startsWith('/activities')
  const isLibraryActive = pathname.startsWith('/library')
  const isShopActive = pathname === '/shop'
  const isProfileActive = pathname.startsWith('/settings')

  const itemClass =
    'font-lexend rounded-xl px-5 py-4 h-auto border border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-white data-[active=true]:bg-primary/8 data-[active=true]:border-primary/20 data-[active=true]:text-primary data-[active=true]:hover:bg-primary/12 transition-all duration-200'

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {/* Inicio */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Inicio"
              isActive={isDashboardActive}
              asChild
              className={itemClass}
            >
              <Link href="/dashboard" className="flex items-center gap-4 w-full">
                <Home className="!w-8 !h-8 shrink-0" />
                <span className="text-lg font-bold uppercase">Inicio</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Mensajes */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Mensajes"
              isActive={isMessagesActive}
              asChild
              className={itemClass}
            >
              <Link href="/messages" className="flex items-center gap-4 w-full relative">
                <MessageCircle className="!w-8 !h-8 shrink-0" />
                <span className="text-lg font-bold uppercase">Mensajes</span>
                {unreadMessages > 0 && !isMessagesActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 h-4 min-w-[16px] flex items-center justify-center rounded-full">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Grabaciones */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Grabaciones"
              isActive={isRecordingsActive}
              asChild
              className={itemClass}
            >
              <Link href="/recordings" className="flex items-center gap-4 w-full">
                <Video className="!w-8 !h-8 shrink-0" />
                <span className="text-lg font-bold uppercase">Grabaciones</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Actividades */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Actividades"
              isActive={isActivitiesActive}
              asChild
              className={itemClass}
            >
              <Link href="/activities" className="flex items-center gap-4 w-full">
                <Shapes className="!w-8 !h-8 shrink-0" />
                <span className="text-lg font-bold uppercase">Actividades</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Biblioteca */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Biblioteca"
              isActive={isLibraryActive}
              asChild
              className={itemClass}
            >
              <Link href="/library" className="flex items-center gap-4 w-full">
                <Library className="!w-8 !h-8 shrink-0" />
                <span className="text-lg font-bold uppercase">Biblioteca</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Tienda */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Tienda"
              isActive={isShopActive}
              asChild
              className={itemClass}
            >
              <Link href="/shop" className="flex items-center gap-4 w-full">
                <Store className="!w-8 !h-8 shrink-0" />
                <span className="text-lg font-bold uppercase">Tienda</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Perfil */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Perfil"
              isActive={isProfileActive}
              asChild
              className={itemClass}
            >
              <Link href="/settings/security" className="flex items-center gap-4 w-full">
                <UserRound className="!w-8 !h-8 shrink-0" />
                <span className="text-lg font-bold uppercase">Perfil</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
