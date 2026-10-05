'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  ClipboardList,
  Lock,
  Play,
  Target,
  User,
} from 'lucide-react'
import Link from 'next/link'
import type { ModuleWithProgress } from '@/lib/course-progression'

interface CourseExam {
  id: string
  title: string
  description: string
  timeLimit: number | null
  passingScore: number
  maxAttempts: number
  questionCount: number
  totalPoints: number
  isPublished: boolean
  /** Present for module evaluations. A null/absent value is a standalone exam. */
  moduleId?: string | null
  isBlocking?: boolean
  hasPassed?: boolean
}

interface CourseLesson {
  id: string
  title: string
  description: string | null
  order: number
  contents: Array<{
    id: string
    title: string
    description: string | null
    contentType: string
    order: number
  }>
}

interface CourseModule {
  id: string
  title: string
  description?: string | null
  level: string
  order: number
  isPublished: boolean
  lessons: CourseLesson[]
  _count: {
    lessons: number
  }
}

interface CourseViewProps {
  course: {
    id: string
    title: string
    description: string | null
    language: string
    level: string
    isPersonalized?: boolean
    exams?: CourseExam[]
    createdBy: {
      name: string
      bio?: string | null
    }
    modules: CourseModule[]
    _count: {
      modules: number
      enrollments: number
    }
    isEnrolled: boolean
    enrollment?: {
      id: string
      status: string
      progress: number
      enrollmentDate: Date
      lastAccessed?: Date | null
      studentLessons?: Array<{
        id: string
        title: string
        description: string | null
        order: number
        duration: number
        isPublished: boolean
        videoUrl?: string | null
        summary?: string | null
      }>
    } | null
  }
  progress?: {
    enrollment: {
      id: string
      status: string
      progress: number
      enrollmentDate: Date
      lastAccessed?: Date | null
    }
    totalContents: number
    completedContents: number
    progressPercentage: number
    completedContentIds: string[]
    completedActivities: Array<{
      activityId: string
      status: string
      score?: number | null
      completedAt?: Date | null
    }>
  } | null
  // Per-module progress + evaluation-based lock state (#92 / #147).
  moduleProgress?: ModuleWithProgress[]
}

interface ModuleView {
  module: CourseModule
  totalContents: number
  completedContents: number
  percentage: number
  isCompleted: boolean
  isLocked: boolean
  blockedByModuleId: string | null
  exams: CourseExam[]
}

type NextStep =
  | {
      kind: 'exam'
      moduleId: string
      moduleTitle: string
      exam: CourseExam
    }
  | {
      kind: 'lesson'
      moduleId: string
      moduleTitle: string
      lesson: CourseLesson
      lessonProgress: number
    }

