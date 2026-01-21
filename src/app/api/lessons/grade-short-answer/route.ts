import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { gradeShortAnswerWithAI } from '@/lib/services/short-answer-grading'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { question, correctAnswer, studentAnswer, aiInstructions, caseSensitive, language = 'spanish' } = body

    if (!question || !correctAnswer || studentAnswer === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: question, correctAnswer, studentAnswer' },
        { status: 400 }
      )
    }

    if (studentAnswer.trim().length === 0) {
      return NextResponse.json(
        { error: 'La respuesta está vacía' },
        { status: 400 }
      )
    }

    const gradingResult = await gradeShortAnswerWithAI({
      question,
      correctAnswer,
      studentAnswer,
      aiInstructions,
      caseSensitive,
      language,
    })

    return NextResponse.json({
      success: true,
      result: gradingResult,
    })
  } catch (error) {
    console.error('Error grading short answer:', error)
    return NextResponse.json(
      { error: 'Error al calificar la respuesta con IA' },
      { status: 500 }
    )
  }
}
