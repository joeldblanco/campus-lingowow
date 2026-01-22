'use client'

import { LessonBuilder } from '@/components/admin/course-builder/lesson-builder/lesson-builder'
import { useAutoCloseSidebar } from '@/hooks/use-auto-close-sidebar'
import type { Lesson } from '@/types/course-builder'

interface ClientWrapperProps {
  lesson: Lesson
  studentName: string
  courseName: string
}

export function TeacherLessonBuilderWrapper({ lesson, studentName, courseName }: ClientWrapperProps) {
  useAutoCloseSidebar()
  
  return (
    <div className="h-[calc(100vh-4rem)]">
      <LessonBuilder
        lesson={lesson}
        lessonType="personalized"
        studentName={studentName}
        courseName={courseName}
      />
    </div>
  )
}