function getLevelColor(level: string) {
  switch (level.toLowerCase()) {
    case 'beginner':
    case 'principiante':
      return 'bg-green-100 text-green-800'
    case 'intermediate':
    case 'intermedio':
      return 'bg-yellow-100 text-yellow-800'
    case 'advanced':
    case 'avanzado':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getLanguageFlag(language: string) {
  switch (language.toLowerCase()) {
    case 'english':
    case 'inglés':
      return '🇺🇸'
    case 'spanish':
    case 'español':
      return '🇪🇸'
    case 'french':
    case 'francés':
      return '🇫🇷'
    default:
      return '🌐'
  }
}

function getModuleTitle(title: string, moduleNumber: number) {
  const cleanTitle = title.trim()
  if (!cleanTitle) {
    return `Módulo ${moduleNumber}`
  }

  // Module names already carrying their number should not be prefixed again.
  if (/^(m[oó]dulo|module)\s*\d+\s*:?/i.test(cleanTitle)) {
    return cleanTitle
  }

  return `Módulo ${moduleNumber}: ${cleanTitle}`
}

function sortExamsNaturally(exams: CourseExam[]) {
  return exams
    .map((exam, index) => ({ exam, index }))
    .sort((left, right) => {
      const titleOrder = left.exam.title.localeCompare(right.exam.title, 'es', {
        numeric: true,
        sensitivity: 'base',
      })
      return titleOrder || left.index - right.index
    })
    .map(({ exam }) => exam)
}

function getLessonProgress(lesson: CourseLesson, completedContentIds: Set<string>) {
  return lesson.contents.filter((content) => completedContentIds.has(content.id)).length
}

export function CourseView({ course, progress, moduleProgress }: CourseViewProps) {
  const [showAllModules, setShowAllModules] = useState(false)
  const moduleLockById = new Map((moduleProgress ?? []).map((module) => [module.moduleId, module]))
  const completedContentIds = new Set(progress?.completedContentIds ?? [])
  const orderedModules = [...course.modules].sort((left, right) => left.order - right.order)
  const publishedExams = (course.exams ?? []).filter((exam) => exam.isPublished)

  const moduleViews: ModuleView[] = orderedModules.map((module) => {
    const state = moduleLockById.get(module.id)
    const localTotalContents = module.lessons.reduce(
      (total, lesson) => total + lesson.contents.length,
      0
    )
    const localCompletedContents = module.lessons.reduce(
      (total, lesson) => total + getLessonProgress(lesson, completedContentIds),
      0
    )
    const totalContents = state?.totalContents ?? localTotalContents
    const completedContents = state?.completedContents ?? localCompletedContents
    const percentage = Math.min(
      100,
      Math.max(
        0,
        state?.percentage ?? (totalContents > 0 ? (completedContents / totalContents) * 100 : 0)
      )
    )

    return {
      module,
      totalContents,
      completedContents,
      percentage,
      isCompleted:
        state?.isCompleted ?? (totalContents > 0 && completedContents >= totalContents),
      isLocked: state?.isLocked ?? false,
      blockedByModuleId: state?.blockedByModuleId ?? null,
      // Association is intentionally exact. Titles are never used to infer a module.
      exams: publishedExams.filter((exam) => exam.moduleId === module.id),
    }
  })

  const fallbackTotalContents = moduleViews.reduce((total, module) => total + module.totalContents, 0)
  const fallbackCompletedContents = moduleViews.reduce(
    (total, module) => total + module.completedContents,
    0
  )
  const totalContents = progress?.totalContents ?? fallbackTotalContents
  const completedContents = progress?.completedContents ?? fallbackCompletedContents
  const progressPercentage = Math.min(
    100,
    Math.max(
      0,
      progress?.progressPercentage ??
        course.enrollment?.progress ??
        (totalContents > 0 ? (completedContents / totalContents) * 100 : 0)
    )
  )

  let nextStep: NextStep | null = null
  for (const moduleView of moduleViews) {
    if (moduleView.isLocked) {
      continue
    }

    if (moduleView.isCompleted) {
      const pendingBlockingExam = moduleView.exams.find(
        (exam) => exam.isBlocking && !exam.hasPassed
      )
      if (pendingBlockingExam) {
        nextStep = {
          kind: 'exam',
          moduleId: moduleView.module.id,
          moduleTitle: getModuleTitle(
            moduleView.module.title,
            orderedModules.indexOf(moduleView.module) + 1
          ),
          exam: pendingBlockingExam,
        }
        break
      }
    }

    const nextLesson = moduleView.module.lessons.find((lesson) => {
      const lessonProgress = getLessonProgress(lesson, completedContentIds)
      return lessonProgress < lesson.contents.length || lesson.contents.length === 0
    })

    if (nextLesson) {
      nextStep = {
        kind: 'lesson',
        moduleId: moduleView.module.id,
        moduleTitle: getModuleTitle(
          moduleView.module.title,
          orderedModules.indexOf(moduleView.module) + 1
        ),
        lesson: nextLesson,
        lessonProgress: getLessonProgress(nextLesson, completedContentIds),
      }
      break
    }
  }

  const activeModuleId = nextStep?.moduleId ?? null
  const activeModuleIndex = moduleViews.findIndex((module) => module.module.id === activeModuleId)
  const visibleModuleCount = showAllModules
    ? moduleViews.length
    : Math.max(8, activeModuleIndex >= 0 ? activeModuleIndex + 1 : 0)
  const visibleModules = moduleViews.slice(0, visibleModuleCount)
  const hasExtraModules = moduleViews.length > 8
  const standaloneExams = sortExamsNaturally(publishedExams.filter((exam) => !exam.moduleId))
  const hasLockedModule = moduleViews.some((module) => module.isLocked)
  const firstLockedModuleId = moduleViews.find((module) => module.isLocked)?.module.id ?? null

  const renderExamMeta = (exam: CourseExam) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
      {exam.timeLimit !== null && (
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {exam.timeLimit} min
        </span>
      )}
      <span className="flex items-center gap-1">
        <Target className="h-3 w-3" />
        {exam.questionCount} preguntas
      </span>
      <span>{exam.passingScore}% para aprobar</span>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/my-courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Mis Cursos
          </Link>
        </Button>
      </div>

      <section aria-labelledby="course-title" className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="text-3xl" aria-hidden="true">
              {getLanguageFlag(course.language)}
            </span>
            <div className="min-w-0">
              <h1 id="course-title" className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {course.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className={getLevelColor(course.level)}>{course.level}</Badge>
                <Badge variant="outline">{course.language}</Badge>
              </div>
            </div>
          </div>

          <div className="w-full shrink-0 space-y-2 sm:w-64">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-gray-700">Tu progreso</span>
              <span className="font-bold text-gray-900">
                {`${Math.round(progressPercentage)}% · ${completedContents} de ${totalContents}`}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" aria-label="Progreso del curso" />
          </div>
        </div>

        {nextStep ? (
          <Card className="border-indigo-200 bg-indigo-50">
            <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  Siguiente paso
                </p>
                <h2 className="mt-1 truncate font-semibold text-indigo-950">
                  {nextStep.kind === 'exam' ? nextStep.exam.title : nextStep.lesson.title}
                </h2>
                <p className="text-sm text-indigo-800">{nextStep.moduleTitle}</p>
              </div>
              {nextStep.kind === 'exam' ? (
                <Button asChild size="sm" className="shrink-0">
                  <Link href={`/exams/${nextStep.exam.id}/take`}>
                    <Play className="mr-2 h-4 w-4" />
                    Tomar evaluación
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" className="shrink-0">
                  <Link href={`/my-courses/${course.id}/lessons/${nextStep.lesson.id}`}>
                    <Play className="mr-2 h-4 w-4" />
                    {nextStep.lessonProgress > 0 ? 'Continuar' : 'Comenzar'}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : hasLockedModule ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Hay contenido bloqueado hasta que avances en la progresión del curso.
          </p>
        ) : moduleViews.length > 0 ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Has completado todo el contenido disponible de este curso.
          </p>
        ) : null}
      </section>

      {course.isPersonalized &&
        course.enrollment?.studentLessons &&
        course.enrollment.studentLessons.length > 0 && (
          <section aria-labelledby="personalized-lessons-title" className="space-y-3">
            <h2 id="personalized-lessons-title" className="flex items-center gap-2 text-xl font-semibold">
              <BookOpen className="h-5 w-5" />
              Mis Lecciones Personalizadas
            </h2>
            <div className="space-y-2">
              {course.enrollment.studentLessons.map((lesson, index) => (
                <Card key={lesson.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{lesson.title}</h3>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lesson.duration} min
                          </span>
                          <Badge className="bg-purple-100 text-purple-800">
                            <User className="mr-1 h-3 w-3" />
                            Personalizado
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button asChild size="sm" className="shrink-0">
                      <Link href={`/my-courses/${course.id}/personalized/${lesson.id}`}>
                        <Play className="mr-2 h-4 w-4" />
                        Comenzar
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

      <section aria-labelledby="course-content-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="course-content-title" className="text-xl font-semibold">
            Contenido del Curso
          </h2>
          {moduleViews.length > 0 && (
            <span className="text-sm text-gray-500">
              {moduleViews.length} módulo{moduleViews.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {moduleViews.length > 0 ? (
          <>
            <Accordion
              type="multiple"
              defaultValue={activeModuleId ? [activeModuleId] : undefined}
              id="course-module-list"
              className="space-y-2"
            >
              {visibleModules.map((moduleView) => {
                const moduleNumber = orderedModules.indexOf(moduleView.module) + 1
                const moduleTitle = getModuleTitle(moduleView.module.title, moduleNumber)
                const status = moduleView.isLocked
                  ? { label: 'Bloqueado', className: 'text-gray-600', icon: Lock }
                  : moduleView.isCompleted
                    ? { label: 'Completado', className: 'text-green-700', icon: CheckCircle }
                    : { label: 'Disponible', className: 'text-blue-700', icon: Play }
                const StatusIcon = status.icon

                return (
                  <AccordionItem
                    key={moduleView.module.id}
                    value={moduleView.module.id}
                    className="rounded-lg border bg-white px-3"
                  >
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div
                        className={`flex min-w-0 flex-1 gap-2 pr-3 text-left ${
                          moduleView.isLocked
                            ? 'items-center'
                            : 'flex-col sm:flex-row sm:items-center sm:justify-between'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {moduleView.isLocked && <Lock className="h-4 w-4 shrink-0 text-gray-400" />}
                            <span className="truncate font-semibold text-gray-900">{moduleTitle}</span>
                            <Badge variant="outline" className={`shrink-0 text-xs ${status.className}`}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {status.label}
                            </Badge>
                          </div>
                          {moduleView.isLocked &&
                            moduleView.module.id === firstLockedModuleId &&
                            moduleView.blockedByModuleId && (
                            <p className="mt-1 text-xs font-normal text-amber-700">
                              Requiere evaluación de{' '}
                              {(() => {
                                const gateModule = moduleViews.find(
                                  (candidate) => candidate.module.id === moduleView.blockedByModuleId
                                )
                                return gateModule
                                  ? getModuleTitle(
                                      gateModule.module.title,
                                      orderedModules.indexOf(gateModule.module) + 1
                                    )
                                  : 'el módulo anterior'
                              })()}
                            </p>
                          )}
                        </div>
                        {!moduleView.isLocked && (
                          <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500 sm:min-w-[235px]">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex justify-between gap-2">
                                <span>{Math.round(moduleView.percentage)}%</span>
                                <span>
                                   {moduleView.completedContents} de {moduleView.totalContents} contenidos • {moduleView.module.lessons.length} lecciones
                                </span>
                              </div>
                              <Progress value={moduleView.percentage} className="h-1.5" />
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pb-3 pt-0">
                      {moduleView.isLocked ? (
                        <div className="ml-2 rounded-md border border-dashed bg-gray-50 px-3 py-2 text-sm text-gray-600">
                          Este módulo está bloqueado.
                        </div>
                      ) : (
                        <div className="ml-2 space-y-1 border-l-2 border-gray-100 pl-3">
                          {moduleView.module.lessons.length > 0 ? (
                            moduleView.module.lessons.map((lesson, lessonIndex) => {
                              const lessonProgress = getLessonProgress(lesson, completedContentIds)
                              const isLessonCompleted =
                                lesson.contents.length > 0 && lessonProgress === lesson.contents.length
                              const isLessonInProgress = lessonProgress > 0 && !isLessonCompleted

                              return (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-gray-50"
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    {isLessonCompleted ? (
                                      <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                                    ) : (
                                      <BookOpen className="h-4 w-4 shrink-0 text-gray-400" />
                                    )}
                                    <div className="min-w-0">
                                      <h3 className="truncate text-sm font-medium">
                                        {lessonIndex + 1}. {lesson.title}
                                      </h3>
                                      <p className="text-xs text-gray-500">
                                        {lessonProgress} de {lesson.contents.length} contenidos
                                        {isLessonInProgress && ' · En progreso'}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    asChild
                                    size="sm"
                                    variant={isLessonInProgress ? 'default' : 'outline'}
                                    className="shrink-0"
                                  >
                                    <Link href={`/my-courses/${course.id}/lessons/${lesson.id}`}>
                                      <Play className="mr-1.5 h-3.5 w-3.5" />
                                      {isLessonCompleted
                                        ? 'Repasar'
                                        : isLessonInProgress
                                          ? 'Continuar'
                                          : 'Comenzar'}
                                    </Link>
                                  </Button>
                                </div>
                              )
                            })
                          ) : (
                            <p className="px-2 py-2 text-sm text-gray-500">
                              Este módulo aún no tiene lecciones publicadas.
                            </p>
                          )}

                          {moduleView.exams.length > 0 && (
                            <div className="mt-2 space-y-1 border-t pt-2">
                              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Evaluaciones del módulo
                              </p>
                              {moduleView.exams.map((exam) => (
                                <div
                                  key={exam.id}
                                  className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-2 py-2"
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    <ClipboardList className="h-4 w-4 shrink-0 text-indigo-600" />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">{exam.title}</p>
                                      {renderExamMeta(exam)}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    {exam.hasPassed ? (
                                      <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
                                    ) : exam.isBlocking ? (
                                      <Badge variant="outline" className="text-amber-700">
                                        Pendiente
                                      </Badge>
                                    ) : null}
                                    {moduleView.isLocked ? (
                                      <Button size="sm" variant="outline" disabled>
                                        <Lock className="mr-1.5 h-3.5 w-3.5" />
                                        Bloqueado
                                      </Button>
                                    ) : (
                                      <Button asChild size="sm" variant="outline">
                                        <Link href={`/exams/${exam.id}/take`}>
                                          {exam.hasPassed ? 'Ver evaluación' : 'Tomar evaluación'}
                                        </Link>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>

            {hasExtraModules && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                aria-expanded={showAllModules}
                aria-controls="course-module-list"
                onClick={() => setShowAllModules((visible) => !visible)}
              >
                {showAllModules
                  ? 'Mostrar menos módulos'
                  : `Mostrar todos los módulos (${moduleViews.length})`}
              </Button>
            )}
          </>
        ) : (
          <Card className="border-dashed bg-gray-50">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <div className="mb-3 rounded-full bg-white p-3 shadow-sm">
                <Target className="h-7 w-7 opacity-50" />
              </div>
              <p className="font-medium">Este curso aún no tiene contenido publicado.</p>
              <p className="text-sm">Vuelve pronto para ver las lecciones.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {standaloneExams.length > 0 && (
        <section aria-labelledby="standalone-exams-title" className="space-y-3">
          <h2 id="standalone-exams-title" className="flex items-center gap-2 text-xl font-semibold">
            <ClipboardList className="h-5 w-5" />
            Evaluaciones adicionales
          </h2>
          <Card>
            <CardContent className="divide-y p-0">
              {standaloneExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ClipboardList className="h-4 w-4 shrink-0 text-gray-500" />
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{exam.title}</h3>
                      {renderExamMeta(exam)}
                    </div>
                  </div>
                  <Button asChild size="sm" className="shrink-0">
                    <Link href={`/exams/${exam.id}/take`}>
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                      Comenzar
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
