'use client'

import { useState, useCallback } from 'react'
import { CourseBuilderData, Module, Lesson } from '@/types/course-builder'
import { CourseInfoTab } from './tabs/course-info-tab'
import { ModulesTab } from './tabs/modules-tab'
import { LessonsTab } from './tabs/lessons-tab'
import { StudentsTab } from './tabs/students-tab'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  Layers,
  FileText,
  Users,
  Eye,
  Globe,
  Clock,
  Target
} from 'lucide-react'
import { toast } from 'sonner'
import {
  updateCourseInfo,
  upsertModule,
  deleteModule,
  upsertLesson,
  deleteLesson,
  reorderModules as reorderModulesAction
} from '@/lib/actions/course-builder'

interface CourseBuilderProps {
  initialCourse: CourseBuilderData
}

export function CourseBuilder({ initialCourse }: CourseBuilderProps) {
  const [course, setCourse] = useState<CourseBuilderData>(initialCourse)
  const [activeTab, setActiveTab] = useState('info')

  const updateCourse = useCallback(async (updates: Partial<CourseBuilderData>) => {
    try {
      const result = await updateCourseInfo(course.id, updates)
      if (!result.success || !result.course) {
        throw new Error(result.error || 'Error al actualizar el curso')
      }
      setCourse(result.course)
      toast.success('Información del curso actualizada')
    } catch (error) {
      console.error('Error updating course:', error)
      toast.error('Error al actualizar la información del curso')
    }
  }, [course.id])

  const updateModule = useCallback(async (moduleId: string, updates: Partial<Module>) => {
    try {
      // Optimistic update
      setCourse(prev => ({
        ...prev,
        modules: prev.modules.map(module =>
          module.id === moduleId ? { ...module, ...updates } : module
        )
      }))

      const result = await upsertModule(course.id, { id: moduleId, ...updates })
      if (!result.success || !result.module) {
        throw new Error(result.error || 'Error saving module')
      }

      // Update with server data
      setCourse(prev => ({
        ...prev,
        modules: prev.modules.map(module =>
          module.id === moduleId ? {
            ...module,
            ...result.module!,
            description: result.module!.description || '',
            objectives: result.module!.objectives || ''
          } : module
        )
      }))
    } catch (error) {
      console.error('Error updating module:', error)
      toast.error('Error al actualizar el módulo')
    }
  }, [course.id])

  const addModule = useCallback(async (module: Module) => {
    try {
      const result = await upsertModule(course.id, {
        title: module.title,
        description: module.description,
        level: module.level,
        order: module.order,
        objectives: module.objectives,
        isPublished: module.isPublished,
      })

      if (!result.success || !result.module) {
        throw new Error(result.error || 'Error creating module')
      }

      setCourse(prev => ({
        ...prev,
        modules: [...prev.modules, {
          ...module,
          ...result.module!,
          description: result.module!.description || '',
          objectives: result.module!.objectives || '',
          lessons: []
        }]
      }))
    } catch (error) {
      console.error('Error adding module:', error)
      throw error // Propagate to child to handle UI feedback
    }
  }, [course.id])

  const removeModule = useCallback(async (moduleId: string) => {
    try {
      // Optimistic update
      setCourse(prev => ({
        ...prev,
        modules: prev.modules.filter(module => module.id !== moduleId)
      }))

      const result = await deleteModule(moduleId)
      if (!result.success) {
        throw new Error(result.error || 'Error deleting module')
      }
    } catch (error) {
      console.error('Error deleting module:', error)
      toast.error('Error al eliminar el módulo')
    }
  }, [])

  const reorderModules = useCallback(async (modules: Module[]) => {
    try {
      // Optimistic update
      const reorderedModules = modules.map((module, index) => ({
        ...module,
        order: index + 1
      }))
      setCourse(prev => ({ ...prev, modules: reorderedModules }))

      const result = await reorderModulesAction(course.id, modules.map(m => m.id))
      if (!result.success) {
        throw new Error(result.error || 'Error reordering modules')
      }
    } catch (error) {
      console.error('Error reordering modules:', error)
      toast.error('Error al reordenar los módulos')
    }
  }, [course.id])

  // const updateLesson = useCallback(async (moduleId: string, lessonId: string, updates: Partial<Lesson>) => {
  //   try {
  //     // Optimistic update
  //     setCourse(prev => ({
  //       ...prev,
  //       modules: prev.modules.map(module =>
  //         module.id === moduleId
  //           ? {
  //             ...module,
  //             lessons: module.lessons.map(lesson =>
  //               lesson.id === lessonId ? { ...lesson, ...updates } : lesson
  //             )
  //           }
  //           : module
  //       )
  //     }))

  //     const result = await upsertLesson(moduleId, { id: lessonId, ...updates })
  //     if (!result.success || !result.lesson) {
  //       throw new Error(result.error || 'Error updating lesson')
  //     }

  //     // Update with server data (ensure blocks objects are preserved if not returned or different)
  //     setCourse(prev => ({
  //       ...prev,
  //       modules: prev.modules.map(module =>
  //         module.id === moduleId
  //           ? {
  //             ...module,
  //             lessons: module.lessons.map(lesson =>
  //               lesson.id === lessonId ? {
  //                 ...lesson,
  //                 ...result.lesson!,
  //                 description: result.lesson!.description || '',
  //                 blocks: lesson.blocks
  //               } : lesson
  //             )
  //           }
  //           : module
  //       )
  //     }))
  //   } catch (error) {
  //     console.error('Error updating lesson:', error)
  //     toast.error('Error al actualizar la lección')
  //   }
  // }, [])

  const addLesson = useCallback(async (moduleId: string, lesson: Lesson) => {
    try {
      const result = await upsertLesson(moduleId, {
        title: lesson.title,
        description: lesson.description,
        order: lesson.order,
        duration: lesson.duration,
        blocks: lesson.blocks,
        isPublished: lesson.isPublished
      })

      if (!result.success || !result.lesson) {
        throw new Error(result.error || 'Error creating lesson')
      }

      setCourse(prev => ({
        ...prev,
        modules: prev.modules.map(module =>
          module.id === moduleId
            ? {
              ...module, lessons: [...module.lessons, {
                ...lesson,
                ...result.lesson!,
                description: result.lesson!.description || '',
                blocks: lesson.blocks
              }]
            }
            : module
        )
      }))
    } catch (error) {
      console.error('Error adding lesson:', error)
      throw error
    }
  }, [])

  const removeLesson = useCallback(async (moduleId: string, lessonId: string) => {
    try {
      // Optimistic update
      setCourse(prev => ({
        ...prev,
        modules: prev.modules.map(module =>
          module.id === moduleId
            ? { ...module, lessons: module.lessons.filter(lesson => lesson.id !== lessonId) }
            : module
        )
      }))

      const result = await deleteLesson(lessonId)
      if (!result.success) {
        throw new Error(result.error || 'Error deleting lesson')
      }
    } catch (error) {
      console.error('Error deleting lesson:', error)
      toast.error('Error al eliminar la lección')
    }
  }, [])

  const reorderLessonsInModule = useCallback((moduleId: string, newLessonIds: string[]) => {
    // Optimistic update - reorder lessons in the module
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module => {
        if (module.id !== moduleId) return module
        
        // Reorder lessons based on newLessonIds
        const reorderedLessons = newLessonIds
          .map((id, index) => {
            const lesson = module.lessons.find(l => l.id === id)
            return lesson ? { ...lesson, order: index + 1 } : null
          })
          .filter((l): l is Lesson => l !== null)
        
        return { ...module, lessons: reorderedLessons }
      })
    }))
  }, [])

  const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0)
  const totalDuration = course.modules.reduce((sum, module) =>
    sum + module.lessons.reduce((moduleSum, lesson) => moduleSum + lesson.duration, 0), 0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">{course.title}</CardTitle>
                <Badge variant={course.isPublished ? 'default' : 'secondary'}>
                  {course.isPublished ? 'Publicado' : 'Borrador'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {course.language}
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {course.level}
                </div>
                <div className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  {course.modules.length} módulos
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {totalLessons} lecciones
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.round(totalDuration / 60)}h {totalDuration % 60}min
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Módulos
          </TabsTrigger>
          <TabsTrigger value="lessons" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Lecciones
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Estudiantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <CourseInfoTab
            course={course}
            onUpdateCourse={updateCourse}
          />
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <ModulesTab
            modules={course.modules}
            courseId={course.id}
            onModulesChange={(modules) => setCourse({ ...course, modules })}
            onAddModule={addModule}
            onUpdateModule={updateModule}
            onRemoveModule={removeModule}
            onReorderModules={reorderModules}
          />
        </TabsContent>

        <TabsContent value="lessons" className="space-y-4">
          <LessonsTab
            modules={course.modules}
            onAddLesson={addLesson}
            onRemoveLesson={removeLesson}
            onReorderLessons={reorderLessonsInModule}
          />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <StudentsTab courseId={course.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
