'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit } from 'lucide-react'
import { createExam, getCoursesForExams } from '@/lib/actions/exams'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { CreateExamSchema } from '@/schemas/exams'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { CreateExamQuestionData } from '@/types/exam'

interface CreateExamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateExamDialog({ open, onOpenChange }: CreateExamDialogProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState<
    Array<{
      id: string
      title: string
      language: string
      modules: Array<{
        id: string
        title: string
        level: string
        order: number
        lessons: Array<{
          id: string
          title: string
          order: number
        }>
      }>
    }>
  >([])
  const form = useForm<z.infer<typeof CreateExamSchema>>({
    resolver: zodResolver(CreateExamSchema),
    defaultValues: {
      title: '',
      description: '',
      courseId: '',
      moduleId: '',
      lessonId: '',
      timeLimit: 60,
      passingScore: 70,
      maxAttempts: 3,
      isBlocking: false,
      isOptional: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResults: true,
      allowReview: true,
    },
  })
  const [questions, setQuestions] = useState<CreateExamQuestionData[]>([])

  useEffect(() => {
    if (open) {
      loadCourses()
    }
  }, [open])

  const loadCourses = async () => {
    try {
      const coursesData = await getCoursesForExams()
      setCourses(coursesData)
    } catch (error) {
      console.error('Error loading courses:', error)
      toast.error('Error al cargar cursos')
    }
  }

  const onSubmit = async (values: z.infer<typeof CreateExamSchema>) => {
    if (questions.length === 0) {
      toast.error('Por favor, agregue al menos una pregunta')
      return
    }

    setLoading(true)
    try {
      const result = await createExam({
        title: values.title,
        description: values.description || '',
        instructions: values.instructions,
        timeLimit: values.timeLimit,
        passingScore: values.passingScore,
        maxAttempts: values.maxAttempts,
        isBlocking: values.isBlocking,
        isOptional: values.isOptional,
        isPublished: false,
        shuffleQuestions: values.shuffleQuestions,
        shuffleOptions: values.shuffleOptions,
        showResults: values.showResults,
        allowReview: values.allowReview,
        proctoringEnabled: values.proctoringEnabled,
        requireFullscreen: values.requireFullscreen,
        blockCopyPaste: values.blockCopyPaste,
        blockRightClick: values.blockRightClick,
        maxWarnings: values.maxWarnings,
        courseId: values.courseId || undefined,
        moduleId: values.moduleId || undefined,
        lessonId: values.lessonId || undefined,
        questions,
        createdById: session?.user?.id || 'anonymous',
      })

      if (result.success) {
        toast.success('Examen creado exitosamente')
        onOpenChange(false)
        resetForm()
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al crear examen')
      }
    } catch (error) {
      console.error('Error creating exam:', error)
      toast.error('Error al crear examen')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    form.reset()
    setQuestions([])
  }

  const addQuestion = () => {
    const newQuestion: CreateExamQuestionData = {
      type: 'MULTIPLE_CHOICE',
      question: 'Nueva Pregunta',
      options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
      correctAnswer: 'Opción A',
      points: 1,
      order: questions.length,
      difficulty: 'MEDIUM',
      tags: [],
      caseSensitive: false,
      partialCredit: false,
      explanation: '',
    }
    setQuestions([...questions, newQuestion])
  }

  const deleteQuestion = (questionIndex: number) => {
    setQuestions(questions.filter((_, idx) => idx !== questionIndex))
  }

  const selectedCourse = courses.find((c) => c.id === form.watch('courseId'))
  const availableModules = selectedCourse?.modules || []
  const selectedModule = availableModules.find((m) => m.id === form.watch('moduleId'))
  const availableLessons = selectedModule?.lessons || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Crear Examen</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiempo límite (minutos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Course Assignment */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Curso</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue('moduleId', '')
                        form.setValue('lessonId', '')
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar curso" className="truncate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-w-[300px]">
                        {courses.length === 0 ? (
                          <SelectItem value="no-courses" disabled>
                            No hay cursos disponibles
                          </SelectItem>
                        ) : (
                          courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              <div
                                className="truncate w-full"
                                title={`${course.title} (${course.language})`}
                              >
                                {course.title} ({course.language})
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="moduleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Módulo (Opcional)</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue('lessonId', '')
                      }}
                      value={field.value}
                      disabled={!form.watch('courseId')}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar módulo" className="truncate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-w-[300px]">
                        {availableModules.length === 0 ? (
                          <SelectItem value="no-modules" disabled>
                            No hay módulos disponibles
                          </SelectItem>
                        ) : (
                          availableModules.map((module) => (
                            <SelectItem key={module.id} value={module.id}>
                              <div
                                className="truncate w-full"
                                title={`${module.title} (Level ${module.level})`}
                              >
                                {module.title} (Level {module.level})
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lessonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lección (Opcional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!form.watch('moduleId')}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar lección" className="truncate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-w-[300px]">
                        {availableLessons.length === 0 ? (
                          <SelectItem value="no-lessons" disabled>
                            No hay lecciones disponibles
                          </SelectItem>
                        ) : (
                          availableLessons.map((lesson) => (
                            <SelectItem key={lesson.id} value={lesson.id}>
                              <div className="truncate w-full" title={lesson.title}>
                                {lesson.title}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Exam Settings */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="passingScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puntaje de aprobación (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 70)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxAttempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intentos máximos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Preguntas del examen</h3>
                <Button type="button" onClick={addQuestion} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar pregunta
                </Button>
              </div>

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {questions.map((question, questionIndex) => (
                      <div
                        key={questionIndex}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div>
                          <span className="font-medium">{question.question}</span>
                          <Badge variant="secondary" className="ml-2">
                            {question.type}
                          </Badge>
                          <Badge variant="outline" className="ml-1">
                            {question.points} pts
                          </Badge>
                        </div>
                        <div className="flex space-x-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => { }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(questionIndex)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {questions.length === 0 && (
                      <p className="text-muted-foreground text-sm">No se han agregado preguntas</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear examen'}
              </Button>
            </div>
          </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
