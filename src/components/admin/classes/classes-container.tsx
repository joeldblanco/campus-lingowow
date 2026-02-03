import { getAllClasses } from '@/lib/actions/classes'
import { getPeriods } from '@/lib/actions/academic-period'
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
  const currentYear = new Date().getFullYear()
  const today = new Date()
  
  // 1. Períodos del año actual que ya hayan iniciado
  const currentYearResult = await getPeriods(currentYear)
  const currentYearPeriods = currentYearResult.success ? currentYearResult.periods || [] : []
  
  const startedPeriods = currentYearPeriods.filter(period => 
    new Date(period.startDate) <= today
  )
  
  // 2. Último período del año anterior
  const previousYearResult = await getPeriods(currentYear - 1)
  const previousYearPeriods = previousYearResult.success ? previousYearResult.periods || [] : []
  
  const lastPreviousPeriod = previousYearPeriods
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
  
  // Combinar y ordenar
  const allPeriods = [...startedPeriods]
  if (lastPreviousPeriod) {
    allPeriods.push({
      ...lastPreviousPeriod,
      name: `${lastPreviousPeriod.name} ${currentYear - 1}`
    })
  }
  
  const rawPeriods = allPeriods.sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )
  
  // Buscar período activo
  const activePeriod = rawPeriods.find((p) => {
    const start = new Date(p.startDate)
    const end = new Date(p.endDate)
    return today >= start && today <= end
  })
  
  // Agregar propiedad isActive a cada período para el UI
  const periods = rawPeriods.map((p) => ({
    id: p.id,
    name: p.name,
    startDate: p.startDate,
    endDate: p.endDate,
    isActive: p.id === activePeriod?.id,
  }))
  
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
