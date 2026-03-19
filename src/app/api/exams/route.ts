import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { Prisma } from '@prisma/client'
import { CreateExamApiSchema, convertBlocksToQuestions } from './exam-schemas'

// =============================================
// API ENDPOINTS
// =============================================

/**
 * GET /api/exams
 * List exams (filtered by creator)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['exams:read'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const published = searchParams.get('published')
    const examType = searchParams.get('examType')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Prisma.ExamWhereInput = {
      createdById: authResult.userId,
      ...(courseId && { courseId }),
      ...(published !== null && published !== undefined && { isPublished: published === 'true' }),
      ...(examType && { examType: examType as Prisma.EnumExamTypeFilter }),
    }

    const [exams, total] = await Promise.all([
      db.exam.findMany({
        where,
        include: {
          course: { select: { id: true, title: true } },
          module: { select: { id: true, title: true } },
          lesson: { select: { id: true, title: true } },
          questions: { orderBy: { order: 'asc' } },
          _count: { select: { attempts: true, assignments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.exam.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: exams.map(exam => ({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        level: exam.level,
        examType: exam.examType,
        isPublished: exam.isPublished,
        timeLimit: exam.timeLimit,
        passingScore: exam.passingScore,
        maxAttempts: exam.maxAttempts,
        questionCount: exam.questions.length,
        totalPoints: exam.questions.reduce((sum, q) => sum + q.points, 0),
        course: exam.course,
        module: exam.module,
        lesson: exam.lesson,
        _count: exam._count,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
      })),
      pagination: { total, limit, offset },
    })
  } catch (error) {
    console.error('Error listing exams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/exams
 * Create a new exam with blocks
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['exams:write'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const validation = CreateExamApiSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Validate courseId/moduleId/lessonId exist if provided
    if (data.courseId) {
      const course = await db.course.findUnique({ where: { id: data.courseId } })
      if (!course) {
        return NextResponse.json({ error: `Course not found: ${data.courseId}` }, { status: 404 })
      }
    }
    if (data.moduleId) {
      const moduleRecord = await db.module.findUnique({ where: { id: data.moduleId } })
      if (!moduleRecord) {
        return NextResponse.json({ error: `Module not found: ${data.moduleId}` }, { status: 404 })
      }
    }
    if (data.lessonId) {
      const lesson = await db.lesson.findUnique({ where: { id: data.lessonId } })
      if (!lesson) {
        return NextResponse.json({ error: `Lesson not found: ${data.lessonId}` }, { status: 404 })
      }
    }

    // Validate slug uniqueness
    if (data.slug) {
      const existingSlug = await db.exam.findUnique({ where: { slug: data.slug } })
      if (existingSlug) {
        return NextResponse.json({ error: `Slug already in use: ${data.slug}` }, { status: 409 })
      }
    }

    // Convert blocks → exam questions
    const questions = convertBlocksToQuestions(data.blocks)

    // Create exam + questions in transaction
    const exam = await db.$transaction(async (tx) => {
      const createdExam = await tx.exam.create({
        data: {
          title: data.title,
          description: data.description,
          instructions: data.instructions,
          timeLimit: data.timeLimit,
          passingScore: data.passingScore,
          maxAttempts: data.maxAttempts,
          isBlocking: data.isBlocking,
          isOptional: data.isOptional,
          isPublished: data.isPublished,
          shuffleQuestions: data.shuffleQuestions,
          shuffleOptions: data.shuffleOptions,
          showResults: data.showResults,
          allowReview: data.allowReview,
          proctoringEnabled: data.proctoringEnabled,
          requireFullscreen: data.requireFullscreen,
          blockCopyPaste: data.blockCopyPaste,
          blockRightClick: data.blockRightClick,
          maxWarnings: data.maxWarnings,
          level: data.level,
          examType: data.examType,
          targetLanguage: data.targetLanguage,
          slug: data.slug,
          isPublicAccess: data.isPublicAccess,
          isGuestAccessible: data.isGuestAccessible,
          createdById: authResult.userId!,
          courseId: data.courseId || null,
          moduleId: data.moduleId || null,
          lessonId: data.lessonId || null,
        },
      })

      // Create questions
      for (const q of questions) {
        await tx.examQuestion.create({
          data: {
            examId: createdExam.id,
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

      return createdExam
    })

    // Fetch the complete exam
    const fullExam = await db.exam.findUnique({
      where: { id: exam.id },
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
        id: fullExam!.id,
        title: fullExam!.title,
        description: fullExam!.description,
        level: fullExam!.level,
        examType: fullExam!.examType,
        isPublished: fullExam!.isPublished,
        slug: fullExam!.slug,
        timeLimit: fullExam!.timeLimit,
        passingScore: fullExam!.passingScore,
        maxAttempts: fullExam!.maxAttempts,
        questionCount: fullExam!.questions.length,
        totalPoints: fullExam!.questions.reduce((sum, q) => sum + q.points, 0),
        course: fullExam!.course,
        module: fullExam!.module,
        lesson: fullExam!.lesson,
        questions: fullExam!.questions.map(q => ({
          id: q.id,
          type: q.type,
          question: q.question,
          points: q.points,
          order: q.order,
        })),
        createdAt: fullExam!.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating exam:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
