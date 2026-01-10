'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Loader2, Search, Users } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  getStudentsForExamAssignment,
  assignExamToStudents,
} from '@/lib/actions/teacher-exams'
import { toast } from 'sonner'

interface Student {
  id: string
  name: string
  lastName: string | null
  email: string
  image: string | null
  enrollmentId: string
}

interface AssignStudentsDialogProps {
  examId: string
  courseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  currentAssignments: string[]
}

export function AssignStudentsDialog({
  examId,
  courseId,
  open,
  onOpenChange,
  currentAssignments,
}: AssignStudentsDialogProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>(currentAssignments)
  const [searchQuery, setSearchQuery] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [instructions, setInstructions] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const fetchStudents = async () => {
    setIsFetching(true)
    try {
      const result = await getStudentsForExamAssignment(courseId)
      if (result.success) {
        setStudents(result.students)
      } else {
        toast.error(result.error || 'Error al cargar estudiantes')
      }
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    if (open) {
      setSelectedStudents(currentAssignments)
      fetchStudents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, courseId, currentAssignments])


  const filteredStudents = students.filter((student) => {
    const fullName = `${student.name} ${student.lastName || ''}`.toLowerCase()
    const email = student.email.toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map((s) => s.id))
    }
  }

  const handleAssign = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Selecciona al menos un estudiante')
      return
    }

    setIsLoading(true)
    try {
      const result = await assignExamToStudents(
        examId,
        selectedStudents,
        dueDate,
        instructions || undefined
      )

      if (result.success) {
        toast.success(`Examen asignado a ${selectedStudents.length} estudiante(s)`)
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al asignar examen')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string, lastName: string | null) => {
    const first = name?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Asignar Estudiantes</DialogTitle>
          <DialogDescription>
            Selecciona los estudiantes que deben completar este examen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar estudiantes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isFetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No hay estudiantes disponibles</p>
              <p className="text-sm">Solo aparecen estudiantes con clases contigo en este curso</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {selectedStudents.length === filteredStudents.length
                    ? 'Deseleccionar todos'
                    : 'Seleccionar todos'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedStudents.length} seleccionado(s)
                </span>
              </div>

              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-1">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors',
                        selectedStudents.includes(student.id) && 'bg-muted'
                      )}
                      onClick={() => handleToggleStudent(student.id)}
                    >
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => handleToggleStudent(student.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.image || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(student.name, student.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {student.name} {student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <div className="grid gap-4 pt-2 border-t">
            <div className="grid gap-2">
              <Label>Fecha límite (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>Instrucciones adicionales (opcional)</Label>
              <Textarea
                placeholder="Instrucciones específicas para los estudiantes..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isLoading || selectedStudents.length === 0}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Asignar ({selectedStudents.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
