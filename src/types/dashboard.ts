export interface AdminDashboardData {
  totalStudents: number
  totalClasses: number
  totalRevenue: number
  recentEnrollments: {
    studentName: string
    courseName: string
    date: string
    amount: string
  }[]
  languageStats: {
    name: string
    classes: number
  }[]
}

export interface TeacherDashboardData {
  totalStudents: number
  classesThisMonth: number
  monthlyRevenue: number
  upcomingClasses: {
    studentName: string
    course: string
    date: string
    time: string
  }[]
  revenueData: {
    name: string
    income: number
  }[]
}

export interface StudentDashboardData {
  activeCourses: number
  attendanceRate: number
  currentLevel: number
  totalPoints: number
  currentStreak: number
  longestStreak: number
  upcomingClasses: {
    course: string
    teacher: string
    date: string
    time: string
    link: string
  }[]
  enrollments: {
    title: string
    progress: number
  }[]
}
