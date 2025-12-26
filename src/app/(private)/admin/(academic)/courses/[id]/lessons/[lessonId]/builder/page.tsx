'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Lesson, Block } from '@/types/course-builder'
import { LessonBuilder } from '@/components/admin/course-builder/lesson-builder/lesson-builder'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getLessonForBuilder, updateLessonBlocks } from '@/lib/actions/course-builder'

export default function LessonBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLesson = async () => {
      if (!params.lessonId) return

      try {
        const result = await getLessonForBuilder(params.lessonId as string)
        if (result.success && result.lesson) {
          setLesson(result.lesson)
        } else {
          toast.error(result.error || 'Error al cargar la lección')
          if (result.error === 'Lesson not found or unauthorized') {
            // Optionally redirect or show specific error
          }
        }
      } catch (error) {
        console.error(error)
        toast.error('Error al cargar la lección')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLesson()
  }, [params.lessonId])

  const handleUpdateLesson = (updates: Partial<Lesson>) => {
    if (!lesson) return
    setLesson({ ...lesson, ...updates })
  }

  const handleAddBlock = (block: Block) => {
    if (!lesson) return
    const newBlocks = [...lesson.blocks, block]
    setLesson({ ...lesson, blocks: newBlocks })
  }

  const handleUpdateBlock = (blockId: string, updates: Partial<Block>) => {
    if (!lesson) return
    const newBlocks = lesson.blocks.map(block =>
      block.id === blockId ? { ...block, ...updates } as Block : block
    )
    setLesson({ ...lesson, blocks: newBlocks })
  }

  const handleRemoveBlock = (blockId: string) => {
    if (!lesson) return
    const newBlocks = lesson.blocks.filter(block => block.id !== blockId)
    setLesson({ ...lesson, blocks: newBlocks })
  }

  const handleReorderBlocks = (blocks: Block[]) => {
    if (!lesson) return
    setLesson({ ...lesson, blocks })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Lección no encontrada</h1>
          <p className="text-muted-foreground mb-6">No se pudo cargar la lección solicitada.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <LessonBuilder
        lesson={lesson}
        onUpdateLesson={handleUpdateLesson}
        onAddBlock={handleAddBlock}
        onUpdateBlock={handleUpdateBlock}
        onRemoveBlock={handleRemoveBlock}
        onReorderBlocks={handleReorderBlocks}
      />
    </div>
  )
}
