'use server'

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type {
  CreateStudentLessonInput,
  UpdateStudentLessonInput,
  StudentLessonActionResult,
  StudentLessonWithDetails,
  StudentLessonListItem,
  StudentLessonForView,
  StudentWithLessons,
  StudentLessonStats,
} from '@/types/student-lesson'

// =============================================
// ACCIONES PARA LECCIONES PERSONALIZADAS
// (Programas sincrónicos con contenido individual por estudiante)
// =============================================

// Obtener todas las lecciones personalizadas de un estudiante para una inscripción específica
export async function getStudentLessonsForEnrollment(
  enrollmentId: string
): Promise<StudentLessonActionResult<StudentLessonListItem[]>> {
  try {
    const lessons = await db.studentLesson.findMany({
      where: { enrollmentId, isPublished: true },
      select: {
        id: true,
        title: true,
        description: true,
        order: true,
        duration: true,
        isPublished: true,
        videoUrl: true,
        summary: true,
        createdAt: true,
        updatedAt: true,
        progress: {
          select: {
            completed: true,
            percentage: true,
            lastAccessed: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    })

    return { success: true, data: lessons }
  } catch (error) {
    console.error('Error fetching student lessons:', error)
    return { success: false, error: 'Error al obtener las lecciones del estudiante' }
  }
}

// Obtener una lección personalizada por ID (para vista del estudiante)
export async function getStudentLessonForView(
  lessonId: string,
  studentId: string
): Promise<StudentLessonActionResult<StudentLessonForView>> {
  try {
    const lesson = await db.studentLesson.findFirst({
      where: {
        id: lessonId,
        studentId: studentId, // Asegurar que el estudiante solo vea sus propias lecciones
        isPublished: true,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        contents: {
          where: { parentId: null },
          orderBy: { order: 'asc' },
          include: {
            children: {
              orderBy: { order: 'asc' },
              include: {
                children: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        progress: true,
      },
    })

    if (!lesson) {
      return { success: false, error: 'Lección no encontrada' }
    }

    // Actualizar último acceso
    await db.studentLessonProgress.upsert({
      where: { studentLessonId: lessonId },
      update: { lastAccessed: new Date() },
      create: {
        studentLessonId: lessonId,
        studentId: studentId,
        lastAccessed: new Date(),
      },
    })

    return { success: true, data: lesson as StudentLessonForView }
  } catch (error) {
    console.error('Error fetching student lesson:', error)
    return { success: false, error: 'Error al obtener la lección' }
  }
}

// Obtener una lección personalizada por ID (para edición del profesor)
export async function getStudentLessonForEdit(
  lessonId: string,
  teacherId: string
): Promise<StudentLessonActionResult<StudentLessonWithDetails>> {
  try {
    const lesson = await db.studentLesson.findFirst({
      where: {
        id: lessonId,
        teacherId: teacherId, // Solo el profesor que la creó puede editarla
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            courseId: true,
            academicPeriodId: true,
            status: true,
            course: {
              select: {
                id: true,
                title: true,
                language: true,
                level: true,
              },
            },
            academicPeriod: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        contents: {
          orderBy: { order: 'asc' },
        },
        progress: true,
      },
    })

    if (!lesson) {
      return { success: false, error: 'Lección no encontrada o no tienes permiso para editarla' }
    }

    return { success: true, data: lesson as StudentLessonWithDetails }
  } catch (error) {
    console.error('Error fetching student lesson for edit:', error)
    return { success: false, error: 'Error al obtener la lección' }
  }
}

// Crear una nueva lección personalizada
export async function createStudentLesson(
  data: CreateStudentLessonInput
): Promise<StudentLessonActionResult<{ id: string }>> {
  try {
    // Verificar que la inscripción existe y pertenece al estudiante
    const enrollment = await db.enrollment.findFirst({
      where: {
        id: data.enrollmentId,
        studentId: data.studentId,
      },
      include: {
        course: {
          select: {
            isPersonalized: true,
          },
        },
      },
    })

    if (!enrollment) {
      return { success: false, error: 'Inscripción no encontrada' }
    }

    // Verificar que el curso permite contenido personalizado
    if (!enrollment.course.isPersonalized) {
      return {
        success: false,
        error: 'Este curso no permite lecciones personalizadas',
      }
    }

    // Obtener el orden máximo actual
    const maxOrder = await db.studentLesson.aggregate({
      where: { enrollmentId: data.enrollmentId },
      _max: { order: true },
    })

    const lesson = await db.studentLesson.create({
      data: {
        title: data.title,
        description: data.description || '',
        order: data.order ?? (maxOrder._max.order ?? 0) + 1,
        duration: data.duration ?? 30,
        content: data.content ?? '[]',
        videoUrl: data.videoUrl,
        summary: data.summary,
        transcription: data.transcription,
        isPublished: data.isPublished ?? false,
        studentId: data.studentId,
        teacherId: data.teacherId,
        enrollmentId: data.enrollmentId,
      },
    })

    revalidatePath(`/teacher/students/${data.studentId}`)
    revalidatePath(`/my-courses`)

    return { success: true, data: { id: lesson.id } }
  } catch (error) {
    console.error('Error creating student lesson:', error)
    return { success: false, error: 'Error al crear la lección' }
  }
}

// Actualizar una lección personalizada
export async function updateStudentLesson(
  data: UpdateStudentLessonInput
): Promise<StudentLessonActionResult<{ id: string }>> {
  try {
    const lesson = await db.studentLesson.update({
      where: { id: data.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.transcription !== undefined && { transcription: data.transcription }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
      select: {
        id: true,
        studentId: true,
        enrollmentId: true,
      },
    })

    revalidatePath(`/teacher/students/${lesson.studentId}`)
    revalidatePath(`/my-courses`)

    return { success: true, data: { id: lesson.id } }
  } catch (error) {
    console.error('Error updating student lesson:', error)
    return { success: false, error: 'Error al actualizar la lección' }
  }
}

// Eliminar una lección personalizada
export async function deleteStudentLesson(
  lessonId: string,
  teacherId: string
): Promise<StudentLessonActionResult> {
  try {
    // Verificar que el profesor es el creador
    const lesson = await db.studentLesson.findFirst({
      where: {
        id: lessonId,
        teacherId: teacherId,
      },
      select: {
        id: true,
        studentId: true,
      },
    })

    if (!lesson) {
      return { success: false, error: 'Lección no encontrada o no tienes permiso para eliminarla' }
    }

    await db.studentLesson.delete({
      where: { id: lessonId },
    })

    revalidatePath(`/teacher/students/${lesson.studentId}`)
    revalidatePath(`/my-courses`)

    return { success: true }
  } catch (error) {
    console.error('Error deleting student lesson:', error)
    return { success: false, error: 'Error al eliminar la lección' }
  }
}

// Publicar/Despublicar una lección
export async function toggleStudentLessonPublished(
  lessonId: string,
  teacherId: string
): Promise<StudentLessonActionResult<{ isPublished: boolean }>> {
  try {
    const lesson = await db.studentLesson.findFirst({
      where: {
        id: lessonId,
        teacherId: teacherId,
      },
      select: {
        id: true,
        isPublished: true,
        studentId: true,
      },
    })

    if (!lesson) {
      return { success: false, error: 'Lección no encontrada' }
    }

    const updated = await db.studentLesson.update({
      where: { id: lessonId },
      data: { isPublished: !lesson.isPublished },
      select: { isPublished: true },
    })

    revalidatePath(`/teacher/students/${lesson.studentId}`)
    revalidatePath(`/my-courses`)

    return { success: true, data: { isPublished: updated.isPublished } }
  } catch (error) {
    console.error('Error toggling lesson published:', error)
    return { success: false, error: 'Error al cambiar el estado de publicación' }
  }
}

// Reordenar lecciones
export async function reorderStudentLessons(
  enrollmentId: string,
  lessonIds: string[]
): Promise<StudentLessonActionResult> {
  try {
    await db.$transaction(
      lessonIds.map((id, index) =>
        db.studentLesson.update({
          where: { id },
          data: { order: index + 1 },
        })
      )
    )

    revalidatePath(`/teacher/students`)
    revalidatePath(`/my-courses`)

    return { success: true }
  } catch (error) {
    console.error('Error reordering lessons:', error)
    return { success: false, error: 'Error al reordenar las lecciones' }
  }
}

// Actualizar progreso de una lección
export async function updateStudentLessonProgress(
  lessonId: string,
  studentId: string,
  percentage: number,
  completed?: boolean
): Promise<StudentLessonActionResult> {
  try {
    await db.studentLessonProgress.upsert({
      where: { studentLessonId: lessonId },
      update: {
        percentage,
        completed: completed ?? percentage >= 100,
        lastAccessed: new Date(),
        ...(completed || percentage >= 100 ? { completedAt: new Date() } : {}),
      },
      create: {
        studentLessonId: lessonId,
        studentId: studentId,
        percentage,
        completed: completed ?? percentage >= 100,
        lastAccessed: new Date(),
        ...(completed || percentage >= 100 ? { completedAt: new Date() } : {}),
      },
    })

    revalidatePath(`/my-courses`)

    return { success: true }
  } catch (error) {
    console.error('Error updating lesson progress:', error)
    return { success: false, error: 'Error al actualizar el progreso' }
  }
}

// =============================================
// ACCIONES PARA PROFESORES
// =============================================

// Obtener todos los estudiantes asignados a un profesor con sus lecciones
export async function getTeacherStudentsWithLessons(
  teacherId: string
): Promise<StudentLessonActionResult<StudentWithLessons[]>> {
  try {
    // Obtener todas las inscripciones donde el profesor tiene clases programadas
    const bookings = await db.classBooking.findMany({
      where: { teacherId },
      select: {
        enrollmentId: true,
      },
      distinct: ['enrollmentId'],
    })

    const enrollmentIds = bookings.map((b) => b.enrollmentId)

    // Obtener las inscripciones con cursos personalizados
    const enrollments = await db.enrollment.findMany({
      where: {
        id: { in: enrollmentIds },
        course: {
          isPersonalized: true,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        academicPeriod: {
          select: {
            id: true,
            name: true,
          },
        },
        studentLessons: {
          where: { teacherId },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            duration: true,
            isPublished: true,
            videoUrl: true,
            summary: true,
            createdAt: true,
            updatedAt: true,
            progress: {
              select: {
                completed: true,
                percentage: true,
                lastAccessed: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    const studentsWithLessons: StudentWithLessons[] = enrollments.map((enrollment) => {
      const lessons = enrollment.studentLessons
      const completedLessons = lessons.filter((l) => l.progress?.completed).length
      const totalProgress = lessons.reduce((sum, l) => sum + (l.progress?.percentage ?? 0), 0)

      return {
        student: enrollment.student,
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          courseId: enrollment.course.id,
          courseName: enrollment.course.title,
          academicPeriodId: enrollment.academicPeriod.id,
          academicPeriodName: enrollment.academicPeriod.name,
        },
        lessons: lessons as StudentLessonListItem[],
        stats: {
          totalLessons: lessons.length,
          publishedLessons: lessons.filter((l) => l.isPublished).length,
          completedLessons,
          averageProgress: lessons.length > 0 ? totalProgress / lessons.length : 0,
        },
      }
    })

    return { success: true, data: studentsWithLessons }
  } catch (error) {
    console.error('Error fetching teacher students:', error)
    return { success: false, error: 'Error al obtener los estudiantes' }
  }
}

// Obtener estadísticas de lecciones para un profesor
export async function getTeacherStudentLessonStats(
  teacherId: string
): Promise<StudentLessonActionResult<StudentLessonStats>> {
  try {
    const lessons = await db.studentLesson.findMany({
      where: { teacherId },
      select: {
        isPublished: true,
        progress: {
          select: {
            completed: true,
            percentage: true,
          },
        },
      },
    })

    const totalLessons = lessons.length
    const publishedLessons = lessons.filter((l) => l.isPublished).length
    const completedLessons = lessons.filter((l) => l.progress?.completed).length
    const totalProgress = lessons.reduce((sum, l) => sum + (l.progress?.percentage ?? 0), 0)

    return {
      success: true,
      data: {
        totalLessons,
        publishedLessons,
        completedLessons,
        averageProgress: totalLessons > 0 ? totalProgress / totalLessons : 0,
      },
    }
  } catch (error) {
    console.error('Error fetching teacher stats:', error)
    return { success: false, error: 'Error al obtener las estadísticas' }
  }
}

// Obtener lecciones personalizadas de un estudiante para un curso específico
export async function getStudentLessonsForCourse(
  studentId: string,
  courseId: string
): Promise<StudentLessonActionResult<{
  lessons: StudentLessonListItem[]
  teacher: { name: string; lastName: string | null; image: string | null } | null
}>> {
  try {
    // Buscar la inscripción activa del estudiante en el curso
    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId,
        courseId,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
      include: {
        studentLessons: {
          where: { isPublished: true },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            duration: true,
            isPublished: true,
            videoUrl: true,
            summary: true,
            createdAt: true,
            updatedAt: true,
            teacher: {
              select: {
                name: true,
                lastName: true,
                image: true,
              },
            },
            progress: {
              select: {
                completed: true,
                percentage: true,
                lastAccessed: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!enrollment) {
      return { success: false, error: 'Inscripción no encontrada' }
    }

    // Obtener el profesor (del primer lesson o de los bookings)
    const teacher = enrollment.studentLessons[0]?.teacher || null

    return {
      success: true,
      data: {
        lessons: enrollment.studentLessons as StudentLessonListItem[],
        teacher,
      },
    }
  } catch (error) {
    console.error('Error fetching student lessons for course:', error)
    return { success: false, error: 'Error al obtener las lecciones' }
  }
}

// Duplicar una lección para otro estudiante
export async function duplicateStudentLesson(
  lessonId: string,
  targetEnrollmentId: string,
  teacherId: string
): Promise<StudentLessonActionResult<{ id: string }>> {
  try {
    // Obtener la lección original
    const originalLesson = await db.studentLesson.findFirst({
      where: {
        id: lessonId,
        teacherId: teacherId,
      },
      include: {
        contents: true,
      },
    })

    if (!originalLesson) {
      return { success: false, error: 'Lección no encontrada' }
    }

    // Obtener la inscripción destino
    const targetEnrollment = await db.enrollment.findUnique({
      where: { id: targetEnrollmentId },
      select: {
        studentId: true,
        course: {
          select: {
            isPersonalized: true,
          },
        },
      },
    })

    if (!targetEnrollment) {
      return { success: false, error: 'Inscripción destino no encontrada' }
    }

    if (!targetEnrollment.course.isPersonalized) {
      return { success: false, error: 'El curso destino no permite lecciones personalizadas' }
    }

    // Obtener el orden máximo en la inscripción destino
    const maxOrder = await db.studentLesson.aggregate({
      where: { enrollmentId: targetEnrollmentId },
      _max: { order: true },
    })

    // Crear la nueva lección
    const newLesson = await db.studentLesson.create({
      data: {
        title: `${originalLesson.title} (copia)`,
        description: originalLesson.description,
        order: (maxOrder._max.order ?? 0) + 1,
        duration: originalLesson.duration,
        content: originalLesson.content,
        videoUrl: originalLesson.videoUrl,
        summary: originalLesson.summary,
        transcription: originalLesson.transcription,
        isPublished: false, // Las copias empiezan sin publicar
        studentId: targetEnrollment.studentId,
        teacherId: teacherId,
        enrollmentId: targetEnrollmentId,
      },
    })

    // Duplicar los contenidos si existen
    if (originalLesson.contents.length > 0) {
      await db.studentLessonContent.createMany({
        data: originalLesson.contents.map((content) => ({
          title: content.title,
          description: content.description,
          order: content.order,
          contentType: content.contentType,
          studentLessonId: newLesson.id,
          parentId: null, // Los contenidos raíz no tienen padre
          data: content.data === null ? Prisma.JsonNull : content.data,
        })),
      })
    }

    revalidatePath(`/teacher/students`)

    return { success: true, data: { id: newLesson.id } }
  } catch (error) {
    console.error('Error duplicating lesson:', error)
    return { success: false, error: 'Error al duplicar la lección' }
  }
}
