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
    if (!courseId) return

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

  if (guidedStorageKey && !isTeacher && !isClassroom && !lesson.videoUrl && blocks.length > 0) {
    return (
      <GuidedLessonViewer
        key={guidedStorageKey}
        blocks={blocks}
        storageKey={guidedStorageKey}
        onComplete={courseId && navigation ? handleComplete : undefined}
        isPending={isPending}
        isCompleted={isCompleted}
        illustratedContent
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
