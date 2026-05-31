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
  contents: { id: string }[]
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

/** Per-module completion derived from the set of completed content ids. */
export function computeModuleProgress(
  modules: ProgressModule[],
  completedContentIds: Iterable<string>
): ModuleProgress[] {
  const completed = new Set(completedContentIds)

  return [...modules]
    .sort((a, b) => a.order - b.order)
    .map((module) => {
      const contentIds = module.lessons.flatMap((lesson) => lesson.contents.map((c) => c.id))
      const totalContents = contentIds.length
      const completedContents = contentIds.filter((id) => completed.has(id)).length
      const percentage = totalContents > 0 ? Math.round((completedContents / totalContents) * 100) : 0

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

  for (const module of ordered) {
    result.push({
      moduleId: module.id,
      isLocked: locked,
      blockedByModuleId: locked ? gateModuleId : null,
    })

    if (!locked) {
      const blockers = blockingByModule.get(module.id) ?? []
      const hasUnpassedBlocker = blockers.some((exam) => !hasPassedExam(exam, attempts))
      if (hasUnpassedBlocker) {
        locked = true
        gateModuleId = module.id
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
  attempts: ExamAttemptLite[]
): ModuleWithProgress[] {
  const progress = computeModuleProgress(modules, completedContentIds)
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
