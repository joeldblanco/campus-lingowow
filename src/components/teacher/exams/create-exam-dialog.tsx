'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ClipboardList, Loader2 } from 'lucide-react'
import { createTeacherExam } from '@/lib/actions/teacher-exams'
import { toast } from 'sonner'

interface CreateExamDialogProps {
  courseId: string
  trigger?: React.ReactNode
}

export function CreateExamDialog({ courseId, trigger }: CreateExamDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('El título es requerido')
      return
    }

    setIsLoading(true)
    try {
      const result = await createTeacherExam(courseId, title.trim())

      if (result.success && result.exam) {
        toast.success('Examen creado exitosamente')
        setOpen(false)
        setTitle('')
        router.push(`/teacher/exams/${result.exam.id}/edit`)
      } else {
        toast.error(result.error || 'Error al crear el examen')
      }
    } catch {
      toast.error('Error al crear el examen')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <ClipboardList className="w-4 h-4 mr-2" />
            Crear Nuevo Examen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Examen</DialogTitle>
          <DialogDescription>
            Crea un examen para asignar a tus estudiantes. Podrás agregar preguntas y configurar
            opciones después.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título del Examen</Label>
            <Input
              id="title"
              placeholder="Ej: Examen de Vocabulario - Unidad 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleCreate()
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isLoading || !title.trim()}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Crear Examen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
