import { getAllClasses } from '@/lib/actions/classes'
import { ClassesTable } from './classes-table'
import { CreateClassDialog } from './create-class-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export async function ClassesContainer() {
  const classes = await getAllClasses()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Clases</h1>
          <p className="text-muted-foreground">
            Administra todas las clases programadas, pasadas y futuras.
          </p>
        </div>
        <CreateClassDialog>
          <Button className="bg-primary hover:bg-primary/80 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Clase
          </Button>
        </CreateClassDialog>
      </div>

      <ClassesTable classes={classes} />
    </div>
  )
}
