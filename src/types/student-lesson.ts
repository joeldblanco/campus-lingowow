import { Prisma } from '@prisma/client'

// =============================================
// TIPOS PARA LECCIONES PERSONALIZADAS
// (Ahora unificadas en el modelo Lesson con studentId != null)
// =============================================

// Tipo base para lección personalizada con relaciones completas
export type StudentLessonWithDetails = Prisma.LessonGetPayload<{
  include: {
    student: {
      select: {
        id: true
        name: true
        lastName: true
        email: true
        image: true
      }
    }
    teacher: {
      select: {
        id: true
        name: true
        lastName: true
        email: true
        image: true
      }
    }
    enrollment: {
      select: {
        id: true
        courseId: true
        academicPeriodId: true
        status: true
        course: {
          select: {
            id: true
            title: true
            language: true
            level: true
          }
        }
        academicPeriod: {
          select: {
            id: true
            name: true
          }
        }
      }
    }
    contents: {
      orderBy: {
        order: 'asc'
      }
    }
    progress: true
  }
}>

// Tipo para listar lecciones de un estudiante
export type StudentLessonListItem = Prisma.LessonGetPayload<{
  select: {
    id: true
    title: true
    description: true
    order: true
    duration: true
    isPublished: true
    videoUrl: true
    summary: true
    createdAt: true
    updatedAt: true
    progress: {
      select: {
        completed: true
        percentage: true
        lastAccessed: true
      }
    }
  }
}>

// Tipo para vista de lección personalizada (similar a LessonForView)
export type StudentLessonForView = Prisma.LessonGetPayload<{
  include: {
    student: {
      select: {
        id: true
        name: true
        lastName: true
      }
    }
    teacher: {
      select: {
        id: true
        name: true
        lastName: true
      }
    }
    enrollment: {
      select: {
        id: true
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
    progress: true
  }
}> & {
  videoUrl?: string | null
  summary?: string | null
  transcription?: string | null
}

// Tipo para crear una lección personalizada
export interface CreateStudentLessonInput {
  title: string
  description?: string
  order?: number
  duration?: number
  videoUrl?: string
  summary?: string
  transcription?: string
  studentId: string
  teacherId: string
  enrollmentId: string
  isPublished?: boolean
}

// Tipo para actualizar una lección personalizada
export interface UpdateStudentLessonInput {
  id: string
  title?: string
  description?: string
  order?: number
  duration?: number
  videoUrl?: string
  summary?: string
  transcription?: string
  isPublished?: boolean
}

// Tipo para el contenido de una lección personalizada (ahora usa Content)
export type StudentLessonContentWithHierarchy = Prisma.ContentGetPayload<{
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
  children?: StudentLessonContentWithHierarchy[]
}

// Tipo para estadísticas de lecciones personalizadas
export interface StudentLessonStats {
  totalLessons: number
  publishedLessons: number
  completedLessons: number
  averageProgress: number
}

// Tipo para el progreso de una lección (ahora usa LessonProgress)
export type StudentLessonProgressData = Prisma.LessonProgressGetPayload<{
  select: {
    id: true
    completed: true
    percentage: true
    lastAccessed: true
    completedAt: true
  }
}>

// Tipo para estudiantes con sus lecciones (vista del profesor)
export interface StudentWithLessons {
  student: {
    id: string
    name: string
    lastName: string | null
    email: string
    image: string | null
  }
  enrollment: {
    id: string
    status: string
    courseId: string
    courseName: string
    academicPeriodId: string
    academicPeriodName: string
  }
  lessons: StudentLessonListItem[]
  stats: StudentLessonStats
}

// Tipo para la respuesta de acciones
export interface StudentLessonActionResult<T = unknown> {
  success: boolean
  error?: string
  data?: T
}
