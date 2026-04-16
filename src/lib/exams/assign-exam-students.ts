import { randomUUID } from 'crypto'
import { AssignmentStatus, NotificationType, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { formatFullName } from '@/lib/utils/name-formatter'

interface AssignExamStudentsParams {
  examId: string
  studentIds: string[]
  assignedById: string
  examTitle: string
  dueDate?: Date | null
  instructions?: string | null
}

export async function assignExamStudentsWithNotifications({
  examId,
  studentIds,
  assignedById,
  examTitle,
  dueDate,
  instructions,
}: AssignExamStudentsParams) {
  const uniqueStudentIds = [...new Set(studentIds)]
  const normalizedDueDate = dueDate ?? null
  const normalizedInstructions = instructions ?? null

  if (uniqueStudentIds.length === 0) {
    return []
  }

  const assignedByUser = await db.user.findUnique({
    where: { id: assignedById },
    select: {
      name: true,
      lastName: true,
      roles: true,
    },
  })

  const assignedByName =
    formatFullName(assignedByUser?.name, assignedByUser?.lastName) ||
    (assignedByUser?.roles.includes('ADMIN') ? 'Administración' : 'Tu profesor')

  const assignmentRows = uniqueStudentIds.map((studentId) => ({
    id: randomUUID(),
    examId,
    userId: studentId,
    assignedBy: assignedById,
    dueDate: normalizedDueDate,
    instructions: normalizedInstructions,
    status: AssignmentStatus.ASSIGNED,
  }))

  const insertedAssignmentIds = assignmentRows.map((row) => row.id)

  const assignments = await db.$transaction(async (tx) => {
    await tx.examAssignment.createMany({
      data: assignmentRows,
      skipDuplicates: true,
    })

    await tx.examAssignment.updateMany({
      where: {
        examId,
        userId: {
          in: uniqueStudentIds,
        },
      },
      data: {
        dueDate: normalizedDueDate,
        instructions: normalizedInstructions,
        status: AssignmentStatus.ASSIGNED,
      },
    })

    const insertedAssignments = await tx.examAssignment.findMany({
      where: {
        id: {
          in: insertedAssignmentIds,
        },
      },
      select: {
        userId: true,
      },
    })

    if (insertedAssignments.length > 0) {
      await tx.notification.createMany({
        data: insertedAssignments.map(({ userId }) => ({
          userId,
          type: NotificationType.TASK_ASSIGNED,
          title: 'Nuevo examen asignado',
          message: `${assignedByName} te ha asignado el examen: ${examTitle}`,
          link: '/student/exams',
          metadata: {
            examId,
            dueDate: normalizedDueDate?.toISOString(),
          } as Prisma.InputJsonValue,
        })),
      })
    }

    return tx.examAssignment.findMany({
      where: {
        examId,
        userId: {
          in: uniqueStudentIds,
        },
      },
    })
  })

  return assignments
}
