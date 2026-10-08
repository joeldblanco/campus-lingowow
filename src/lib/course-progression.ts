/**
 * Course progression logic shared by standard (non-personalized) courses.
 *
 *  - #147: per-module/unit progress for standard courses, derived from the
 *    student's completed contents (UserContent) — an explicit student↔module
 *    progress view without duplicating data in the DB.
 *  - #92: restrict advancement based on evaluation. A module that carries a
 *    *blocking* exam (Exam.isBlocking) locks every later module until the
 *    student passes that exam (an attempt scoring >= passingScore).
 *
 * Everything here is pure and deterministic so it can be unit tested without a
 * database.
 */

export interface ProgressLesson {
  id: string
  contents: ProgressContent[]
}

export interface ProgressContent {
  id: string
  data?: unknown
}

export interface ProgressModule {
  id: string
  order: number
  title?: string
  lessons: ProgressLesson[]
}

export interface ModuleProgress {
  moduleId: string
  totalContents: number
  completedContents: number
  percentage: number
  isCompleted: boolean
}

export interface CourseContentProgress {
  contentId: string
  completed: boolean
}

export interface CourseProgressOptions {
  /** The course scope required when resolving converted legacy source rows. */
  courseId?: string
}

const COURSE_GUIDED_LEARNING_REVISION = 'course-guided-v1'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null
}

function getContentMetadata(data: unknown): JsonRecord {
  const root = asRecord(data) ?? {}
  const nested = asRecord(root.data)
  return nested ? { ...nested, ...root } : root
}

