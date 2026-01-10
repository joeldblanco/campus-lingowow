'use client'

import { useRouter } from 'next/navigation'
import { ExamGradingView } from '@/components/exams/teacher'
import { gradeExamAnswer, finalizeExamReview } from '@/lib/actions/exams'

interface StudentInfo {
  id: string
  name: string
  email: string
  score: number
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
}

interface GradingClientProps {
  examId: string
  examTitle: string
  courseName: string
  students: StudentInfo[]
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
  selectedStudentId,
  attempt,
  totalScore,
  maxScore,
  answers,
  userId
}: GradingClientProps) {
  const router = useRouter()

  const handleSelectStudent = (studentId: string) => {
    const studentAttempt = students.find(s => s.id === studentId)
    if (studentAttempt) {
      router.push(`/teacher/grading/${examId}/${studentId}`)
    }
  }

  const handleSelectAttempt = (attemptId: string) => {
    router.push(`/teacher/grading/${examId}/${attemptId}`)
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
      selectedStudentId={selectedStudentId}
      attempt={attempt}
      totalScore={totalScore}
      maxScore={maxScore}
      answers={answers}
      onSelectStudent={handleSelectStudent}
      onSelectAttempt={handleSelectAttempt}
      onSaveGrade={handleSaveGrade}
      onFinalizeReview={handleFinalizeReview}
      breadcrumbs={[
        { label: 'Clases', href: '/teacher/classes' },
        { label: courseName, href: `/teacher/classes` },
        { label: examTitle, href: `/admin/exams` }
      ]}
    />
  )
}
