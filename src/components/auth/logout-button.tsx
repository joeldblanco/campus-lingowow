'use client'

import { logout } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useTransition } from 'react'

const LogoutButton = () => {
  const [isPending, startTransition] = useTransition()

  const onSubmit = async () => {
    startTransition(() => {
      logout()
    })
  }

  return (
    <Button onClick={onSubmit} className="w-32" disabled={isPending}>
      {isPending ? <Loader2 className="animate-spin" /> : 'Cerrar sesión'}
    </Button>
  )
}

export default LogoutButton
