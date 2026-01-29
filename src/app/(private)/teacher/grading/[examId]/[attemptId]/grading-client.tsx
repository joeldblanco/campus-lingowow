'use client'

import { useRouter } from 'next/navigation'
import { ExamGradingView } from '@/components/exams/teacher'
import { gradeExamAnswer, finalizeExamReview } from '@/lib/actions/exams'

interface StudentInfo {
  id: string
  userId: string
  name: string
  email: string
  score: number
  attemptNumber: number
}

interface ExamAttemptInfo {
  id: string
  attemptNumber: number
  submittedAt: string
  status: 'PENDING_REVIEW' | 'COMPLETED' | 'IN_PROGRESS'
}

interface QuestionAnswer {
  id: string
  questionId: string
  questionNumber: number
  questionType: string
  questionText: string
  category?: string
  maxPoints: number
  userAnswer: string | null
  correctAnswer?: string
  isCorrect: boolean | null
  pointsEarned: number
  needsReview: boolean
  feedback?: string | null
  isAutoGraded: boolean
  groupId?: string | null
  sectionTitle?: string
}

interface GradingClientProps {
  examId: string
  examTitle: string
  courseName: string
  students: StudentInfo[]
  attemptsByStudent: Record<string, Array<{
    id: string
    attemptNumber: number
    score: number
    submittedAt: string
  }>>
  selectedStudentId: string
  attempt: ExamAttemptInfo
  totalScore: number
  maxScore: number
  answers: QuestionAnswer[]
  userId: string
}

export function GradingClient({
  examId,
  examTitle,
  courseName,
  students,
  attemptsByStudent,
  selectedStudentId,
  attempt,
  totalScore,
  maxScore,
  answers,
  userId
}: GradingClientProps) {
  const router = useRouter()

  const handleSelectStudent = (studentId: string) => {
    // Obtener intentos del estudiante seleccionado
    const studentAttempts = attemptsByStudent[studentId] || []
    if (studentAttempts.length > 0) {
      // Navegar al primer intento del estudiante
      const firstAttempt = studentAttempts[0]
      router.push(`/teacher/grading/${examId}/${firstAttempt.id}`)
    }
  }

  const handleSaveGrade = async (answerId: string, pointsEarned: number, feedback: string) => {
    await gradeExamAnswer(answerId, pointsEarned, feedback, userId)
  }

  const handleFinalizeReview = async () => {
    await finalizeExamReview(attempt.id)
  }

  return (
    <ExamGradingView
      examId={examId}
      examTitle={examTitle}
      courseName={courseName}
      students={students}
      attemptsByStudent={attemptsByStudent}
      selectedStudentId={selectedStudentId}
      attempt={attempt}
      totalScore={totalScore}
      maxScore={maxScore}
      answers={answers}
      onSelectStudent={handleSelectStudent}
      onSaveGrade={handleSaveGrade}
      onFinalizeReview={handleFinalizeReview}
      breadcrumbs={[
        { label: 'Calificaciones', href: '/teacher/grading' },
        { label: examTitle, href: `/teacher/exams/${examId}/results` },
        { label: 'Revisión', href: '#' }
      ]}
    />
  )
}
