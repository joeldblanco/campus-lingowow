import { getAllClasses, getClassStats } from '@/lib/actions/classes'
import { ClassesTable } from './classes-table'
import { ClassesStats } from './classes-stats'
import { CreateClassDialog } from './create-class-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export async function ClassesContainer() {
  const [classes, stats] = await Promise.all([
    getAllClasses(),
    getClassStats(),
  ])

  return (
    <div className="space-y-6">
      <ClassesStats stats={stats} />
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Lista de Clases</h2>
        <CreateClassDialog>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Programar Clase
          </Button>
        </CreateClassDialog>
      </div>

      <ClassesTable classes={classes} />
    </div>
  )
}
