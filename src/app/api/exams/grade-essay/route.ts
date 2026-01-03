import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { gradeEssayQuestion } from '@/lib/services/essay-grading'
import type { ExamAnswer, ExamQuestion } from '@prisma/client'

type AnswerWithQuestion = ExamAnswer & { question: ExamQuestion }

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { answerId, essayText, question, maxPoints, language, targetLevel } = body

    if (!answerId || !essayText || !question) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: answerId, essayText, question' },
        { status: 400 }
      )
    }

    // Verify the answer exists and belongs to the user or user is teacher/admin
    const answer = await db.examAnswer.findUnique({
      where: { id: answerId },
      include: {
        attempt: {
          include: {
            exam: true,
            user: true,
          },
        },
        question: true,
      },
    })

    if (!answer) {
      return NextResponse.json({ error: 'Respuesta no encontrada' }, { status: 404 })
    }

    // Check permissions: user must be the student, a teacher, or admin
    const userRoles = session.user.roles || []
    const isOwner = answer.attempt.userId === session.user.id
    const isTeacherOrAdmin = userRoles.includes('TEACHER') || userRoles.includes('ADMIN')

    if (!isOwner && !isTeacherOrAdmin) {
      return NextResponse.json({ error: 'No tienes permiso para calificar esta respuesta' }, { status: 403 })
    }

    // Grade the essay with AI
    const gradingResult = await gradeEssayQuestion(
      essayText,
      question,
      maxPoints || answer.question.points,
      language || 'english',
      targetLevel || 'B1'
    )

    // Update the answer with the AI grading
    const updatedAnswer = await db.examAnswer.update({
      where: { id: answerId },
      data: {
        pointsEarned: gradingResult.pointsEarned,
        isCorrect: gradingResult.pointsEarned >= (maxPoints || answer.question.points) * 0.6,
        feedback: gradingResult.feedback,
        needsReview: false,
        reviewedAt: new Date(),
        reviewedBy: 'AI_GEMINI',
      },
    })

    // Recalculate attempt score if all answers are graded
    const allAnswers = await db.examAnswer.findMany({
      where: { attemptId: answer.attemptId },
      include: { question: true },
    })

    const pendingReview = allAnswers.some((a: AnswerWithQuestion) => a.needsReview)

    if (!pendingReview) {
      const totalEarned = allAnswers.reduce((sum: number, a: AnswerWithQuestion) => sum + a.pointsEarned, 0)
      const totalMax = allAnswers.reduce((sum: number, a: AnswerWithQuestion) => sum + a.question.points, 0)
      const percentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0

      await db.examAttempt.update({
        where: { id: answer.attemptId },
        data: {
          totalPoints: totalEarned,
          maxPoints: totalMax,
          score: Math.round(percentage * 100) / 100,
          status: 'COMPLETED',
          reviewedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      answer: updatedAnswer,
      gradingResult: {
        pointsEarned: gradingResult.pointsEarned,
        feedback: gradingResult.feedback,
        detailedResult: gradingResult.detailedResult,
      },
    })
  } catch (error) {
    console.error('Error grading essay:', error)
    return NextResponse.json(
      { error: 'Error al calificar el ensayo con IA' },
      { status: 500 }
    )
  }
}
