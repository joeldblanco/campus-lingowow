'use client'

import { useState } from 'react'
import { updateEnrollment } from '@/lib/actions/enrollments'
import { EnrollmentWithDetails } from '@/lib/actions/enrollments'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'

const EditEnrollmentSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']),
  progress: z.number().min(0).max(100),
})

interface EditEnrollmentDialogProps {
  children: React.ReactNode
  enrollment: EnrollmentWithDetails
  onEnrollmentUpdated?: () => void
}

export function EditEnrollmentDialog({
  children,
  enrollment,
  onEnrollmentUpdated,
}: EditEnrollmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof EditEnrollmentSchema>>({
    resolver: zodResolver(EditEnrollmentSchema),
    defaultValues: {
      status: enrollment.status,
      progress: enrollment.progress,
    },
  })

  const onSubmit = async (values: z.infer<typeof EditEnrollmentSchema>) => {
    setIsLoading(true)
    try {
      const result = await updateEnrollment(enrollment.id, values)

      if (result.success) {
        toast.success('Inscripción actualizada exitosamente')
        setOpen(false)
        onEnrollmentUpdated?.()
      } else {
        toast.error(result.error || 'Error al actualizar la inscripción')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al actualizar la inscripción')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Inscripción</DialogTitle>
          <DialogDescription>
            Actualiza el estado y progreso de la inscripción de{' '}
            <span className="font-medium">
              {enrollment.student.name} {enrollment.student.lastName}
            </span>{' '}
            en <span className="font-medium">{enrollment.course.title}</span>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PENDING">Pre-inscripción</SelectItem>
                      <SelectItem value="ACTIVE">Activo</SelectItem>
                      <SelectItem value="COMPLETED">Completado</SelectItem>
                      <SelectItem value="PAUSED">Pausado</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="progress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progreso (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
