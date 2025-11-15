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
  Save,
  Globe,
  Clock,
  Target
} from 'lucide-react'
import { toast } from 'sonner'

interface CourseBuilderProps {
  initialCourse: CourseBuilderData
}

export function CourseBuilder({ initialCourse }: CourseBuilderProps) {
  const [course, setCourse] = useState<CourseBuilderData>(initialCourse)
  const [activeTab, setActiveTab] = useState('info')
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const updateCourse = useCallback((updates: Partial<CourseBuilderData>) => {
    setCourse(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }, [])

  const updateModule = useCallback((moduleId: string, updates: Partial<Module>) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module =>
        module.id === moduleId ? { ...module, ...updates } : module
      )
    }))
    setHasChanges(true)
  }, [])

  const addModule = useCallback((module: Module) => {
    setCourse(prev => ({
      ...prev,
      modules: [...prev.modules, module]
    }))
    setHasChanges(true)
  }, [])

  const removeModule = useCallback((moduleId: string) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.filter(module => module.id !== moduleId)
    }))
    setHasChanges(true)
  }, [])

  const reorderModules = useCallback((modules: Module[]) => {
    setCourse(prev => ({ ...prev, modules }))
    setHasChanges(true)
  }, [])

  const updateLesson = useCallback((moduleId: string, lessonId: string, updates: Partial<Lesson>) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module =>
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons.map(lesson =>
                lesson.id === lessonId ? { ...lesson, ...updates } : lesson
              )
            }
          : module
      )
    }))
    setHasChanges(true)
  }, [])

  const addLesson = useCallback((moduleId: string, lesson: Lesson) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module =>
        module.id === moduleId
          ? { ...module, lessons: [...module.lessons, lesson] }
          : module
      )
    }))
    setHasChanges(true)
  }, [])

  const removeLesson = useCallback((moduleId: string, lessonId: string) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(module =>
        module.id === moduleId
          ? { ...module, lessons: module.lessons.filter(lesson => lesson.id !== lessonId) }
          : module
      )
    }))
    setHasChanges(true)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // TODO: Implement save action
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate save
      setHasChanges(false)
      toast.success('Curso guardado exitosamente')
    } catch (error) {
      console.error('Error saving course:', error)
      toast.error('Error al guardar el curso')
    } finally {
      setIsSaving(false)
    }
  }

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
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || isSaving}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Guardar'}
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
            onUpdateLesson={updateLesson}
            onAddLesson={addLesson}
            onRemoveLesson={removeLesson}
          />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <StudentsTab courseId={course.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
