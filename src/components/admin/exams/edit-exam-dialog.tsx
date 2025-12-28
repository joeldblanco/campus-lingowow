'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { updateExam } from '@/lib/actions/exams'
import { toast } from 'sonner'
import { EditExamSchema } from '@/schemas/exams'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { ExamWithDetails, CreateExamSectionData, CreateExamQuestionData } from '@/types/exam'

interface EditExamDialogProps {
  exam: ExamWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FormData = z.infer<typeof EditExamSchema>

export function EditExamDialog({ exam, open, onOpenChange }: EditExamDialogProps) {
  const [sections, setSections] = useState<CreateExamSectionData[]>(
    exam.sections.map(s => ({
      title: s.title,
      description: s.description || undefined,
      instructions: s.instructions || undefined,
      timeLimit: s.timeLimit || undefined,
      order: s.order,
      questions: s.questions.map(q => ({
        type: q.type as CreateExamQuestionData['type'],
        question: q.question,
        options: q.options as string[] | undefined,
        correctAnswer: q.correctAnswer as string | string[],
        explanation: q.explanation || undefined,
        points: q.points,
        order: q.order,
        difficulty: q.difficulty as CreateExamQuestionData['difficulty'],
        tags: q.tags as string[],
        caseSensitive: q.caseSensitive,
        partialCredit: q.partialCredit,
        minLength: q.minLength || undefined,
        maxLength: q.maxLength || undefined
      }))
    }))
  )
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(EditExamSchema),
    defaultValues: {
      title: exam.title,
      description: exam.description,
      timeLimit: exam.timeLimit || 60,
      passingScore: exam.passingScore || 70,
      maxAttempts: exam.maxAttempts || 3,
      isBlocking: exam.isBlocking || false,
      isOptional: exam.isOptional || false,
      isPublished: exam.isPublished,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: exam.title,
        description: exam.description,
        timeLimit: exam.timeLimit || 60,
        passingScore: exam.passingScore || 70,
        maxAttempts: exam.maxAttempts || 3,
        isBlocking: exam.isBlocking || false,
        isOptional: exam.isOptional || false,
        isPublished: exam.isPublished,
      })
      setSections(exam.sections.map(s => ({
        title: s.title,
        description: s.description || undefined,
        instructions: s.instructions || undefined,
        timeLimit: s.timeLimit || undefined,
        order: s.order,
        questions: s.questions.map(q => ({
          type: q.type as CreateExamQuestionData['type'],
          question: q.question,
          options: q.options as string[] | undefined,
          correctAnswer: q.correctAnswer as string | string[],
          explanation: q.explanation || undefined,
          points: q.points,
          order: q.order,
          difficulty: q.difficulty as CreateExamQuestionData['difficulty'],
          tags: q.tags as string[],
          caseSensitive: q.caseSensitive,
          partialCredit: q.partialCredit,
          minLength: q.minLength || undefined,
          maxLength: q.maxLength || undefined
        }))  
      })))
    }
  }, [exam, open, form])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sections.length === 0) {
      toast.error('Por favor, agregue al menos una sección')
      return
    }

    const formValues = form.getValues()
    setLoading(true)
    try {
      const result = await updateExam(exam.id, {
        title: formValues.title,
        description: formValues.description,
        sections,
        timeLimit: formValues.timeLimit,
        passingScore: formValues.passingScore,
        maxAttempts: formValues.maxAttempts,
        isBlocking: formValues.isBlocking,
        isOptional: formValues.isOptional,
        isPublished: formValues.isPublished,
      })

      if (result.success) {
        toast.success('Examen actualizado exitosamente')
        onOpenChange(false)
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al actualizar examen')
      }
    } catch (error) {
      console.error('Error updating exam:', error)
      toast.error('Error al actualizar examen')
    } finally {
      setLoading(false)
    }
  }

  const addSection = () => {
    const newSection: CreateExamSectionData = {
      title: 'Nueva Sección',
      description: '',
      timeLimit: 30,
      questions: [],
      order: sections.length + 1
    }
    setSections([...sections, newSection])
  }

  const updateSection = (sectionIndex: number, updates: Partial<CreateExamSectionData>) => {
    setSections(
      sections.map((section, index) => (index === sectionIndex ? { ...section, ...updates } : section))
    )
  }

  const deleteSection = (sectionIndex: number) => {
    setSections(sections.filter((_, index) => index !== sectionIndex))
  }

  const addQuestion = (sectionIndex: number) => {
    const newQuestion: CreateExamQuestionData = {
      type: 'MULTIPLE_CHOICE',
      question: 'Nueva Pregunta',
      options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
      correctAnswer: 'Opción A',
      points: 1,
      explanation: '',
      order: sections[sectionIndex]?.questions.length || 0,
      difficulty: 'MEDIUM',
      tags: [],
      caseSensitive: false,
      partialCredit: false
    }

    updateSection(sectionIndex, {
      questions: [...(sections[sectionIndex]?.questions || []), newQuestion],
    })
  }

  const updateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    updates: Partial<CreateExamQuestionData>
  ) => {
    const section = sections[sectionIndex]
    if (section) {
      const updatedQuestions = section.questions.map((q, index) =>
        index === questionIndex ? { ...q, ...updates } : q
      )
      updateSection(sectionIndex, { questions: updatedQuestions })
    }
  }

  const deleteQuestion = (sectionIndex: number, questionIndex: number) => {
    const section = sections[sectionIndex]
    if (section) {
      const updatedQuestions = section.questions.filter((_, index) => index !== questionIndex)
      updateSection(sectionIndex, { questions: updatedQuestions })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Editar Examen: {exam.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                    <FormLabel>Tiempo Límite (minutos)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
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

            {/* Exam Settings */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="passingScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puntaje Mínimo (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
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
                    <FormLabel>Intentos Máximos</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Publishing Settings */}
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Publicado (visible para estudiantes)</FormLabel>
                </FormItem>
              )}
            />

            {/* Sections */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Secciones del Examen</h3>
                <Button type="button" onClick={addSection} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Sección
                </Button>
              </div>

              {sections.map((section, sectionIndex) => (
                <Card key={sectionIndex}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1 mr-4">
                        <Input
                          value={section.title}
                          onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                          placeholder="Título de sección"
                        />
                        <Input
                          value={section.description || ''}
                          onChange={(e) =>
                            updateSection(sectionIndex, { description: e.target.value })
                          }
                          placeholder="Descripción de sección (opcional)"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addQuestion(sectionIndex)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSection(sectionIndex)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {section.questions.map((question, questionIndex) => (
                        <div key={questionIndex} className="space-y-2 p-3 border rounded">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-2">
                              <Input
                                value={question.question}
                                onChange={(e) =>
                                  updateQuestion(sectionIndex, questionIndex, {
                                    question: e.target.value,
                                  })
                                }
                                placeholder="Texto de pregunta"
                              />
                              <div className="flex space-x-2">
                                <Input
                                  type="number"
                                  value={question.points}
                                  onChange={(e) =>
                                    updateQuestion(sectionIndex, questionIndex, {
                                      points: parseInt(e.target.value),
                                    })
                                  }
                                  placeholder="Puntos"
                                  className="w-20"
                                  min="1"
                                />
                                <Badge variant="secondary">{question.type}</Badge>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteQuestion(sectionIndex, questionIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          {question.type === 'MULTIPLE_CHOICE' && (
                            <div className="space-y-1">
                              {question.options?.map((option: string, optionIndex: number) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <Input
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...(question.options || [])]
                                      newOptions[optionIndex] = e.target.value
                                      updateQuestion(sectionIndex, questionIndex, {
                                        options: newOptions,
                                      })
                                    }}
                                    placeholder={`Opción ${String.fromCharCode(65 + optionIndex)}`}
                                  />
                                  <input
                                    type="radio"
                                    name={`correct-${sectionIndex}-${questionIndex}`}
                                    checked={question.correctAnswer === option}
                                    onChange={() =>
                                      updateQuestion(sectionIndex, questionIndex, {
                                        correctAnswer: option,
                                      })
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {section.questions.length === 0 && (
                        <p className="text-muted-foreground text-sm">No se han agregado preguntas aún</p>
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
                {loading ? 'Actualizando...' : 'Actualizar Examen'}
              </Button>
            </div>
          </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
