import { auth } from '@/auth'
import { TeacherSchedule } from '@/components/teacher-schedule/teacher-schedule'
import { StudentSchedule } from '@/components/student-schedule/student-schedule'
import { UserRole } from '@prisma/client'

export default async function SchedulePage() {
  const session = await auth()
  const userRoles = session?.user?.roles || []
  
  // Show teacher schedule for teachers and admins
  const isTeacher = userRoles.includes(UserRole.TEACHER) || userRoles.includes(UserRole.ADMIN)
  
  if (isTeacher) {
    return <TeacherSchedule />
  }
  
  // Default to student schedule
  return <StudentSchedule />
}
