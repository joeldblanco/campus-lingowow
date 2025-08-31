import { Prisma } from '@prisma/client'

// Prisma-generated types for modules with relations
export type ModuleWithDetails = Prisma.ModuleGetPayload<{
  include: {
    course: {
      select: {
        id: true
        title: true
      }
    }
    lessons: {
      select: {
        id: true
      }
    }
    activities: true
    _count: {
      select: {
        lessons: true
        activities: true
      }
    }
  }
}> & {
  lessonsCount: number
  activitiesCount: number
}

export interface ModuleStats {
  total: number
  published: number
  draft: number
  totalLessons: number
  totalActivities: number
}

export type ModuleForEdit = {
  id: string
  title: string
  description: string | null
  level: number
  order: number
  isPublished: boolean
  courseId: string
}

export type ModuleEditPayload = Prisma.ModuleGetPayload<{
  include: {
    course: {
      select: {
        id: true
        title: true
      }
    }
  }
}>

export type ModuleViewPayload = Prisma.ModuleGetPayload<{
  include: {
    course: {
      select: {
        id: true
        title: true
      }
    }
    lessons: {
      select: {
        id: true
        title: true
        order: true
      }
      orderBy: {
        order: 'asc'
      }
    }
    activities: {
      include: {
        activity: {
          select: {
            id: true
            title: true
            activityType: true
            points: true
          }
        }
      }
      orderBy: {
        order: 'asc'
      }
    }
  }
}>

export type CourseForModules = Prisma.CourseGetPayload<{
  select: {
    id: true
    title: true
  }
}>
