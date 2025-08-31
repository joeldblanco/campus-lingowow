import { Prisma } from '@prisma/client'

// Prisma-generated types for courses with relations
export type CourseWithDetails = Prisma.CourseGetPayload<{
  include: {
    createdBy: {
      select: {
        name: true
        email: true
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
      orderBy: {
        order: 'asc'
      }
    }
    enrollments: {
      select: {
        id: true
        status: true
        student: {
          select: {
            name: true
            email: true
          }
        }
      }
    }
    _count: {
      select: {
        modules: true
        enrollments: true
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
