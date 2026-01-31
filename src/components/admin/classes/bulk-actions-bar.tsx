'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle,
  XCircle,
  Calendar,
  Trash2,
  ChevronDown,
  DollarSign,
  UserCog,
  X,
  AlertTriangle,
} from 'lucide-react'
import { ClassBookingWithDetails, bulkUpdateClasses, bulkDeleteClasses, bulkRescheduleClasses } from '@/lib/actions/classes'
import { toast } from 'sonner'

type BulkAction = 
  | 'mark_completed'
  | 'mark_confirmed'
  | 'mark_cancelled'
  | 'mark_no_show'
  | 'make_payable'
  | 'make_non_payable'
  | 'change_teacher'
  | 'reschedule'
  | 'delete'

interface BulkActionsBarProps {
  selectedClasses: ClassBookingWithDetails[]
  onClearSelection: () => void
  onActionComplete: (
    updatedIds: string[], 
    action: BulkAction, 
    data?: { 
      teacherId?: string
      teacher?: { id: string; name: string; lastName: string | null; email: string; image: string | null }
      day?: string
      timeSlot?: string
    }
  ) => void
  availableTeachers: { id: string; name: string; lastName: string | null }[]
  userTimezone: string
}

export function BulkActionsBar({
  selectedClasses,
  onClearSelection,
  onActionComplete,
  availableTeachers,
  userTimezone,
}: BulkActionsBarProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [changeTeacherDialogOpen, setChangeTeacherDialogOpen] = useState(false)
  const [newDay, setNewDay] = useState('')
  const [newTimeSlot, setNewTimeSlot] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')

  const selectedCount = selectedClasses.length
  const selectedIds = selectedClasses.map(c => c.id)

  if (selectedCount === 0) return null

  const handleBulkAction = async (action: BulkAction) => {
    setIsLoading(true)
    try {
      let result: { success: boolean; error?: string; message?: string }

      switch (action) {
        case 'mark_completed':
          result = await bulkUpdateClasses(selectedIds, { status: 'COMPLETED' })
          break
        case 'mark_confirmed':
          result = await bulkUpdateClasses(selectedIds, { status: 'CONFIRMED' })
          break
        case 'mark_cancelled':
          result = await bulkUpdateClasses(selectedIds, { status: 'CANCELLED' })
          break
        case 'mark_no_show':
          result = await bulkUpdateClasses(selectedIds, { status: 'NO_SHOW' })
          break
        case 'make_payable':
          result = await bulkUpdateClasses(selectedIds, { isPayable: true })
          break
        case 'make_non_payable':
          result = await bulkUpdateClasses(selectedIds, { isPayable: false })
          break
        case 'delete':
          result = await bulkDeleteClasses(selectedIds)
          break
        default:
          result = { success: false, error: 'Acción no válida' }
      }

      if (result.success) {
        toast.success(result.message || 'Operación completada')
        onActionComplete(selectedIds, action)
        onClearSelection()
      } else {
        toast.error(result.error || 'Error al ejecutar la acción')
      }
    } catch {
      toast.error('Error al ejecutar la acción')
    } finally {
      setIsLoading(false)
      setConfirmAction(null)
    }
  }

  const handleReschedule = async () => {
    if (!newDay || !newTimeSlot) {
      toast.error('Debes seleccionar fecha y horario')
      return
    }

    setIsLoading(true)
    try {
      const result = await bulkRescheduleClasses(selectedIds, newDay, newTimeSlot, userTimezone)
      if (result.success) {
        toast.success(result.message || 'Clases reprogramadas')
        onActionComplete(selectedIds, 'reschedule', { day: newDay, timeSlot: newTimeSlot })
        onClearSelection()
        setRescheduleDialogOpen(false)
        setNewDay('')
        setNewTimeSlot('')
      } else {
        toast.error(result.error || 'Error al reprogramar')
      }
    } catch {
      toast.error('Error al reprogramar las clases')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeTeacher = async () => {
    if (!selectedTeacherId) {
      toast.error('Debes seleccionar un profesor')
      return
    }

    setIsLoading(true)
    try {
      const result = await bulkUpdateClasses(selectedIds, { teacherId: selectedTeacherId })
      if (result.success) {
        // Buscar el teacher completo de las clases existentes o usar availableTeachers con valores por defecto
        const existingTeacher = selectedClasses.find(c => c.teacherId === selectedTeacherId)?.teacher
        const basicTeacher = availableTeachers.find(t => t.id === selectedTeacherId)
        
        const selectedTeacher = existingTeacher || (basicTeacher ? {
          ...basicTeacher,
          email: '', // Valor por defecto - se actualizará en el próximo fetch
          image: null
        } : undefined)
        
        toast.success(result.message || 'Profesor actualizado')
        onActionComplete(selectedIds, 'change_teacher', { 
          teacherId: selectedTeacherId,
          teacher: selectedTeacher 
        })
        onClearSelection()
        setChangeTeacherDialogOpen(false)
        setSelectedTeacherId('')
      } else {
        toast.error(result.error || 'Error al cambiar profesor')
      }
    } catch {
      toast.error('Error al cambiar el profesor')
    } finally {
      setIsLoading(false)
    }
  }

  const getConfirmationMessage = (action: BulkAction) => {
    const messages: Record<BulkAction, string> = {
      mark_completed: `¿Marcar ${selectedCount} clase(s) como completada(s)?`,
      mark_confirmed: `¿Marcar ${selectedCount} clase(s) como confirmada(s)?`,
      mark_cancelled: `¿Cancelar ${selectedCount} clase(s)?`,
      mark_no_show: `¿Marcar ${selectedCount} clase(s) como no asistida(s)?`,
      make_payable: `¿Marcar ${selectedCount} clase(s) como pagable(s)?`,
      make_non_payable: `¿Marcar ${selectedCount} clase(s) como no pagable(s)?`,
      change_teacher: `¿Cambiar profesor de ${selectedCount} clase(s)?`,
      reschedule: `¿Reprogramar ${selectedCount} clase(s)?`,
      delete: `¿Eliminar ${selectedCount} clase(s)? Esta acción no se puede deshacer.`,
    }
    return messages[action]
  }

  const timeSlots = [
    '06:00-06:30', '06:30-07:00', '07:00-07:30', '07:30-08:00',
    '08:00-08:30', '08:30-09:00', '09:00-09:30', '09:30-10:00',
    '10:00-10:30', '10:30-11:00', '11:00-11:30', '11:30-12:00',
    '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00',
    '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00',
    '16:00-16:30', '16:30-17:00', '17:00-17:30', '17:30-18:00',
    '18:00-18:30', '18:30-19:00', '19:00-19:30', '19:30-20:00',
    '20:00-20:30', '20:30-21:00', '21:00-21:30', '21:30-22:00',
  ]

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">
            {selectedCount}
          </span>
          <span>clase(s) seleccionada(s)</span>
        </div>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              Cambiar Estado
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setConfirmAction('mark_completed')}>
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              Marcar como Completada
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirmAction('mark_confirmed')}>
              <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
              Marcar como Confirmada
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirmAction('mark_cancelled')}>
              <XCircle className="mr-2 h-4 w-4 text-red-500" />
              Marcar como Cancelada
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirmAction('mark_no_show')}>
              <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
              Marcar como No Asistió
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              Pago
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setConfirmAction('make_payable')}>
              <DollarSign className="mr-2 h-4 w-4 text-green-500" />
              Marcar como Pagable
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirmAction('make_non_payable')}>
              <DollarSign className="mr-2 h-4 w-4 text-gray-400" />
              Marcar como No Pagable
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => setChangeTeacherDialogOpen(true)}
        >
          <UserCog className="mr-2 h-4 w-4" />
          Cambiar Profesor
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => setRescheduleDialogOpen(true)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Reprogramar
        </Button>

        <Button
          variant="destructive"
          size="sm"
          disabled={isLoading}
          onClick={() => setConfirmAction('delete')}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Acción</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && getConfirmationMessage(confirmAction)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && handleBulkAction(confirmAction)}
              disabled={isLoading}
              className={confirmAction === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isLoading ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprogramar {selectedCount} Clase(s)</DialogTitle>
            <DialogDescription>
              Selecciona la nueva fecha y horario para las clases seleccionadas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newDay">Nueva Fecha</Label>
              <Input
                id="newDay"
                type="date"
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newTimeSlot">Nuevo Horario</Label>
              <Select value={newTimeSlot} onValueChange={setNewTimeSlot}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar horario" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleReschedule} disabled={isLoading || !newDay || !newTimeSlot}>
              {isLoading ? 'Reprogramando...' : 'Reprogramar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Teacher Dialog */}
      <Dialog open={changeTeacherDialogOpen} onOpenChange={setChangeTeacherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Profesor de {selectedCount} Clase(s)</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo profesor para las clases seleccionadas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="teacher">Nuevo Profesor</Label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar profesor" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name} {teacher.lastName || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeTeacherDialogOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleChangeTeacher} disabled={isLoading || !selectedTeacherId}>
              {isLoading ? 'Cambiando...' : 'Cambiar Profesor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
