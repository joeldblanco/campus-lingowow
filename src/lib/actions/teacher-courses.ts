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
 * Obtiene los cursos activos del profesor (donde ha dado clases recientemente)
 * con información completa del curso y estadísticas
 */
export async function getTeacherActiveCourses(teacherId: string) {
  try {
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    // Obtener cursos donde el profesor ha dado clases recientemente
    const coursesWithBookings = await db.course.findMany({
      where: {
        enrollments: {
          some: {
            bookings: {
              some: {
                teacherId: teacherId,
                day: { gte: sixtyDaysAgo.toISOString().split('T')[0] },
              },
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            enrollments: {
              where: { status: 'ACTIVE' },
            },
            modules: {
              where: { isPublished: true },
            },
          },
        },
        modules: {
          where: { isPublished: true },
          select: {
            _count: {
              select: { lessons: { where: { isPublished: true } } },
            },
          },
        },
      },
      orderBy: { title: 'asc' },
    })

    // También obtener cursos asignados al profesor que aún no ha enseñado
    const assignedCourses = await db.course.findMany({
      where: {
        teacherCourses: {
          some: { teacherId },
        },
        NOT: {
          id: { in: coursesWithBookings.map((c) => c.id) },
        },
      },
      include: {
        _count: {
          select: {
            enrollments: {
              where: { status: 'ACTIVE' },
            },
            modules: {
              where: { isPublished: true },
            },
          },
        },
        modules: {
          where: { isPublished: true },
          select: {
            _count: {
              select: { lessons: { where: { isPublished: true } } },
            },
          },
        },
      },
      orderBy: { title: 'asc' },
    })

    const allCourses = [...coursesWithBookings, ...assignedCourses]

    return {
      success: true,
      courses: allCourses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        language: course.language,
        level: course.level,
        image: course.image,
        isPersonalized: course.isPersonalized,
        isSynchronous: course.isSynchronous,
        studentCount: course._count.enrollments,
        moduleCount: course._count.modules,
        lessonCount: course.modules.reduce((acc, m) => acc + m._count.lessons, 0),
        isActive: coursesWithBookings.some((c) => c.id === course.id),
      })),
    }
  } catch (error) {
    console.error('Error fetching teacher active courses:', error)
    return {
      success: false,
      error: 'Error al obtener los cursos activos',
      courses: [],
    }
  }
}

/**
 * Obtiene el contenido completo de un curso para un profesor
 * Si es personalizado, solo muestra el material creado por el profesor
 * Si no es personalizado, muestra todo el material
 */
export async function getCourseContentForTeacher(courseId: string, teacherId: string) {
  try {
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        modules: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { order: 'asc' },
              include: {
                contents: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        exams: {
          where: { createdById: teacherId },
          include: {
            sections: {
              include: {
                questions: true,
              },
            },
            assignments: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            attempts: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                  },
                },
              },
            },
            _count: {
              select: {
                assignments: true,
                attempts: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            enrollments: { where: { status: 'ACTIVE' } },
          },
        },
      },
    })

    if (!course) {
      return { success: false, error: 'Curso no encontrado', course: null }
    }

    // Si el curso es personalizado, obtener las lecciones personalizadas creadas por este profesor
    let personalizedLessons: Array<{
      id: string
      title: string
      description: string | null
      order: number
      duration: number
      isPublished: boolean
      videoUrl: string | null
      summary: string | null
      studentName: string
      studentId: string
      enrollmentId: string
    }> = []

    if (course.isPersonalized) {
      const lessons = await db.lesson.findMany({
        where: {
          teacherId: teacherId,
          studentId: { not: null }, // Only personalized lessons
          enrollment: {
            courseId: courseId,
          },
          isPublished: true,
        },
        include: {
          enrollment: {
            include: {
              student: {
                select: { name: true, lastName: true },
              },
            },
          },
        },
        orderBy: { order: 'asc' },
      })

      personalizedLessons = lessons.map((l: { id: string; title: string; description: string; order: number; duration: number; isPublished: boolean; videoUrl: string | null; summary: string | null; studentId: string | null; enrollmentId: string | null; enrollment: { student: { name: string; lastName: string | null } } | null }) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        order: l.order,
        duration: l.duration,
        isPublished: l.isPublished,
        videoUrl: l.videoUrl,
        summary: l.summary,
        studentName: l.enrollment ? `${l.enrollment.student.name} ${l.enrollment.student.lastName || ''}`.trim() : '',
        studentId: l.studentId || '',
        enrollmentId: l.enrollmentId || '',
      }))
    }

    const examsWithStats = course.exams.map((exam) => ({
      ...exam,
      questionCount: exam.sections.reduce((acc, s) => acc + s.questions.length, 0),
      totalPoints: exam.sections.reduce(
        (acc, s) => acc + s.questions.reduce((qAcc, q) => qAcc + q.points, 0),
        0
      ),
    }))

    return {
      success: true,
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        language: course.language,
        level: course.level,
        image: course.image,
        isPersonalized: course.isPersonalized,
        isSynchronous: course.isSynchronous,
        createdBy: course.createdBy,
        studentCount: course._count.enrollments,
        modules: course.isPersonalized ? [] : course.modules,
        personalizedLessons: course.isPersonalized ? personalizedLessons : [],
        exams: examsWithStats,
      },
    }
  } catch (error) {
    console.error('Error fetching course content for teacher:', error)
    return {
      success: false,
      error: 'Error al obtener el contenido del curso',
      course: null,
    }
  }
}

/**
 * Obtiene la lista de estudiantes activos del profesor
 */
export async function getTeacherActiveStudents(teacherId: string) {
  try {
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    // Obtener estudiantes únicos que han tenido clases con este profesor
    const bookings = await db.classBooking.findMany({
      where: {
        teacherId,
        day: { gte: sixtyDaysAgo.toISOString().split('T')[0] },
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
        enrollment: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                language: true,
                level: true,
              },
            },
          },
        },
      },
      orderBy: { day: 'desc' },
    })

    // Agrupar por estudiante
    const studentMap = new Map<
      string,
      {
        student: {
          id: string
          name: string | null
          lastName: string | null
          email: string | null
          image: string | null
        }
        courses: Set<string>
        courseDetails: Array<{ id: string; title: string; language: string; level: string }>
        totalClasses: number
        lastClassDate: string
      }
    >()

    for (const booking of bookings) {
      const existing = studentMap.get(booking.studentId)
      if (existing) {
        existing.totalClasses++
        if (!existing.courses.has(booking.enrollment.course.id)) {
          existing.courses.add(booking.enrollment.course.id)
          existing.courseDetails.push(booking.enrollment.course)
        }
      } else {
        studentMap.set(booking.studentId, {
          student: booking.student,
          courses: new Set([booking.enrollment.course.id]),
          courseDetails: [booking.enrollment.course],
          totalClasses: 1,
          lastClassDate: booking.day,
        })
      }
    }

    const students = Array.from(studentMap.values()).map((s) => ({
      id: s.student.id,
      name: s.student.name,
      lastName: s.student.lastName,
      email: s.student.email,
      image: s.student.image,
      courses: s.courseDetails,
      totalClasses: s.totalClasses,
      lastClassDate: s.lastClassDate,
    }))

    return {
      success: true,
      students,
      totalCount: students.length,
    }
  } catch (error) {
    console.error('Error fetching teacher active students:', error)
    return {
      success: false,
      error: 'Error al obtener los estudiantes activos',
      students: [],
      totalCount: 0,
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
