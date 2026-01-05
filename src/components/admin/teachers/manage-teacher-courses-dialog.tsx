'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getCoursesGroupedByLanguage,
  assignMultipleCoursesToTeacher,
} from '@/lib/actions/teacher-courses'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Loader2, DollarSign } from 'lucide-react'

interface ManageTeacherCoursesDialogProps {
  teacherId: string
  teacherName: string
  children: React.ReactNode
}

interface Course {
  id: string
  title: string
  description: string
  language: string
  level: string
  isAssigned: boolean
  paymentPerClass: number | null
}

interface CoursePayment {
  courseId: string
  paymentPerClass: number | null
}

export function ManageTeacherCoursesDialog({
  teacherId,
  teacherName,
  children,
}: ManageTeacherCoursesDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [groupedCourses, setGroupedCourses] = useState<Record<string, Course[]>>({})
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())
  const [coursePayments, setCoursePayments] = useState<Map<string, number | null>>(new Map())

  const loadCourses = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getCoursesGroupedByLanguage(teacherId)
      if (result.success && 'groupedCourses' in result && result.groupedCourses) {
        setGroupedCourses(result.groupedCourses)
        
        // Inicializar cursos seleccionados y pagos
        const assigned = new Set<string>()
        const payments = new Map<string, number | null>()
        Object.values(result.groupedCourses).forEach((courses: Course[]) => {
          courses.forEach((course: Course) => {
            if (course.isAssigned) {
              assigned.add(course.id)
              payments.set(course.id, course.paymentPerClass)
            }
          })
        })
        setSelectedCourses(assigned)
        setCoursePayments(payments)
      } else {
        toast.error('error' in result ? result.error : 'Error al cargar cursos')
      }
    } catch (error) {
      console.error('Error loading courses:', error)
      toast.error('Error al cargar los cursos')
    } finally {
      setIsLoading(false)
    }
  }, [teacherId])

  useEffect(() => {
    if (open) {
      loadCourses()
    }
  }, [open, loadCourses])

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(courseId)) {
        newSet.delete(courseId)
        // Limpiar el pago cuando se deselecciona
        setCoursePayments((prevPayments) => {
          const newPayments = new Map(prevPayments)
          newPayments.delete(courseId)
          return newPayments
        })
      } else {
        newSet.add(courseId)
      }
      return newSet
    })
  }

  const handlePaymentChange = (courseId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)
    setCoursePayments((prev) => {
      const newPayments = new Map(prev)
      newPayments.set(courseId, numValue)
      return newPayments
    })
  }

  const handleLanguageToggle = async (language: string, checked: boolean) => {
    const languageCourses = groupedCourses[language] || []
    const languageCourseIds = languageCourses.map((c) => c.id)

    if (checked) {
      // Seleccionar todos los cursos del idioma
      setSelectedCourses((prev) => {
        const newSet = new Set(prev)
        languageCourseIds.forEach((id) => newSet.add(id))
        return newSet
      })
    } else {
      // Deseleccionar todos los cursos del idioma y limpiar pagos
      setSelectedCourses((prev) => {
        const newSet = new Set(prev)
        languageCourseIds.forEach((id) => newSet.delete(id))
        return newSet
      })
      setCoursePayments((prev) => {
        const newPayments = new Map(prev)
        languageCourseIds.forEach((id) => newPayments.delete(id))
        return newPayments
      })
    }
  }

  const isLanguageFullySelected = (language: string) => {
    const languageCourses = groupedCourses[language] || []
    return languageCourses.every((course) => selectedCourses.has(course.id))
  }

  const isLanguagePartiallySelected = (language: string) => {
    const languageCourses = groupedCourses[language] || []
    const selectedCount = languageCourses.filter((course) =>
      selectedCourses.has(course.id)
    ).length
    return selectedCount > 0 && selectedCount < languageCourses.length
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const courseAssignments: CoursePayment[] = Array.from(selectedCourses).map((courseId) => ({
        courseId,
        paymentPerClass: coursePayments.get(courseId) ?? null,
      }))
      const result = await assignMultipleCoursesToTeacher(
        teacherId,
        courseAssignments
      )

      if (result.success) {
        toast.success('Cursos actualizados exitosamente')
        setOpen(false)
      } else {
        toast.error(result.error || 'Error al actualizar cursos')
      }
    } catch (error) {
      console.error('Error saving courses:', error)
      toast.error('Error al guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gestionar Cursos del Profesor</DialogTitle>
          <DialogDescription>
            Selecciona los cursos que {teacherName} puede enseñar. Puedes seleccionar
            cursos individuales o todos los cursos de un idioma.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-6">
              {Object.keys(groupedCourses).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay cursos disponibles
                </p>
              ) : (
                Object.entries(groupedCourses).map(([language, courses]) => (
                  <div key={language} className="space-y-3">
                    {/* Checkbox del idioma */}
                    <div className="flex items-center space-x-2 border-b pb-2">
                      <Checkbox
                        id={`language-${language}`}
                        checked={isLanguageFullySelected(language)}
                        onCheckedChange={(checked) =>
                          handleLanguageToggle(language, checked as boolean)
                        }
                        className={
                          isLanguagePartiallySelected(language)
                            ? 'data-[state=checked]:bg-blue-500'
                            : ''
                        }
                      />
                      <label
                        htmlFor={`language-${language}`}
                        className="text-sm font-semibold cursor-pointer flex-1"
                      >
                        {language.toUpperCase()} ({courses.length} curso
                        {courses.length !== 1 ? 's' : ''})
                      </label>
                    </div>

                    {/* Checkboxes de cursos individuales */}
                    <div className="ml-6 space-y-2">
                      {courses.map((course) => (
                        <div
                          key={course.id}
                          className="flex items-start space-x-2 py-1"
                        >
                          <Checkbox
                            id={`course-${course.id}`}
                            checked={selectedCourses.has(course.id)}
                            onCheckedChange={() => handleCourseToggle(course.id)}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`course-${course.id}`}
                              className="text-sm font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {course.title}
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Nivel: {course.level}
                            </p>
                          </div>
                          {selectedCourses.has(course.id) && (
                            <div className="flex items-center gap-1 min-w-[120px]">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                placeholder="Pago"
                                className="h-7 w-20 text-sm"
                                value={coursePayments.get(course.id) ?? ''}
                                onChange={(e) => handlePaymentChange(course.id, e.target.value)}
                                min={0}
                                step={0.01}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
