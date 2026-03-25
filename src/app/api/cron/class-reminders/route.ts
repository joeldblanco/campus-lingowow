import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendClassReminderEmail } from '@/lib/mail'
import { notifyClassReminder } from '@/lib/actions/notifications'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { combineDateAndTimeUTC, formatInTimeZone } = await import('@/lib/utils/date')

    // Calculate the target hour: exactly 1 hour from now, truncated to the start of the hour
    const now = new Date()
    const targetStart = new Date(now.getTime() + 60 * 60 * 1000)
    targetStart.setUTCMinutes(0, 0, 0)
    const targetEnd = new Date(targetStart.getTime() + 60 * 60 * 1000) // 1-hour window

    // The target class start could span two calendar days (e.g. cron at 23:00 UTC targets 00:00 UTC next day)
    const targetDayString = targetStart.toISOString().split('T')[0]
    const targetEndDayString = targetEnd.toISOString().split('T')[0]
    const targetDays = [targetDayString]
    if (targetEndDayString !== targetDayString) {
      targetDays.push(targetEndDayString)
    }

    const classesToRemind = await db.classBooking.findMany({
      where: {
        day: { in: targetDays },
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
            timezone: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            timezone: true,
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

        const [startTime] = classBooking.timeSlot.split('-')
        const utcDate = combineDateAndTimeUTC(classBooking.day, startTime)

        // Only send if class starts within the target 1-hour window
        if (utcDate < targetStart || utcDate >= targetEnd) continue

        const classLink = `${process.env.NEXT_PUBLIC_DOMAIN}/classroom?classId=${classBooking.id}`
        const studentTimeZone = classBooking.student.timezone || 'America/Lima'
        const teacherTimeZone = classBooking.teacher.timezone || 'America/Lima'

        await sendClassReminderEmail(classBooking.student.email, {
          studentName:
            `${classBooking.student.name || ''} ${classBooking.student.lastName || ''}`.trim() ||
            'Estudiante',
          courseName: classBooking.enrollment.course.title,
          teacherName:
            `${classBooking.teacher.name || ''} ${classBooking.teacher.lastName || ''}`.trim() ||
            'Profesor',
          classDate: formatInTimeZone(utcDate, "EEEE d 'de' MMMM", studentTimeZone),
          classTime: formatInTimeZone(utcDate, 'HH:mm', studentTimeZone),
          classLink,
        })

        // Send platform notifications to both student and teacher
        // Each receives the time in their own timezone
        await notifyClassReminder({
          studentId: classBooking.student.id,
          teacherId: classBooking.teacher.id,
          courseName: classBooking.enrollment.course.title,
          studentClassTime: formatInTimeZone(utcDate, 'HH:mm', studentTimeZone),
          teacherClassTime: formatInTimeZone(utcDate, 'HH:mm', teacherTimeZone),
          bookingId: classBooking.id,
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
    return NextResponse.json({ error: 'Error processing class reminders' }, { status: 500 })
  }
}
