export interface AdminDashboardData {
  totalStudents: number
  totalClasses: number
  totalRevenue: number
  activeTeachers: number
  activeCourses: number
  recentEnrollments: {
    studentId?: string
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
    studentName: string
    studentId?: string
    studentImage: string | null
    teacherId?: string
    teacherName: string
    startTime: string
    teacherImage: string | null
    platform: string
  }[]
  languageStats: {
    name: string
    classes: number
  }[]
  currentPeriod: {
    id: string
    name: string
    dates: string
  } | null
}

export interface TeacherDashboardData {
  weeklyAttendance: {
    percentage: number
    trend: number
  }
  periodEarnings: {
    amount: number
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
    studentId?: string
    studentName: string
    studentImage: string
    issue: string
    courseName: string
  }[]
  upcomingClasses: {
    id: string
    studentId?: string
    studentName: string
    studentImage: string | null
    courseId: string
    course: string
    date: string
    time: string
    endTime: string
    room?: string
  }[]
  currentPeriod: {
    id: string
    name: string
    dates: string
  } | null
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

export interface GuestDashboardData {
  stats: {
    languagesAvailable: number
    certifiedTeachers: number
    freeTrialAvailable: boolean
  }
  popularCourses: {
    id: string
    language: string
    title: string
    level: string
    studentCount: number
    rating: number
    image: string | null
  }[]
  upcomingWebinars: {
    id: string
    title: string
    date: string
    time: string
    language: string
  }[]
  freeResources: {
    id: string
    title: string
    type: string
    language: string
    url: string
  }[]
}
