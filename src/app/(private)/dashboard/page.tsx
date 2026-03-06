'use client'

import AdminDashboard from '@/components/dashboard/admin-dashboard'
import GuestDashboard from '@/components/dashboard/guest-dashboard'
import StudentDashboard from '@/components/dashboard/student-dashboard'
import TeacherDashboard from '@/components/dashboard/teacher-dashboard'
import { getAdminDashboardStats, getTeacherDashboardStats } from '@/lib/actions/dashboard'
import type { AdminDashboardData, TeacherDashboardData } from '@/types/dashboard'
import { UserRole } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

const Dashboard = () => {
  const { data: session } = useSession()
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null)
  const [teacherData, setTeacherData] = useState<TeacherDashboardData | null>(null)

  // Cargar datos del dashboard según el rol
  useEffect(() => {
    const loadDashboardData = async () => {
      if (session?.user) {
        try {
          if (session.user.roles.includes(UserRole.ADMIN)) {
            const data = await getAdminDashboardStats()
            setAdminData(data)
          } else if (session.user.roles.includes(UserRole.TEACHER) && session.user.id) {
            const data = await getTeacherDashboardStats(session.user.id)
            setTeacherData(data)
          }
        } catch (error) {
          console.error('Error loading dashboard data:', error)
        }
      }
    }

    loadDashboardData()
  }, [session])

  const userRoles = session?.user?.roles

  // Renderizar el dashboard según el rol
  return (
    <div className="p-6">
      {userRoles?.includes(UserRole.ADMIN) && <AdminDashboard dashboardData={adminData} />}
      {userRoles?.includes(UserRole.TEACHER) && <TeacherDashboard dashboardData={teacherData} />}
      {userRoles?.includes(UserRole.STUDENT) && <StudentDashboard />}
      {userRoles?.includes(UserRole.GUEST) && <GuestDashboard />}
    </div>
  )
}

export default Dashboard
