import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { ModuleLessonsClient } from './module-lessons-client'
import { Block, Module, Lesson } from '@/types/course-builder'
import { mapContentToBlock } from '@/lib/content-mapper'

interface ModuleLessonsPageProps {
  params: Promise<{
    id: string
    moduleId: string
  }>
}

export const metadata: Metadata = {
  title: 'Lecciones del Módulo | Admin | Lingowow',
  description: 'Gestiona las lecciones de este módulo',
}

export default async function ModuleLessonsPage({ params }: ModuleLessonsPageProps) {
  const { id: courseId, moduleId } = await params
  
  const session = await auth()
  if (!session?.user?.id) {
    notFound()
  }

  const moduleRecord = await db.module.findUnique({
    where: { id: moduleId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          createdById: true,
        },
      },
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          contents: {
            where: { parentId: null },
            orderBy: { order: 'asc' },
            include: {
              children: {
                orderBy: { order: 'asc' },
                include: {
                  children: {
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!moduleRecord || moduleRecord.course.id !== courseId || moduleRecord.course.createdById !== session.user.id) {
    notFound()
  }

  const lessons: Lesson[] = moduleRecord.lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description || '',
    order: lesson.order,
    duration: lesson.duration,
    blocks: lesson.contents.map((c) => mapContentToBlock(c)) as Block[],
    moduleId: lesson.moduleId,
    isPublished: lesson.isPublished,
  }))

  const moduleData: Module = {
    id: moduleRecord.id,
    title: moduleRecord.title,
    description: moduleRecord.description || '',
    level: moduleRecord.level,
    order: moduleRecord.order,
    objectives: moduleRecord.objectives || '',
    isPublished: moduleRecord.isPublished,
    courseId: moduleRecord.courseId,
    lessons,
  }

  return (
    <div className="min-h-screen bg-background">
      <ModuleLessonsClient 
        moduleData={moduleData} 
        courseId={courseId}
        courseTitle={moduleRecord.course.title}
      />
    </div>
  )
}

