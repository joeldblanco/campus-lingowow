'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Users, Calendar } from 'lucide-react'
import { assignExamToStudents } from '@/lib/actions/exams'
import { toast } from 'sonner'
import { AssignExamSchema } from '@/schemas/exams'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { ExamWithDetails } from '@/types/exam'
import { calculateExamPoints } from '@/lib/utils/exam-helpers'

interface AssignExamDialogProps {
  exam: ExamWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Student {
  id: string
  name: string
  lastName: string
  email: string
  enrollments: {
    course: {
      title: string
      language: string
    }
  }[]
}

type FormData = z.infer<typeof AssignExamSchema>

export function AssignExamDialog({ exam, open, onOpenChange }: AssignExamDialogProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(AssignExamSchema),
    defaultValues: {
      examId: exam.id,
      studentIds: [],
      dueDate: '',
      instructions: '',
    },
  })

  const selectedStudents = form.watch('studentIds')

  useEffect(() => {
    if (open) {
      loadStudents()
      form.reset({
        examId: exam.id,
        studentIds: [],
        dueDate: '',
        instructions: '',
      })
      setSearchTerm('')
    }
  }, [open, exam.id, form])

  const loadStudents = async () => {
    try {
      // Mock data - in real implementation, this would fetch from the database
      const mockStudents: Student[] = [
        {
          id: '1',
          name: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          enrollments: [
            {
              course: {
                title: 'English Beginner',
                language: 'English',
              },
            },
          ],
        },
        {
          id: '2',
          name: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          enrollments: [
            {
              course: {
                title: 'Spanish Intermediate',
                language: 'Spanish',
              },
            },
          ],
        },
        {
          id: '3',
          name: 'Carlos',
          lastName: 'Rodriguez',
          email: 'carlos.rodriguez@example.com',
          enrollments: [
            {
              course: {
                title: 'English Advanced',
                language: 'English',
              },
            },
          ],
        },
      ]
      setStudents(mockStudents)
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('Failed to load students')
    }
  }

  const filterStudents = useCallback(() => {
    let filtered = students

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by course if exam is assigned to a specific course
    if (exam.courseId) {
      filtered = filtered.filter((student) =>
        student.enrollments.some((enrollment) =>
          enrollment.course.title.includes(exam.course?.title || '')
        )
      )
    }

    setFilteredStudents(filtered)
  }, [students, searchTerm, exam.courseId, exam.course?.title])

  useEffect(() => {
    filterStudents()
  }, [students, searchTerm, filterStudents])

  const handleStudentToggle = (studentId: string) => {
    const currentIds = form.getValues('studentIds')
    const newIds = currentIds.includes(studentId)
      ? currentIds.filter((id) => id !== studentId)
      : [...currentIds, studentId]
    form.setValue('studentIds', newIds, { shouldValidate: true })
  }

  const handleSelectAll = () => {
    const currentIds = form.getValues('studentIds')
    if (currentIds.length === filteredStudents.length && filteredStudents.length > 0) {
      form.setValue('studentIds', [], { shouldValidate: true })
    } else {
      const eligibleStudents = filteredStudents
        .filter((s) => !alreadyAssignedStudents.includes(s.id))
        .map((s) => s.id)
      form.setValue('studentIds', eligibleStudents, { shouldValidate: true })
    }
  }

  const alreadyAssignedStudents = exam.attempts.map((attempt) => attempt.userId)

  const onSubmit = async (values: FormData) => {
    setLoading(true)
    try {
      const result = await assignExamToStudents(values)

      if (result.success) {
        toast.success(
          `Examen asignado a ${values.studentIds.length} estudiante${values.studentIds.length > 1 ? 's' : ''}`
        )
        onOpenChange(false)
        form.reset()
        setSearchTerm('')
      } else {
        toast.error(result.error || 'Error al asignar el examen')
      }
    } catch (error) {
      console.error('Error assigning exam:', error)
      toast.error('Error al asignar el examen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Asignar Examen: {exam.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Exam Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalles del Examen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">{exam.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {exam.course && (
                      <>
                        <Badge variant="outline">{exam.course.title}</Badge>
                        <Badge variant="secondary">{exam.course.language}</Badge>
                      </>
                    )}
                    <Badge variant="outline">{calculateExamPoints(exam)} puntos</Badge>
                    <Badge variant="outline">{exam.passingScore}% para aprobar</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fecha límite e instrucciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha límite (opcional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="datetime-local"
                          placeholder="Seleccionar fecha"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Fecha y hora límite para completar el examen</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instrucciones adicionales (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej: Revisar el material del módulo 3 antes del examen"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Instrucciones específicas para los estudiantes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Search */}
            <div className="space-y-2">
              <FormLabel>Buscar Estudiantes</FormLabel>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Select All */}
            <FormField
              control={form.control}
              name="studentIds"
              render={() => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="selectAll"
                      checked={
                        selectedStudents.length ===
                          filteredStudents.filter((s) => !alreadyAssignedStudents.includes(s.id))
                            .length &&
                        filteredStudents.filter((s) => !alreadyAssignedStudents.includes(s.id))
                          .length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                    <FormLabel htmlFor="selectAll" className="cursor-pointer">
                      Seleccionar todos (
                      {
                        filteredStudents.filter((s) => !alreadyAssignedStudents.includes(s.id))
                          .length
                      }{' '}
                      disponibles)
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Students List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Estudiantes Disponibles ({filteredStudents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No se encontraron estudiantes
                    </p>
                  ) : (
                    filteredStudents.map((student) => {
                      const isAlreadyAssigned = alreadyAssignedStudents.includes(student.id)
                      const isSelected = selectedStudents.includes(student.id)

                      return (
                        <div
                          key={student.id}
                          className={`flex items-center space-x-3 p-3 border rounded transition-colors ${
                            isAlreadyAssigned ? 'bg-muted opacity-50' : 'hover:bg-accent'
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleStudentToggle(student.id)}
                            disabled={isAlreadyAssigned}
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">
                                {student.name} {student.lastName}
                              </span>
                              {isAlreadyAssigned && (
                                <Badge variant="secondary" className="text-xs">
                                  Ya asignado
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {student.enrollments.map((enrollment, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {enrollment.course.title}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Count */}
            {selectedStudents.length > 0 && (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <p className="text-sm font-medium">
                  <strong className="text-primary">{selectedStudents.length}</strong> estudiante
                  {selectedStudents.length > 1 ? 's' : ''} seleccionado
                  {selectedStudents.length > 1 ? 's' : ''} para asignación
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || selectedStudents.length === 0}>
                {loading
                  ? 'Asignando...'
                  : `Asignar a ${selectedStudents.length} estudiante${selectedStudents.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
