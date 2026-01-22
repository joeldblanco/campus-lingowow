'use client'

import { ExamBuilderV3 } from '@/components/admin/exams/exam-builder-v2'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getExamById } from '@/lib/actions/exams'
import { ExamWithDetails } from '@/types/exam'
import { Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useAutoCloseSidebar } from '@/hooks/use-auto-close-sidebar'

export default function TeacherEditExamPage() {
  useAutoCloseSidebar()
  const params = useParams()
  const { data: session } = useSession()
  const examId = params.examId as string
  const [exam, setExam] = useState<ExamWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadExam = async () => {
      try {
        const examData = await getExamById(examId)
        
        if (!examData) {
          setError('Examen no encontrado')
          return
        }

        // Verificar que el profesor sea el creador del examen
        if (session?.user?.id && examData.createdById !== session.user.id) {
          setError('No tienes permiso para editar este examen')
          return
        }

        setExam(examData)
      } catch (err) {
        console.error('Error loading exam:', err)
        setError('Error al cargar el examen')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      loadExam()
    }
  }, [examId, session?.user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">Examen no encontrado</p>
      </div>
    )
  }

  const backUrl = exam.courseId ? `/teacher/courses/${exam.courseId}` : '/teacher/courses'
  
  return <ExamBuilderV3 mode="edit" exam={exam} backUrl={backUrl} />
}