function getString(record: JsonRecord | null, key: string): string | undefined {
  const value = record?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Teacher notes are authored for instructors and never count for learners. */
export function isTeacherNotesContent(content: ProgressContent): boolean {
  const metadata = getContentMetadata(content.data)
  return metadata.type === 'teacher_notes' || metadata.contentType === 'teacher_notes'
}

/** Hidden content remains outside the learner denominator and completion writes. */
export function isHiddenFromLearners(content: ProgressContent): boolean {
  return getContentMetadata(content.data).hiddenFromLearners === true
}

export function isVisibleLearnerContent(content: ProgressContent): boolean {
  return !isTeacherNotesContent(content) && !isHiddenFromLearners(content)
}

/**
 * Returns the original embed content id for a converted archive row when the
 * row is explicitly scoped to this course and lesson.
 */
export function getConvertedEmbedSourceId(
  content: ProgressContent,
  lessonId: string,
  options: CourseProgressOptions = {}
): string | null {
  const metadata = getContentMetadata(content.data)
  if (
    metadata.learningRevision !== COURSE_GUIDED_LEARNING_REVISION ||
    !isTeacherNotesContent(content)
  ) {
    return null
  }

  const originalSource = asRecord(metadata.originalSource)
  if (!originalSource || originalSource.type !== 'embed') return null

  const sourceCourseId = getString(originalSource, 'courseId') ?? getString(metadata, 'courseId')
  if (options.courseId && sourceCourseId && sourceCourseId !== options.courseId) return null

  const sourceLessonId = getString(metadata, 'lessonId') ?? getString(originalSource, 'lessonId')
  if (sourceLessonId !== lessonId) return null

  for (const key of ['contentId', 'originalContentId', 'originalId', 'id']) {
    const sourceContentId = getString(originalSource, key)
    if (sourceContentId) return sourceContentId
  }

  return null
}

export function getVisibleContentIds(lesson: ProgressLesson): string[] {
  return lesson.contents.filter(isVisibleLearnerContent).map((content) => content.id)
}

export function getConvertedEmbedSourceIds(
  lesson: ProgressLesson,
  options: CourseProgressOptions = {}
): string[] {
  return lesson.contents
    .map((content) => getConvertedEmbedSourceId(content, lesson.id, options))
    .filter((contentId): contentId is string => Boolean(contentId))
}

/**
 * Resolves completed visible content ids, including the compatibility bridge
 * from a completed original embed to its converted learner contents.
 */
export function getCompletedVisibleContentIds(
  modules: Array<Pick<ProgressModule, 'lessons'>>,
  contentProgress: CourseContentProgress[],
  options: CourseProgressOptions = {}
): string[] {
  const completed = new Set(
    contentProgress.filter((entry) => entry.completed).map((entry) => entry.contentId)
  )
  const completedVisible = new Set<string>()

  for (const courseModule of modules) {
    for (const lesson of courseModule.lessons) {
      const hasCompletedConvertedSource = getConvertedEmbedSourceIds(lesson, options).some(
        (sourceId) => completed.has(sourceId)
      )

      for (const contentId of getVisibleContentIds(lesson)) {
        if (completed.has(contentId) || hasCompletedConvertedSource) {
          completedVisible.add(contentId)
        }
      }
    }
  }

  return [...completedVisible]
}

export function summarizeCourseProgress(
  modules: Array<Pick<ProgressModule, 'lessons'>>,
  contentProgress: CourseContentProgress[],
  options: CourseProgressOptions = {}
) {
  const courseContentIds = new Set(
    modules.flatMap((module) => module.lessons.flatMap((lesson) => getVisibleContentIds(lesson)))
  )
  const completedContentIds = getCompletedVisibleContentIds(
    modules,
    contentProgress,
    options
  ).filter((contentId) => courseContentIds.has(contentId))
  const totalContents = courseContentIds.size
  const completedContents = completedContentIds.length

  return {
    totalContents,
    completedContents,
    progressPercentage:
      totalContents > 0 ? Math.round((completedContents / totalContents) * 100) : 0,
    completedContentIds,
  }
}

/** Per-module completion derived from the set of completed content ids. */
export function computeModuleProgress(
  modules: ProgressModule[],
  completedContentIds: Iterable<string>,
  options: CourseProgressOptions = {}
): ModuleProgress[] {
  const completed = new Set(
    getCompletedVisibleContentIds(
      modules,
      [...completedContentIds].map((contentId) => ({ contentId, completed: true })),
      options
    )
  )

  return [...modules]
    .sort((a, b) => a.order - b.order)
    .map((module) => {
      const contentIds = module.lessons.flatMap((lesson) => getVisibleContentIds(lesson))
      const totalContents = contentIds.length
      const completedContents = contentIds.filter((id) => completed.has(id)).length
      const percentage =
        totalContents > 0 ? Math.round((completedContents / totalContents) * 100) : 0

      return {
        moduleId: module.id,
        totalContents,
        completedContents,
        percentage,
        isCompleted: totalContents > 0 && completedContents === totalContents,
      }
    })
}

export interface GatingExam {
  id: string
  moduleId: string | null
  isBlocking: boolean
  passingScore: number
}

export interface ExamAttemptLite {
  examId: string
  score: number | null
}

/** True when the student has at least one attempt scoring at or above passingScore. */
export function hasPassedExam(exam: GatingExam, attempts: ExamAttemptLite[]): boolean {
  return attempts.some(
    (attempt) =>
      attempt.examId === exam.id && attempt.score !== null && attempt.score >= exam.passingScore
  )
}

export interface ModuleLockState {
  moduleId: string
  isLocked: boolean
  /** The module whose unpassed blocking exam is gating access, if locked. */
  blockedByModuleId: string | null
}

/**
 * Walks modules in order. As soon as a module has an unpassed blocking exam,
 * every *subsequent* module is locked. The gating module itself stays unlocked
 * so the student can reach it and take the exam.
 */
export function computeModuleLockState(
  modules: ProgressModule[],
  exams: GatingExam[],
  attempts: ExamAttemptLite[]
): ModuleLockState[] {
  const blockingByModule = new Map<string, GatingExam[]>()
  for (const exam of exams) {
    if (exam.moduleId && exam.isBlocking) {
      const list = blockingByModule.get(exam.moduleId) ?? []
      list.push(exam)
      blockingByModule.set(exam.moduleId, list)
    }
  }

  const ordered = [...modules].sort((a, b) => a.order - b.order)
  let locked = false
  let gateModuleId: string | null = null
  const result: ModuleLockState[] = []

  for (const mod of ordered) {
    result.push({
      moduleId: mod.id,
      isLocked: locked,
      blockedByModuleId: locked ? gateModuleId : null,
    })

    if (!locked) {
      const blockers = blockingByModule.get(mod.id) ?? []
      const hasUnpassedBlocker = blockers.some((exam) => !hasPassedExam(exam, attempts))
      if (hasUnpassedBlocker) {
        locked = true
        gateModuleId = mod.id
      }
    }
  }

  return result
}

export interface ModuleWithProgress extends ModuleProgress, ModuleLockState {
  title?: string
  order: number
}

/** Convenience combiner used by the server action and UI. */
export function buildModuleProgressView(
  modules: ProgressModule[],
  completedContentIds: Iterable<string>,
  exams: GatingExam[],
  attempts: ExamAttemptLite[],
  options: CourseProgressOptions = {}
): ModuleWithProgress[] {
  const progress = computeModuleProgress(modules, completedContentIds, options)
  const locks = computeModuleLockState(modules, exams, attempts)
  const locksById = new Map(locks.map((l) => [l.moduleId, l]))
  const ordered = [...modules].sort((a, b) => a.order - b.order)

  return ordered.map((module, index) => {
    const p = progress[index]
    const lock = locksById.get(module.id) ?? {
      moduleId: module.id,
      isLocked: false,
      blockedByModuleId: null,
    }
    return {
      ...p,
      ...lock,
      title: module.title,
      order: module.order,
    }
  })
}
