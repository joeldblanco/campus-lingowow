'use client'

import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getUserAvatarUrl } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils/name-formatter'

interface UserAvatarProps {
  userId: string
  userName: string
  userLastName?: string | null
  userImage?: string | null
  className?: string
  fallbackClassName?: string
}

export function UserAvatar({
  userId,
  userName,
  userLastName,
  userImage,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const avatarUrl = getUserAvatarUrl(userId, userImage)
  const initials = getInitials(userName, userLastName)

  return (
    <Avatar className={className}>
      <AvatarImage src={avatarUrl} alt={`${userName} ${userLastName || ''}`} />
      <AvatarFallback className={cn(fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
