import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendClassReminderEmail } from '@/lib/mail'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const todayString = format(today, 'yyyy-MM-dd')

    const classesToRemind = await db.classBooking.findMany({
      where: {
        day: todayString,
        status: 'CONFIRMED',
        reminderSent: false,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },
        enrollment: {
          include: {
            course: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    })

    let sentCount = 0
    const errors: string[] = []

    for (const classBooking of classesToRemind) {
      try {
        if (!classBooking.student.email) continue

        const classLink = `${process.env.NEXT_PUBLIC_DOMAIN}/classroom?classId=${classBooking.id}`
        const [startTime] = classBooking.timeSlot.split('-')

        await sendClassReminderEmail(classBooking.student.email, {
          studentName: `${classBooking.student.name || ''} ${classBooking.student.lastName || ''}`.trim() || 'Estudiante',
          courseName: classBooking.enrollment.course.title,
          teacherName: `${classBooking.teacher.name || ''} ${classBooking.teacher.lastName || ''}`.trim() || 'Profesor',
          classDate: format(new Date(classBooking.day), "EEEE d 'de' MMMM", { locale: es }),
          classTime: startTime,
          classLink,
        })

        await db.classBooking.update({
          where: { id: classBooking.id },
          data: { reminderSent: true },
        })

        sentCount++
      } catch (error) {
        console.error(`Error sending reminder for class ${classBooking.id}:`, error)
        errors.push(classBooking.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} reminders`,
      totalClasses: classesToRemind.length,
      sentCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in class reminders cron:', error)
    return NextResponse.json(
      { error: 'Error processing class reminders' },
      { status: 500 }
    )
  }
}
