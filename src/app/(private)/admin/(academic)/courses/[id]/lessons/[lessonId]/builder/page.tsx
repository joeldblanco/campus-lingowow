'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Lesson, Block } from '@/types/course-builder'
import { LessonBuilder } from '@/components/admin/course-builder/lesson-builder/lesson-builder'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'

// Mock data - replace with actual API calls
const mockLesson: Lesson = {
  id: 'lesson-1',
  title: 'Lección de Ejemplo',
  description: 'Esta es una lección de ejemplo',
  order: 1,
  duration: 30,
  blocks: [],
  moduleId: 'module-1',
  isPublished: false,
}

export default function LessonBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch actual lesson data
    // const fetchLesson = async () => {
    //   try {
    //     const response = await fetch(`/api/courses/${params.id}/lessons/${params.lessonId}`)
    //     const data = await response.json()
    //     setLesson(data)
    //   } catch (error) {
    //     toast.error('Error al cargar la lección')
    //   } finally {
    //     setIsLoading(false)
    //   }
    // }
    
    // Mock loading
    setTimeout(() => {
      setLesson(mockLesson)
      setIsLoading(false)
    }, 500)
  }, [params.id, params.lessonId])

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

  const handleSave = async () => {
    if (!lesson) return
    
    try {
      // TODO: Save to API
      // await fetch(`/api/courses/${params.id}/lessons/${params.lessonId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(lesson)
      // })
      
      toast.success('Lección guardada exitosamente')
    } catch {
      toast.error('Error al guardar la lección')
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Lección no encontrada</h1>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Curso
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <p className="text-muted-foreground">Editor de contenido de lección</p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Guardar Lección
        </Button>
      </div>

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
