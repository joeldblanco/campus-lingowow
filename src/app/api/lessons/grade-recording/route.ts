import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { gradeRecordingWithAI } from '@/lib/services/recording-grading'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      audioBase64,
      mimeType = 'audio/webm',
      instruction,
      prompt,
      maxPoints = 100,
      language = 'spanish',
      targetLevel = 'B1'
    } = body

    if (!audioBase64) {
      return NextResponse.json(
        { error: 'Falta el campo requerido: audioBase64' },
        { status: 400 }
      )
    }

    const taskInstruction = instruction || prompt || 'Habla sobre el tema indicado'

    const gradingResult = await gradeRecordingWithAI(
      audioBase64,
      mimeType,
      {
        language,
        targetLevel,
        instruction: taskInstruction,
        prompt,
      },
      maxPoints
    )

    return NextResponse.json({
      success: true,
      gradingResult: {
        pointsEarned: gradingResult.score,
        feedback: gradingResult.feedback.overall,
        transcription: gradingResult.transcription,
        detailedResult: gradingResult,
      },
    })
  } catch (error) {
    console.error('Error grading recording:', error)
    return NextResponse.json(
      { error: 'Error al calificar la grabación con IA' },
      { status: 500 }
    )
  }
}
