export interface AdminDashboardData {
  totalStudents: number
  totalClasses: number
  totalRevenue: number
  activeTeachers: number
  activeCourses: number
  recentEnrollments: {
    studentName: string
    courseName: string
    date: string
    amount: string
    status: string
    studentImage: string | null
  }[]
  enrollmentStats: {
    name: string
    students: number
  }[]
  upcomingClasses: {
    id: string
    title: string
    teacherName: string
    startTime: string
    teacherImage: string | null
    platform: string
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
    id: string
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
    id: string
    courseId: string
    title: string
    image: string | null
    progress: number
  }[]
}
