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
  weeklyAttendance: {
    percentage: number
    trend: number
  }
  totalHoursTaught: {
    hours: number
    trend: number
  }
  activeStudents: {
    count: number
    trend: number
  }
  unreadMessages: {
    count: number
  }
  activeCourses: {
    id: string
    title: string
    level: string
    progress: number
    studentCount: number
    image: string
  }[]
  needsAttention: {
    id: string
    studentName: string
    studentImage: string
    issue: string
    courseName: string
  }[]
  upcomingClasses: {
    id: string
    studentName: string
    studentImage: string | null
    course: string
    date: string
    time: string
    room?: string
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
