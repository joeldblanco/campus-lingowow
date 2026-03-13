import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { EnrollmentStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()

    // 1. Process Academic Periods that have ended
    // Sincronizar estados (el método `syncAcademicPeriodStatuses` ya hace esto)
    const { syncAcademicPeriodStatuses } = await import('@/lib/actions/academic-period')
    await syncAcademicPeriodStatuses()

    console.log('[Cron] Academic Periods synced.')

    // 2. Process Enrollments associated with ended periods
    // Buscamos todas las inscripciones que estén Activas o Pendientes
    // de períodos que ya han terminado (endDate < today)
    const enrollmentsToComplete = await db.enrollment.findMany({
      where: {
        status: {
          in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING],
        },
        academicPeriod: {
          endDate: {
            lt: today,
          },
        },
      },
      select: {
        id: true,
      },
    })

    const enrollmentIds = enrollmentsToComplete.map((e) => e.id)

    if (enrollmentIds.length > 0) {
      // Actualizamos masivamente a 'COMPLETED'
      const updateResult = await db.enrollment.updateMany({
        where: {
          id: {
            in: enrollmentIds,
          },
        },
        data: {
          status: EnrollmentStatus.COMPLETED,
        },
      })

      console.log(`[Cron] Marked ${updateResult.count} enrollments as COMPLETED.`)
    }

    return NextResponse.json({
      success: true,
      message: 'Period processing completed successfully',
      enrollmentsUpdated: enrollmentIds.length,
    })
  } catch (error) {
    console.error('Error in process periods cron:', error)
    return NextResponse.json({ error: 'Error processing academic periods' }, { status: 500 })
  }
}
