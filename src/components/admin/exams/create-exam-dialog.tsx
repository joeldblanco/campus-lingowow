'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit } from 'lucide-react'
import {
  createExam,
  getCoursesForExams,
  ExamData,
  ExamSection,
  ExamQuestion,
} from '@/lib/actions/exams'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

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
        level: number
        order: number
        lessons: Array<{
          id: string
          title: string
          order: number
        }>
      }>
    }>
  >([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    moduleId: '',
    lessonId: '',
    timeLimit: 60,
    passingScore: 70,
    attempts: 3,
    isBlocking: false,
    isOptional: false,
  })
  const [sections, setSections] = useState<ExamSection[]>([])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sections.length === 0) {
      toast.error('Por favor, agregue al menos una sección')
      return
    }

    setLoading(true)
    try {
      const examData: ExamData = {
        title: formData.title,
        description: formData.description,
        sections,
        totalPoints: sections.reduce(
          (sum, section) => sum + section.questions.reduce((qSum, q) => qSum + q.points, 0),
          0
        ),
        timeLimit: formData.timeLimit,
        passingScore: formData.passingScore,
        attempts: formData.attempts,
        isBlocking: formData.isBlocking,
        isOptional: formData.isOptional,
      }

      const result = await createExam({
        title: formData.title,
        description: formData.description,
        courseId: formData.courseId || undefined,
        moduleId: formData.moduleId || undefined,
        lessonId: formData.lessonId || undefined,
        examData,
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
    setFormData({
      title: '',
      description: '',
      courseId: '',
      moduleId: '',
      lessonId: '',
      timeLimit: 60,
      passingScore: 70,
      attempts: 3,
      isBlocking: false,
      isOptional: false,
    })
    setSections([])
    // setEditingSection(null)
    // setEditingQuestion(null)
    // setSectionForm({ title: '', description: '', timeLimit: 30 })
    // setQuestionForm({
    //   question: '',
    //   type: 'multiple_choice',
    //   options: ['', '', '', ''],
    //   correctAnswer: '',
    //   points: 1,
    //   explanation: ''
    // })
  }

  const addSection = () => {
    const newSection: ExamSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      description: '',
      timeLimit: 30,
      questions: [],
      order: sections.length + 1,
    }
    setSections([...sections, newSection])
  }

  const updateSection = (sectionId: string, updates: Partial<ExamSection>) => {
    setSections(
      sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section))
    )
  }

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter((section) => section.id !== sectionId))
  }

  const addQuestion = (sectionId: string) => {
    const newQuestion: ExamQuestion = {
      id: `question-${Date.now()}`,
      type: 'multiple_choice',
      question: 'New Question',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      points: 1,
      explanation: '',
    }

    updateSection(sectionId, {
      questions: [...(sections.find((s) => s.id === sectionId)?.questions || []), newQuestion],
    })
    // setQuestionForm({
    //   question: newQuestion.question,
    //   type: newQuestion.type,
    //   options: [...newQuestion.options!],
    //   correctAnswer: newQuestion.correctAnswer as string,
    //   points: newQuestion.points,
    //   explanation: newQuestion.explanation || ''
    // })
    // setEditingQuestion(newQuestion)
  }

  // const updateQuestion = (
  //   sectionId: string,
  //   questionId: string,
  //   updates: Partial<ExamQuestion>
  // ) => {
  //   const section = sections.find((s) => s.id === sectionId)
  //   if (section) {
  //     const updatedQuestions = section.questions.map((q) =>
  //       q.id === questionId ? { ...q, ...updates } : q
  //     )
  //     updateSection(sectionId, { questions: updatedQuestions })
  //   }
  // }

  const deleteQuestion = (sectionId: string, questionId: string) => {
    const section = sections.find((s) => s.id === sectionId)
    if (section) {
      const updatedQuestions = section.questions.filter((q) => q.id !== questionId)
      updateSection(sectionId, { questions: updatedQuestions })
    }
  }

  const selectedCourse = courses.find((c) => c.id === formData.courseId)
  const availableModules = selectedCourse?.modules || []
  const selectedModule = availableModules.find((m) => m.id === formData.moduleId)
  const availableLessons = selectedModule?.lessons || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Examen</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titulo</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeLimit">Tiempo límite (minutos)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={formData.timeLimit}
                onChange={(e) =>
                  setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 60 })
                }
                min="1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Course Assignment */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Curso</Label>
              <Select
                value={formData.courseId}
                onValueChange={(value) => {
                  setFormData({ ...formData, courseId: value, moduleId: '', lessonId: '' })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title} ({course.language})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Módulo (Opcional)</Label>
              <Select
                value={formData.moduleId}
                onValueChange={(value) =>
                  setFormData({ ...formData, moduleId: value, lessonId: '' })
                }
                disabled={!formData.courseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar módulo" />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.title} (Level {module.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lección (Opcional)</Label>
              <Select
                value={formData.lessonId}
                onValueChange={(value) => setFormData({ ...formData, lessonId: value })}
                disabled={!formData.moduleId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar lección" />
                </SelectTrigger>
                <SelectContent>
                  {availableLessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exam Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passingScore">Puntaje de aprobación (%)</Label>
              <Input
                id="passingScore"
                type="number"
                value={formData.passingScore}
                onChange={(e) =>
                  setFormData({ ...formData, passingScore: parseInt(e.target.value) || 70 })
                }
                min="0"
                max="100"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attempts">Intentos máximos</Label>
              <Input
                id="attempts"
                type="number"
                value={formData.attempts}
                onChange={(e) =>
                  setFormData({ ...formData, attempts: parseInt(e.target.value) || 3 })
                }
                min="1"
                required
              />
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Secciones del examen</h3>
              <Button type="button" onClick={addSection} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Agregar sección
              </Button>
            </div>

            {sections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <div className="flex space-x-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => {}}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addQuestion(section.id)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSection(section.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {section.questions.map((question) => (
                      <div
                        key={question.id}
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
                          <Button type="button" variant="ghost" size="sm" onClick={() => {}}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(section.id, question.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {section.questions.length === 0 && (
                      <p className="text-muted-foreground text-sm">No questions added yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
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
      </DialogContent>
    </Dialog>
  )
}
