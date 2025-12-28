'use client'

import { ExamBuilderV2 } from '@/components/admin/exams/exam-builder-v2'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getExamById } from '@/lib/actions/exams'
import { ExamWithDetails } from '@/types/exam'
import { Loader2 } from 'lucide-react'

export default function EditExamPage() {
  const params = useParams()
  const examId = params.id as string
  const [exam, setExam] = useState<ExamWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadExam = async () => {
      try {
        const examData = await getExamById(examId)
        setExam(examData)
      } catch (error) {
        console.error('Error loading exam:', error)
      } finally {
        setLoading(false)
      }
    }
    loadExam()
  }, [examId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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

  return <ExamBuilderV2 mode="edit" exam={exam} />
}
