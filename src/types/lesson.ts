import { Prisma } from '@prisma/client'

// Prisma-generated types for lessons with relations
export type LessonWithDetails = Prisma.LessonGetPayload<{
  include: {
    module: {
      select: {
        id: true
        title: true
        course: {
          select: {
            id: true
            title: true
          }
        }
      }
    }
    contents: {
      select: {
        id: true
      }
    }
    activities: true
    _count: {
      select: {
        contents: true
        activities: true
      }
    }
  }
}> & {
  contentsCount: number
  activitiesCount: number
}

export interface LessonStats {
  total: number
  totalContents: number
  totalActivities: number
}

export type LessonForEdit = {
  id: string
  title: string
  description: string
  order: number
  moduleId: string
}

export type LessonForView = Prisma.LessonGetPayload<{
  include: {
    module: {
      select: {
        id: true
        title: true
        course: {
          select: {
            id: true
            title: true
          }
        }
      }
    }
    contents: {
      select: {
        id: true
        title: true
        contentType: true
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

export type ModuleForLessons = Prisma.ModuleGetPayload<{
  select: {
    id: true
    title: true
    course: {
      select: {
        id: true
        title: true
      }
    }
  }
}>
