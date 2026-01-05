'use client'

import { UserAvatar } from '@/components/ui/user-avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createFloatingConversation, searchUsers } from '@/lib/actions/floating-chat'
import { Loader2, Plus, Search } from 'lucide-react'
import { UserRole } from '@prisma/client'
import React, { useEffect, useState } from 'react'

interface SearchUser {
  id: string
  name: string
  lastName: string | null
  image: string | null
  roles: UserRole[]
}

interface NewChatDialogProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConversationCreated: (conversation: any) => void
  children?: React.ReactNode
}

export const NewChatDialog: React.FC<NewChatDialogProps> = ({
  onConversationCreated,
  children,
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // Basic debounce implementation if hook doesn't exist, but let's assume manual for now to be safe
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true)
        const res = await searchUsers(query)
        if (res.success && res.users) {
          setResults(res.users)
        }
        setLoading(false)
      } else {
        setResults([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  const handleCreate = async (userId: string) => {
    setCreating(true)
    try {
      const res = await createFloatingConversation([userId])
      if (res.success && res.conversation) {
        // Need to ensure conversation has messages array for the frontend to not break,
        // though newly created one usually empty.
        const conversationWithExtras = {
          ...res.conversation,
          messages: [],
        }
        onConversationCreated(conversationWithExtras)
        setOpen(false)
      }
    } catch (error) {
      console.error('Failed to create conversation', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="icon" variant="ghost">
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Mensaje</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuario..."
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleCreate(user.id)}
                    disabled={creating}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors text-left"
                  >
                    <UserAvatar
                      userId={user.id}
                      userName={user.name}
                      userLastName={user.lastName}
                      userImage={user.image}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {user.name} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {user.roles?.join(', ')?.toLowerCase()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.length > 1 ? (
              <p className="text-center text-sm text-gray-500 p-4">No se encontraron usuarios.</p>
            ) : (
              <p className="text-center text-sm text-gray-500 p-4">Escribe para buscar...</p>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
