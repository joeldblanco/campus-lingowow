import { Suspense } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ScheduleSetup } from '@/components/enrollments/schedule-setup'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EnrollmentSchedulePage({ params }: PageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { id } = await params

  // Obtener la inscripción
  const enrollment = await db.enrollment.findUnique({
    where: {
      id,
      studentId: session.user.id, // Asegurar que pertenece al estudiante
    },
    include: {
      course: true,
      academicPeriod: {
        include: {
          season: true,
        },
      },
      schedules: {
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              lastName: true,
              image: true,
            },
          },
        },
      },
    },
  })

  if (!enrollment) {
    redirect('/classes')
  }

  // Verificar si ya tiene horarios configurados
  const hasSchedules = enrollment.schedules.length > 0

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configurar Horario de Clases</h1>
        <p className="text-muted-foreground mt-2">
          {enrollment.course.title} - {enrollment.academicPeriod.season.name}{' '}
          {enrollment.academicPeriod.season.year}
        </p>
      </div>

      <Suspense fallback={<div>Cargando...</div>}>
        <ScheduleSetup
          enrollment={enrollment}
          hasExistingSchedules={hasSchedules}
        />
      </Suspense>
    </div>
  )
}
