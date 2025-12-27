import { auth } from '@/auth'
import { getFloatingConversations } from '@/lib/actions/floating-chat'
import { MessagesClient } from '@/components/chat/MessagesClient'
import { redirect } from 'next/navigation'

export default async function MessagesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin')
  }

  const { conversations, success } = await getFloatingConversations(session.user.id!)

  if (!success) {
    return <div>Error loading messages</div>
  }

  return (
    <MessagesClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialConversations={(conversations || []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentUser={session.user as any}
    />
  )
}
