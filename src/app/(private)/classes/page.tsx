import { Suspense } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ClassesView } from '@/components/classes/classes-view'
import { Metadata } from 'next'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export const metadata: Metadata = {
  title: 'Mis Clases | Lingowow',
  description: 'Visualiza y gestiona tus clases programadas',
}

export default async function ClassesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Obtener las inscripciones activas del estudiante
  const enrollments = await db.enrollment.findMany({
    where: {
      studentId: session.user.id,
      status: 'ACTIVE',
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
      bookings: {
        where: {
          status: {
            in: ['CONFIRMED', 'COMPLETED'],
          },
        },
        orderBy: {
          day: 'desc',
        },
        take: 10,
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

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mis Clases</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tus clases, horarios y asistencia
        </p>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <ClassesView enrollments={enrollments} userId={session.user.id} />
      </Suspense>
    </div>
  )
}
