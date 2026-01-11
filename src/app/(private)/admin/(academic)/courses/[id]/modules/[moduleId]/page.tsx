import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { ModuleLessonsClient } from './module-lessons-client'
import { Block, Module, Lesson } from '@/types/course-builder'

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

type ContentWithChildren = {
  id: string
  order: number
  contentType: string
  title: string | null
  data: unknown
  children?: ContentWithChildren[]
}

type BlockType = 'text' | 'video' | 'image' | 'audio' | 'quiz' | 'tab_group' | 'tab_item' | 'layout' | 'column' | 'container'

function mapContentToBlock(content: ContentWithChildren): Block {
  let type: BlockType = 'text'
  switch (content.contentType) {
    case 'RICH_TEXT':
      type = 'text'
      break
    case 'VIDEO':
      type = 'video'
      break
    case 'IMAGE':
      type = 'image'
      break
    case 'AUDIO':
      type = 'audio'
      break
    case 'ACTIVITY':
      type = 'quiz'
      break
    case 'TAB_GROUP':
      type = 'tab_group'
      break
    case 'TAB_ITEM':
      type = 'tab_item'
      break
    case 'CONTAINER':
      const data = content.data as { type?: string } | null
      if (data?.type === 'layout') {
        type = 'layout'
      } else if (data?.type === 'column') {
        type = 'column'
      } else {
        type = 'container'
      }
      break
  }

  const data = (content.data as Record<string, unknown>) || {}

  return {
    id: content.id,
    order: content.order,
    type,
    ...data,
    content: (data.content || data.html || '') as string,
    children: content.children
      ? content.children.sort((a, b) => a.order - b.order).map((c) => mapContentToBlock(c))
      : [],
  } as Block
}
