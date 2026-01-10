'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { createDraftExam } from '@/lib/actions/exams'
import { toast } from 'sonner'

export default function CreateExamPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [creating, setCreating] = useState(true)

  useEffect(() => {
    const createAndRedirect = async () => {
      if (!session?.user?.id) {
        return
      }

      try {
        const result = await createDraftExam(session.user.id)
        if (result.success && result.exam) {
          router.replace(`/admin/exams/edit/${result.exam.id}`)
        } else {
          toast.error(result.error || 'Error al crear el examen')
          router.push('/admin/exams')
        }
      } catch (error) {
        console.error('Error creating draft exam:', error)
        toast.error('Error al crear el examen')
        router.push('/admin/exams')
      } finally {
        setCreating(false)
      }
    }

    if (session?.user?.id) {
      createAndRedirect()
    }
  }, [session?.user?.id, router])

  if (creating) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Creando examen...</p>
      </div>
    )
  }

  return null
}
