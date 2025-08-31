'use client'

import { useState, useEffect } from 'react'
import { getAllLessons, getLessonStats } from '@/lib/actions/lessons'
import { LessonWithDetails, LessonStats } from '@/types/lesson'
import { LessonsTable } from './lessons-table'
import { LessonsStats } from './lessons-stats'
import { CreateLessonDialog } from './create-lesson-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { LessonsLoadingSkeleton } from './lessons-loading-skeleton'

export function LessonsContainer() {
  const [lessons, setLessons] = useState<LessonWithDetails[]>([])
  const [stats, setStats] = useState<LessonStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [lessonsData, statsData] = await Promise.all([
        getAllLessons(),
        getLessonStats(),
      ])
      setLessons(lessonsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading lessons data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (isLoading) {
    return <LessonsLoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      {stats && <LessonsStats stats={stats} />}
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Lista de Lecciones</h2>
        <CreateLessonDialog onLessonCreated={loadData}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crear Lección
          </Button>
        </CreateLessonDialog>
      </div>

      <LessonsTable lessons={lessons} onLessonUpdated={loadData} />
    </div>
  )
}
