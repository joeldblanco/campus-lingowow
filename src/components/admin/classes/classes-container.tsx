import { getAllClasses } from '@/lib/actions/classes'
import { ClassesTable } from './classes-table'
import { CreateClassDialog } from './create-class-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function ClassesContainer() {
  // Obtener timezone del usuario autenticado para mostrar horarios correctamente
  const session = await auth()
  let userTimezone = 'America/Lima'
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true },
    })
    userTimezone = user?.timezone || 'America/Lima'
  }
  
  // Obtener períodos recientes (año actual + último del año anterior)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const periodsResponse = await fetch(`${baseUrl}/api/academic-periods/earnings`, {
    cache: 'no-store',
  })
  const periodsData = await periodsResponse.json()
  const periods = periodsData.success ? periodsData.periods : []
  
  // Buscar período activo
  const today = new Date()
  const activePeriod = periods.find((p: { startDate: string; endDate: string }) => {
    const start = new Date(p.startDate)
    const end = new Date(p.endDate)
    return today >= start && today <= end
  })
  
  const classes = await getAllClasses({ 
    timezone: userTimezone
  })

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

      <ClassesTable 
        classes={classes} 
        userTimezone={userTimezone} 
        periods={periods}
        defaultPeriodId={activePeriod?.id}
      />
    </div>
  )
}
