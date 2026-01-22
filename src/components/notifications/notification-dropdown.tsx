'use client'

import { useState, useEffect, useTransition } from 'react'
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { NotificationType } from '@prisma/client'
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/lib/actions/notifications'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: Date
}

const notificationTypeConfig: Record<
  NotificationType,
  { icon: string; color: string }
> = {
  NEW_ENROLLMENT: { icon: '👤', color: 'bg-blue-500' },
  ENROLLMENT_CONFIRMED: { icon: '✅', color: 'bg-green-500' },
  TASK_ASSIGNED: { icon: '📝', color: 'bg-purple-500' },
  TASK_SUBMITTED: { icon: '📤', color: 'bg-indigo-500' },
  TASK_GRADED: { icon: '⭐', color: 'bg-yellow-500' },
  PAYMENT_RECEIVED: { icon: '💰', color: 'bg-emerald-500' },
  PAYMENT_CONFIRMED: { icon: '💳', color: 'bg-green-500' },
  TEACHER_PAYMENT_CONFIRMED: { icon: '✔️', color: 'bg-teal-500' },
  CLASS_REMINDER: { icon: '⏰', color: 'bg-orange-500' },
  CLASS_CANCELLED: { icon: '❌', color: 'bg-red-500' },
  CLASS_RESCHEDULED: { icon: '📅', color: 'bg-amber-500' },
  RECORDING_READY: { icon: '🎥', color: 'bg-blue-600' },
  SYSTEM_ANNOUNCEMENT: { icon: '📢', color: 'bg-slate-500' },
  ACCOUNT_UPDATE: { icon: '👤', color: 'bg-gray-500' },
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const fetchNotifications = async () => {
    const [notifResult, countResult] = await Promise.all([
      getUserNotifications(20),
      getUnreadNotificationCount(),
    ])

    if (notifResult.success && notifResult.data) {
      setNotifications(notifResult.data as Notification[])
    }
    if (countResult.success) {
      setUnreadCount(countResult.count)
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    // Polling cada 30 segundos para nuevas notificaciones
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkAsRead = (notificationId: string) => {
    startTransition(async () => {
      const result = await markNotificationAsRead(notificationId)
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    })
  }

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      const result = await markAllNotificationsAsRead()
      if (result.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    })
  }

  const handleDelete = (notificationId: string) => {
    startTransition(async () => {
      const result = await deleteNotification(notificationId)
      if (result.success) {
        const notification = notifications.find((n) => n.id === notificationId)
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        if (notification && !notification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      }
    })
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como leídas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tienes notificaciones</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const config = notificationTypeConfig[notification.type]
              return (
                <div
                  key={notification.id}
                  className={cn(
                    'p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors',
                    !notification.isRead && 'bg-muted/30'
                  )}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm',
                        config.color
                      )}
                    >
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm font-medium truncate',
                            !notification.isRead && 'font-semibold'
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                        <div className="flex items-center gap-1">
                          {notification.link && (
                            <Link href={notification.link}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  if (!notification.isRead) {
                                    handleMarkAsRead(notification.id)
                                  }
                                  setIsOpen(false)
                                }}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={isPending}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(notification.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                href="/dashboard/notifications"
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                Ver todas las notificaciones
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
