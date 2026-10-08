'use client'

import { LessonForView } from '@/types/lesson'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import { mapContentToBlock } from '@/lib/content-mapper'
import { Block } from '@/types/course-builder'
import { LessonNavigation } from './lesson-navigation'
import { completeCourseLesson } from '@/lib/actions/lessons'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { GuidedLessonViewer } from './guided-lesson-viewer'
import { buildCourseCompletionUrl } from '@/lib/course-completion'
import { UNIT_ONE_LESSON_ID } from '@/lib/unit-one-learning'
import { isGuidedLessonPilot } from '@/lib/lesson-pilot'

interface LessonContentProps {
  lesson: LessonForView
  isTeacher?: boolean
  isClassroom?: boolean // When true, enables interactive block synchronization
  courseId?: string
  guidedStorageKey?: string
  navigation?: {
    prevLessonId: string | null
    nextLessonId: string | null
    isCompleted: boolean
  } | null
}

export function LessonContent({
  lesson,
  isTeacher,
  isClassroom,
  courseId,
  navigation,
  guidedStorageKey,
}: LessonContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCompleted, setIsCompleted] = useState(navigation?.isCompleted ?? false)

  const handleComplete = () => {
    if (!courseId) { setIsCompleted(true); return }

    startTransition(async () => {
      try {
        const result = await completeCourseLesson(courseId, lesson.id)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        setIsCompleted(true)
        toast.success('Progreso guardado')
        router.push(buildCourseCompletionUrl(courseId, lesson.id))
        router.refresh()
      } catch {
        toast.error('No se pudo guardar el progreso')
      }
    })
  }

  // Map Prisma contents to Blocks used by the preview component
  const blocks: Block[] = (lesson.contents ?? []).map((content) =>
    mapContentToBlock(content as Parameters<typeof mapContentToBlock>[0])
  )

  const lessonCourseId = courseId || lesson.module?.course?.id
  const guidedCourseLesson = Boolean(lessonCourseId && isGuidedLessonPilot(lesson.id, lessonCourseId, lesson.contents ?? []))
  const unitOneClassroom = lesson.id === UNIT_ONE_LESSON_ID && Boolean(isTeacher || isClassroom)
  const guidedClassroomLesson = guidedCourseLesson && Boolean(isTeacher || isClassroom)
  const useGuidedViewer = Boolean(guidedStorageKey && !isTeacher && !isClassroom) || unitOneClassroom || guidedClassroomLesson
  const viewerStorageKey = guidedStorageKey || (lesson.id === UNIT_ONE_LESSON_ID
    ? `unit1:${lesson.id}`
    : `guided:${lessonCourseId}:${lesson.id}`)
  if (useGuidedViewer && !lesson.videoUrl && blocks.length > 0) {
    return (
      <GuidedLessonViewer
        key={viewerStorageKey}
        blocks={blocks}
        storageKey={viewerStorageKey}
        onComplete={courseId && navigation || unitOneClassroom ? handleComplete : undefined}
        isPending={isPending}
        isCompleted={isCompleted}
        illustratedContent
        unitOneAuthored={lesson.id === UNIT_ONE_LESSON_ID}
        isTeacher={isTeacher}
        isClassroom={isClassroom}
      />
    )
  }

  return (
    <div className="space-y-8">
      {lesson.videoUrl && (
        <div className="w-full rounded-xl overflow-hidden shadow-lg">
          {/*
                  Quick check if it's a direct video file or embed. 
                  Implementation would need a proper player.
                */}
          <div className="aspect-video bg-gray-900 text-white flex items-center justify-center">
            Video Player: {lesson.title}
          </div>
        </div>
      )}

      {blocks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Esta lección no tiene contenido aún.</div>
      ) : (
        blocks.map((block) => (
          <div key={block.id} className="scroll-mt-20" data-block-id={block.id}>
            <BlockPreview block={block} isTeacher={isTeacher} isClassroom={isClassroom} />
          </div>
        ))
      )}

      {courseId && navigation && (
        <LessonNavigation
          prevLessonId={navigation.prevLessonId}
          nextLessonId={navigation.nextLessonId}
          onComplete={handleComplete}
          isCompleted={isCompleted}
          isPending={isPending}
        />
      )}
    </div>
  )
}
