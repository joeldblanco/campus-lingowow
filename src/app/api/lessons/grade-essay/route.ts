import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { gradeEssayQuestion } from '@/lib/services/essay-grading'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { essayText, prompt, maxPoints = 100, language = 'spanish', targetLevel = 'B1' } = body

    if (!essayText || !prompt) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: essayText, prompt' },
        { status: 400 }
      )
    }

    if (essayText.trim().length < 10) {
      return NextResponse.json(
        { error: 'El ensayo es demasiado corto para ser evaluado' },
        { status: 400 }
      )
    }

    // Grade the essay with AI
    const gradingResult = await gradeEssayQuestion(
      essayText,
      prompt,
      maxPoints,
      language,
      targetLevel
    )

    return NextResponse.json({
      success: true,
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
