import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

/**
 * GET /api/exams/[examId]
 * Get a single exam with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request, ['exams:read'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { examId } = await params

    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        creator: {
          select: { id: true, name: true, lastName: true, email: true },
        },
        course: { select: { id: true, title: true, language: true, level: true } },
        module: { select: { id: true, title: true, level: true } },
        lesson: { select: { id: true, title: true } },
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { attempts: true, assignments: true } },
      },
    })

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // Verify ownership
    if (exam.createdById !== authResult.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Reconstruct blocks from questions for a friendly response
    const blocks = exam.questions.map((q) => {
      const opts = q.options as Record<string, unknown> | null
      const originalBlockType = opts?.originalBlockType as string | null

      // Base response for every question
      const base = {
        id: q.id,
        order: q.order,
        points: q.points,
        explanation: q.explanation,
        groupId: opts?.groupId as string | null || null,
      }

      if (originalBlockType) {
        // Reconstruct the original block shape
        switch (originalBlockType) {
          case 'title':
            return { ...base, type: 'title', title: opts?.title || q.question }
          case 'text':
            return { ...base, type: 'text', content: opts?.content || q.question }
          case 'audio':
            return { ...base, type: 'audio', url: opts?.url || q.audioUrl, title: q.question, maxReplays: opts?.maxReplays || q.maxAudioPlays }
          case 'video':
            return { ...base, type: 'video', url: opts?.url, title: q.question }
          case 'image':
            return { ...base, type: 'image', url: opts?.url, alt: q.question }
          case 'recording':
            return { ...base, type: 'recording', instruction: opts?.instruction || q.question, timeLimit: opts?.timeLimit, aiGrading: opts?.aiGrading, aiGradingConfig: opts?.aiGradingConfig }
          case 'multiple_choice':
            return { ...base, type: 'multiple_choice', question: q.question, items: opts?.multipleChoiceItems }
          case 'multi_select':
            return { ...base, type: 'multi_select', instruction: opts?.instruction || q.question, correctOptions: opts?.correctOptions, incorrectOptions: opts?.incorrectOptions }
          default:
            return { ...base, type: originalBlockType, rawQuestion: q.question, rawOptions: opts }
        }
      }

      // Native question types (no originalBlockType)
      switch (q.type) {
        case 'MULTIPLE_CHOICE':
          return { ...base, type: 'multiple_choice', question: q.question, options: opts?.multipleChoiceItems ? undefined : q.options, items: opts?.multipleChoiceItems, correctAnswer: q.correctAnswer }
        case 'TRUE_FALSE':
          return { ...base, type: 'true_false', statement: q.question, correctAnswer: q.correctAnswer }
        case 'SHORT_ANSWER':
          return { ...base, type: 'short_answer', question: q.question, correctAnswer: q.correctAnswer, caseSensitive: q.caseSensitive }
        case 'ESSAY':
          return { ...base, type: 'essay', prompt: q.question, minWords: q.minLength, maxWords: q.maxLength }
        case 'RECORDING':
          return { ...base, type: 'recording', instruction: q.question }
        case 'FILL_BLANK':
          return { ...base, type: 'fill_blanks', content: (opts as Record<string, unknown>)?.content || q.question, correctAnswer: q.correctAnswer }
        case 'MATCHING':
          return { ...base, type: 'match', title: q.question, pairs: (opts as Record<string, unknown>)?.pairs }
        case 'ORDERING':
          return { ...base, type: 'ordering', title: q.question, items: (opts as Record<string, unknown>)?.items }
        case 'DRAG_DROP':
          return { ...base, type: 'drag_drop', title: q.question, categories: (opts as Record<string, unknown>)?.categories, items: (opts as Record<string, unknown>)?.dragItems }
        default:
          return { ...base, type: q.type, question: q.question }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions,
        examType: exam.examType,
        isPublished: exam.isPublished,
        slug: exam.slug,
        isPublicAccess: exam.isPublicAccess,
        isGuestAccessible: exam.isGuestAccessible,
        targetLanguage: exam.targetLanguage,
        config: {
          timeLimit: exam.timeLimit,
          passingScore: exam.passingScore,
          maxAttempts: exam.maxAttempts,
          isBlocking: exam.isBlocking,
          isOptional: exam.isOptional,
          shuffleQuestions: exam.shuffleQuestions,
          shuffleOptions: exam.shuffleOptions,
          showResults: exam.showResults,
          allowReview: exam.allowReview,
        },
        proctoring: {
          enabled: exam.proctoringEnabled,
          requireFullscreen: exam.requireFullscreen,
          blockCopyPaste: exam.blockCopyPaste,
          blockRightClick: exam.blockRightClick,
          maxWarnings: exam.maxWarnings,
        },
        context: {
          course: exam.course,
          module: exam.module,
          lesson: exam.lesson,
        },
        creator: exam.creator,
        stats: {
          questionCount: exam.questions.length,
          totalPoints: exam.questions.reduce((sum, q) => sum + q.points, 0),
          attemptCount: exam._count.attempts,
          assignmentCount: exam._count.assignments,
        },
        blocks,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error fetching exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/exams/[examId]
 * Delete an exam (only if no student attempts exist)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request, ['exams:write'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { examId } = await params

    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: { _count: { select: { attempts: true } } },
    })

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    if (exam.createdById !== authResult.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (exam._count.attempts > 0) {
      return NextResponse.json(
        { error: `Cannot delete exam with ${exam._count.attempts} student attempt(s). Remove attempts first.` },
        { status: 409 }
      )
    }

    await db.exam.delete({ where: { id: examId } })

    return NextResponse.json({ success: true, message: 'Exam deleted successfully' })
  } catch (error) {
    console.error('Error deleting exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
