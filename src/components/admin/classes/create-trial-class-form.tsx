'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createTrialClass, getTrialStudentCandidates, getAllTeachers } from '@/lib/actions/classes'
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
import { DialogFooter } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { CreateTrialClassSchema } from '@/schemas/classes'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { useTimezone } from '@/hooks/use-timezone'
import { Check, ChevronsUpDown } from 'lucide-react'
import { formatUserName } from '@/lib/utils/name-formatter'
import { cn } from '@/lib/utils'

const TRIAL_CLASS_DURATION_MINUTES = 30

interface TrialStudentCandidate {
  id: string
  name: string
  lastName: string | null
  email: string
}

interface TeacherOption {
  id: string
  name: string
  lastName: string | null
  email: string
}

interface CreateTrialClassFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function CreateTrialClassForm({ onSuccess, onCancel }: CreateTrialClassFormProps) {
  const router = useRouter()
  const { timezone: userTimezone } = useTimezone()
  const [isLoading, setIsLoading] = useState(false)
  const [students, setStudents] = useState<TrialStudentCandidate[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [studentPopoverOpen, setStudentPopoverOpen] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')

  const form = useForm<z.infer<typeof CreateTrialClassSchema>>({
    resolver: zodResolver(CreateTrialClassSchema),
    defaultValues: {
      studentId: '',
      teacherId: '',
      datetime: '',
      notes: '',
    },
  })

  useEffect(() => {
    let active = true
    const loadData = async () => {
      try {
        const [studentData, teacherData] = await Promise.all([
          getTrialStudentCandidates(),
          getAllTeachers(),
        ])
        if (!active) return
        setStudents(studentData)
        setTeachers(teacherData)
      } catch {
        if (active) toast.error('Error al cargar estudiantes o profesores')
      }
    }
    loadData()
    return () => {
      active = false
    }
  }, [])

  const watchedStudentId = form.watch('studentId')
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === watchedStudentId) || null,
    [students, watchedStudentId]
  )

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students
    const query = studentSearch.toLowerCase()
    return students.filter((student) => {
      const name = formatUserName(student).toLowerCase()
      return name.includes(query) || student.email.toLowerCase().includes(query)
    })
  }, [students, studentSearch])

  const onSubmit = async (values: z.infer<typeof CreateTrialClassSchema>) => {
    setIsLoading(true)
    try {
      const result = await createTrialClass({ ...values, timezone: userTimezone })
      if (result.success) {
        toast.success('Clase de prueba agendada exitosamente')
        form.reset()
        router.refresh()
        onSuccess()
      } else {
        toast.error(result.error || 'Error al agendar la clase de prueba')
      }
    } catch {
      toast.error('Error al agendar la clase de prueba')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="studentId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Estudiante</FormLabel>
                <Popover open={studentPopoverOpen} onOpenChange={setStudentPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={studentPopoverOpen}
                        className={cn(
                          'w-full justify-between font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {selectedStudent ? (
                          <span className="truncate">
                            {formatUserName(selectedStudent)} ({selectedStudent.email})
                          </span>
                        ) : (
                          'Buscar estudiante...'
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar por nombre o correo..."
                        value={studentSearch}
                        onValueChange={setStudentSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                        <CommandGroup>
                          {filteredStudents.map((student) => (
                            <CommandItem
                              key={student.id}
                              value={student.id}
                              onSelect={() => {
                                form.setValue('studentId', student.id)
                                setStudentPopoverOpen(false)
                                setStudentSearch('')
                              }}
                              className="flex items-center gap-2 py-2"
                            >
                              <Check
                                className={cn(
                                  'h-4 w-4',
                                  field.value === student.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{formatUserName(student)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {student.email}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="teacherId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profesor</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un profesor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teachers.length === 0 ? (
                      <SelectItem value="no-teachers" disabled>
                        No hay profesores disponibles
                      </SelectItem>
                    ) : (
                      teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {formatUserName(teacher)}
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
            name="datetime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha y Hora</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Duración de la clase de prueba: {TRIAL_CLASS_DURATION_MINUTES} minutos
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas (opcional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Notas adicionales sobre la clase de prueba..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Agendando...' : 'Agendar Clase de Prueba'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
