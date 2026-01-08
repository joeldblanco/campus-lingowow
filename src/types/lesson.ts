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
  moduleId: string | null
}

// Definición recursiva para contenido anidado
// Usamos intersection con campos manuales para evitar problemas de sincronización con el cliente generado
export type ContentWithHierarchy = Prisma.ContentGetPayload<{
  include: {
    children: {
      include: {
        children: true
      }
    }
  }
}> & {
  parentId?: string | null
  data?: Record<string, unknown>
  children?: ContentWithHierarchy[]
}

export type LessonForView = Omit<
  Prisma.LessonGetPayload<{
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
        orderBy: {
          order: 'asc'
        }
        include: {
          children: {
            orderBy: {
              order: 'asc'
            }
            include: {
              children: true
            }
          }
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
  }>,
  'activities'
> & {
  videoUrl?: string | null
  summary?: string | null
  transcription?: string | null
  activities: (Prisma.LessonActivityGetPayload<{
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
  }> & { isCompleted: boolean })[]
}

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
