'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Obtiene todos los cursos con información de si el profesor los puede enseñar
 */
export async function getCoursesForTeacher(teacherId: string) {
  try {
    const courses = await db.course.findMany({
      where: {
        isPublished: true,
      },
      include: {
        teacherCourses: {
          where: {
            teacherId,
          },
        },
      },
      orderBy: [
        { language: 'asc' },
        { title: 'asc' },
      ],
    })

    return {
      success: true,
      courses: courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        language: course.language,
        level: course.level,
        isAssigned: course.teacherCourses.length > 0,
        paymentPerClass: course.teacherCourses[0]?.paymentPerClass ?? null,
      })),
    }
  } catch (error) {
    console.error('Error fetching courses for teacher:', error)
    return {
      success: false,
      error: 'Error al obtener los cursos',
      courses: [],
    }
  }
}

/**
 * Obtiene los cursos agrupados por idioma
 */
export async function getCoursesGroupedByLanguage(teacherId: string) {
  try {
    const result = await getCoursesForTeacher(teacherId)
    
    if (!result.success) {
      return result
    }

    type CourseType = typeof result.courses[number]

    // Agrupar cursos por idioma
    const grouped = result.courses.reduce((acc, course) => {
      if (!acc[course.language]) {
        acc[course.language] = []
      }
      acc[course.language].push(course)
      return acc
    }, {} as Record<string, CourseType[]>)

    return {
      success: true,
      groupedCourses: grouped,
    }
  } catch (error) {
    console.error('Error grouping courses by language:', error)
    return {
      success: false,
      error: 'Error al agrupar cursos por idioma',
      groupedCourses: {},
    }
  }
}

/**
 * Asigna un curso a un profesor
 */
export async function assignCourseToTeacher(teacherId: string, courseId: string) {
  try {
    await db.teacherCourse.create({
      data: {
        teacherId,
        courseId,
      },
    })

    revalidatePath('/admin/teachers')
    revalidatePath('/admin/classes')

    return {
      success: true,
      message: 'Curso asignado exitosamente',
    }
  } catch (error) {
    console.error('Error assigning course to teacher:', error)
    return {
      success: false,
      error: 'Error al asignar el curso al profesor',
    }
  }
}

/**
 * Desasigna un curso de un profesor
 */
export async function unassignCourseFromTeacher(teacherId: string, courseId: string) {
  try {
    await db.teacherCourse.delete({
      where: {
        teacherId_courseId: {
          teacherId,
          courseId,
        },
      },
    })

    revalidatePath('/admin/teachers')
    revalidatePath('/admin/classes')

    return {
      success: true,
      message: 'Curso desasignado exitosamente',
    }
  } catch (error) {
    console.error('Error unassigning course from teacher:', error)
    return {
      success: false,
      error: 'Error al desasignar el curso del profesor',
    }
  }
}

/**
 * Asigna múltiples cursos a un profesor con sus pagos por clase
 */
export async function assignMultipleCoursesToTeacher(
  teacherId: string,
  courseAssignments: Array<{ courseId: string; paymentPerClass?: number | null }>
) {
  try {
    // Eliminar todas las asignaciones actuales
    await db.teacherCourse.deleteMany({
      where: {
        teacherId,
      },
    })

    // Crear las nuevas asignaciones con pago por clase
    if (courseAssignments.length > 0) {
      await db.teacherCourse.createMany({
        data: courseAssignments.map(({ courseId, paymentPerClass }) => ({
          teacherId,
          courseId,
          paymentPerClass: paymentPerClass ?? null,
        })),
      })
    }

    revalidatePath('/admin/teachers')
    revalidatePath('/admin/classes')

    return {
      success: true,
      message: 'Cursos actualizados exitosamente',
    }
  } catch (error) {
    console.error('Error assigning multiple courses to teacher:', error)
    return {
      success: false,
      error: 'Error al actualizar los cursos del profesor',
    }
  }
}

/**
 * Actualiza el pago por clase de un profesor para un curso específico
 */
export async function updateTeacherCoursePayment(
  teacherId: string,
  courseId: string,
  paymentPerClass: number | null
) {
  try {
    await db.teacherCourse.update({
      where: {
        teacherId_courseId: {
          teacherId,
          courseId,
        },
      },
      data: {
        paymentPerClass,
      },
    })

    revalidatePath('/admin/teachers')
    revalidatePath('/admin/classes')

    return {
      success: true,
      message: 'Pago por clase actualizado exitosamente',
    }
  } catch (error) {
    console.error('Error updating teacher course payment:', error)
    return {
      success: false,
      error: 'Error al actualizar el pago por clase',
    }
  }
}

/**
 * Asigna todos los cursos de un idioma específico a un profesor
 */
export async function assignLanguageCoursesToTeacher(
  teacherId: string,
  language: string
) {
  try {
    // Obtener todos los cursos del idioma
    const courses = await db.course.findMany({
      where: {
        language,
        isPublished: true,
      },
      select: {
        id: true,
      },
    })

    const courseIds = courses.map((c) => c.id)

    // Crear las asignaciones (ignorar duplicados)
    for (const courseId of courseIds) {
      await db.teacherCourse.upsert({
        where: {
          teacherId_courseId: {
            teacherId,
            courseId,
          },
        },
        create: {
          teacherId,
          courseId,
        },
        update: {},
      })
    }

    revalidatePath('/admin/teachers')
    revalidatePath('/admin/classes')

    return {
      success: true,
      message: `Todos los cursos de ${language} asignados exitosamente`,
    }
  } catch (error) {
    console.error('Error assigning language courses to teacher:', error)
    return {
      success: false,
      error: 'Error al asignar cursos del idioma',
    }
  }
}

/**
 * Desasigna todos los cursos de un idioma específico de un profesor
 */
export async function unassignLanguageCoursesFromTeacher(
  teacherId: string,
  language: string
) {
  try {
    // Obtener todos los cursos del idioma
    const courses = await db.course.findMany({
      where: {
        language,
        isPublished: true,
      },
      select: {
        id: true,
      },
    })

    const courseIds = courses.map((c) => c.id)

    // Eliminar las asignaciones
    await db.teacherCourse.deleteMany({
      where: {
        teacherId,
        courseId: {
          in: courseIds,
        },
      },
    })

    revalidatePath('/admin/teachers')
    revalidatePath('/admin/classes')

    return {
      success: true,
      message: `Todos los cursos de ${language} desasignados exitosamente`,
    }
  } catch (error) {
    console.error('Error unassigning language courses from teacher:', error)
    return {
      success: false,
      error: 'Error al desasignar cursos del idioma',
    }
  }
}

/**
 * Obtiene los profesores que pueden enseñar un curso específico
 */
export async function getTeachersForCourse(courseId: string) {
  try {
    const teacherCourses = await db.teacherCourse.findMany({
      where: {
        courseId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return {
      success: true,
      teachers: teacherCourses.map((tc) => tc.teacher),
    }
  } catch (error) {
    console.error('Error fetching teachers for course:', error)
    return {
      success: false,
      error: 'Error al obtener profesores del curso',
      teachers: [],
    }
  }
}
