'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClass, getAllStudents, getAllTeachers, getAvailableTeachers } from '@/lib/actions/classes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface CreateClassDialogProps {
  children: React.ReactNode
}

export function CreateClassDialog({ children }: CreateClassDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [students, setStudents] = useState<Array<{ id: string; name: string; lastName: string; email: string }>>([])
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string; lastName: string; email: string }>>([])
  const [availableTeachers, setAvailableTeachers] = useState<Array<{ id: string; name: string; lastName: string; email: string }>>([])
  const [formData, setFormData] = useState({
    studentId: '',
    teacherId: '',
    day: '',
    timeSlot: '',
    notes: '',
  })

  const loadData = async () => {
    try {
      const [studentsData, teachersData] = await Promise.all([
        getAllStudents(),
        getAllTeachers(),
      ])
      setStudents(studentsData)
      setTeachers(teachersData)
    } catch {
      console.error('Error loading students')
    }
  }

  const loadAvailableTeachers = useCallback(async () => {
    try {
      const available = await getAvailableTeachers(formData.day, formData.timeSlot)
      setAvailableTeachers(available)
    } catch {
      toast.error('Error al verificar disponibilidad de profesores')
    }
  }, [formData.day, formData.timeSlot])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  useEffect(() => {
    if (formData.day && formData.timeSlot) {
      loadAvailableTeachers()
    }
  }, [formData.day, formData.timeSlot, loadAvailableTeachers])

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const endHour = minute === 30 ? hour + 1 : hour
        const endMinute = minute === 30 ? 0 : 30
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
        slots.push(`${startTime}-${endTime}`)
      }
    }
    return slots
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const result = await createClass(formData)

      if (result.success) {
        toast.success('Clase programada exitosamente')
        setOpen(false)
        setFormData({
          studentId: '',
          teacherId: '',
          day: '',
          timeSlot: '',
          notes: '',
        })
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al programar la clase')
      }
    } catch {
      console.error('Error creating class')
      toast.error('Error al crear la clase')
    } finally {
      setIsLoading(false)
    }
  }

  const isTeacherAvailable = (teacherId: string) => {
    return availableTeachers.some(t => t.id === teacherId)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Programar Nueva Clase</DialogTitle>
          <DialogDescription>
            Completa la información para programar una nueva clase.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="studentId">Estudiante</Label>
              <Select
                value={formData.studentId}
                onValueChange={(value) => setFormData({ ...formData, studentId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} {student.lastName} - {student.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="day">Fecha</Label>
              <Input
                id="day"
                type="date"
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timeSlot">Horario</Label>
              <Select
                value={formData.timeSlot}
                onValueChange={(value) => setFormData({ ...formData, timeSlot: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un horario" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeSlots().map(slot => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="teacherId">Profesor</Label>
              <Select
                value={formData.teacherId}
                onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un profesor" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem 
                      key={teacher.id} 
                      value={teacher.id}
                      disabled={formData.day && formData.timeSlot ? !isTeacherAvailable(teacher.id) : false}
                    >
                      {teacher.name} {teacher.lastName}
                      {formData.day && formData.timeSlot && !isTeacherAvailable(teacher.id) && 
                        ' (No disponible)'
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.day && formData.timeSlot && availableTeachers.length === 0 && (
                <p className="text-sm text-red-600">
                  No hay profesores disponibles en este horario
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales sobre la clase..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Programando...' : 'Programar Clase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
