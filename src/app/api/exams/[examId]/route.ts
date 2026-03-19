import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { Prisma } from '@prisma/client'
import { UpdateExamApiSchema, convertBlocksToQuestions } from '../exam-schemas'

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
        level: exam.level,
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

/**
 * PUT /api/exams/[examId]
 * Update an exam's metadata and/or replace its blocks
 * All fields are optional — only provided fields are updated.
 * If "blocks" is provided, ALL existing questions are deleted and replaced.
 */
export async function PUT(
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

    const body = await request.json()
    const validation = UpdateExamApiSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Validate slug uniqueness if changing it
    if (data.slug && data.slug !== exam.slug) {
      const existingSlug = await db.exam.findUnique({ where: { slug: data.slug } })
      if (existingSlug) {
        return NextResponse.json({ error: `Slug already in use: ${data.slug}` }, { status: 409 })
      }
    }

    // Validate courseId/moduleId/lessonId if provided
    if (data.courseId) {
      const course = await db.course.findUnique({ where: { id: data.courseId } })
      if (!course) {
        return NextResponse.json({ error: `Course not found: ${data.courseId}` }, { status: 404 })
      }
    }
    if (data.moduleId) {
      const mod = await db.module.findUnique({ where: { id: data.moduleId } })
      if (!mod) {
        return NextResponse.json({ error: `Module not found: ${data.moduleId}` }, { status: 404 })
      }
    }
    if (data.lessonId) {
      const lesson = await db.lesson.findUnique({ where: { id: data.lessonId } })
      if (!lesson) {
        return NextResponse.json({ error: `Lesson not found: ${data.lessonId}` }, { status: 404 })
      }
    }

    // Build the metadata update object (only fields that were provided)
    const { blocks, ...metaFields } = data
    const updateData: Record<string, unknown> = {}

    const directFields = [
      'title', 'description', 'instructions', 'timeLimit', 'passingScore', 'maxAttempts',
      'isBlocking', 'isOptional', 'isPublished', 'shuffleQuestions', 'shuffleOptions',
      'showResults', 'allowReview', 'proctoringEnabled', 'requireFullscreen',
      'blockCopyPaste', 'blockRightClick', 'maxWarnings', 'level', 'examType', 'targetLanguage',
      'slug', 'isPublicAccess', 'isGuestAccessible', 'courseId', 'moduleId', 'lessonId',
    ] as const

    for (const field of directFields) {
      if (field in metaFields && metaFields[field as keyof typeof metaFields] !== undefined) {
        updateData[field] = metaFields[field as keyof typeof metaFields]
      }
    }

    // Execute in a transaction
    await db.$transaction(async (tx) => {
      // Update exam metadata if any fields were provided
      if (Object.keys(updateData).length > 0) {
        await tx.exam.update({
          where: { id: examId },
          data: updateData,
        })
      }

      // Replace blocks if provided
      if (blocks && blocks.length > 0) {
        const questions = convertBlocksToQuestions(blocks)

        // Delete all existing questions
        await tx.examQuestion.deleteMany({ where: { examId } })

        // Create new questions
        for (const q of questions) {
          await tx.examQuestion.create({
            data: {
              examId,
              type: q.type,
              question: q.question,
              options: q.options ?? Prisma.JsonNull,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              points: q.points,
              order: q.order,
              difficulty: q.difficulty,
              tags: q.tags,
              caseSensitive: q.caseSensitive,
              partialCredit: q.partialCredit,
              minLength: q.minLength,
              maxLength: q.maxLength,
              audioUrl: q.audioUrl,
              maxAudioPlays: q.maxAudioPlays,
            },
          })
        }
      }
    })

    // Fetch the updated exam
    const updatedExam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        course: { select: { id: true, title: true } },
        module: { select: { id: true, title: true } },
        lesson: { select: { id: true, title: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedExam!.id,
        title: updatedExam!.title,
        description: updatedExam!.description,
        level: updatedExam!.level,
        examType: updatedExam!.examType,
        isPublished: updatedExam!.isPublished,
        slug: updatedExam!.slug,
        timeLimit: updatedExam!.timeLimit,
        passingScore: updatedExam!.passingScore,
        maxAttempts: updatedExam!.maxAttempts,
        questionCount: updatedExam!.questions.length,
        totalPoints: updatedExam!.questions.reduce((sum, q) => sum + q.points, 0),
        course: updatedExam!.course,
        module: updatedExam!.module,
        lesson: updatedExam!.lesson,
        questions: updatedExam!.questions.map(q => ({
          id: q.id,
          type: q.type,
          question: q.question,
          points: q.points,
          order: q.order,
        })),
        updatedAt: updatedExam!.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error updating exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
