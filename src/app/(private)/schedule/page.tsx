import { auth } from '@/auth'
import { TeacherSchedule } from '@/components/teacher-schedule/teacher-schedule'
import { StudentSchedule } from '@/components/student-schedule/student-schedule'
import { UserRole } from '@prisma/client'

import { getPeriodByDate } from '@/lib/actions/academic-period'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function SchedulePage() {
  const session = await auth()
  const userRoles = session?.user?.roles || []

  // Show teacher schedule for teachers and admins
  const isTeacher = userRoles.includes(UserRole.TEACHER) || userRoles.includes(UserRole.ADMIN)

  if (isTeacher) {
    // Fetch current period
    const periodResult = await getPeriodByDate(new Date())
    let currentPeriod = null

    if (periodResult.success && periodResult.period) {
      const startDate = format(periodResult.period.startDate, "d 'de' MMMM", { locale: es })
      const endDate = format(periodResult.period.endDate, "d 'de' MMMM", { locale: es })

      currentPeriod = {
        id: periodResult.period.id,
        name: periodResult.period.name,
        dates: `${startDate} - ${endDate}`,
      }
    }

    return <TeacherSchedule currentPeriod={currentPeriod} />
  }

  // Default to student schedule
  return <StudentSchedule />
}
