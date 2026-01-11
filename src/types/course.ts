import { Prisma } from '@prisma/client'

// Prisma-generated types for courses with relations
export type CourseWithDetails = Prisma.CourseGetPayload<{
  select: {
    id: true
    title: true
    description: true
    language: true
    level: true
    isPublished: true
    classDuration: true
    image: true
    defaultPaymentPerClass: true
    isPersonalized: true
    isSynchronous: true
    createdById: true
    createdAt: true
    updatedAt: true
    createdBy: {
      select: {
        id: true
        name: true
        email: true
        image: true
      }
    }
    modules: {
      select: {
        id: true
        title: true
        description: true
        level: true
        order: true
        isPublished: true
        _count: {
          select: {
            lessons: true
          }
        }
      }
    }
    enrollments: {
      select: {
        id: true
        status: true
        enrollmentDate: true
        progress: true
        student: {
          select: {
            id: true
            name: true
            email: true
            image: true
          }
        }
      }
    }
    teacherCourses: {
      select: {
        teacherId: true
        paymentPerClass: true
        createdAt: true
        teacher: {
          select: {
            id: true
            name: true
            email: true
            image: true
          }
        }
      }
    }
    exams: {
      select: {
        id: true
        title: true
        description: true
        timeLimit: true
        passingScore: true
        maxAttempts: true
        isPublished: true
        createdAt: true
        _count: {
          select: {
            sections: true
            attempts: true
          }
        }
      }
    }
    _count: {
      select: {
        modules: true
        enrollments: true
        teacherCourses: true
        exams: true
      }
    }
  }
}>

export interface CourseStats {
  totalCourses: number
  publishedCourses: number
  unpublishedCourses: number
  totalEnrollments: number
  totalModules: number
}

export interface CreateCourseData {
  title: string
  description: string
  language: string
  level: string
  createdById: string
}

export interface UpdateCourseData {
  title?: string
  description?: string
  language?: string
  level?: string
  isPublished?: boolean
}
