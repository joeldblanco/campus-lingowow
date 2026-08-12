import { EnrollmentStatus, UserRole, UserStatus } from '@prisma/client'
import { LINGOFLOW_TARGET_ACTIVE_STUDENTS } from '@/config/lingoflow'
import { getLingoFlowReadDb } from '@/lib/lingoflow/read-db'
import type { LingoFlowReadModel } from '@/types/lingoflow'

export const lingoFlowActiveStudentsWhere = {
  status: EnrollmentStatus.ACTIVE,
  student: { status: UserStatus.ACTIVE, roles: { has: UserRole.STUDENT } },
}

export function buildLingoFlowReadModel(studentIds: string[]): LingoFlowReadModel {
  const activeStudents = new Set(studentIds).size
  const gap = Math.max(0, LINGOFLOW_TARGET_ACTIVE_STUDENTS - activeStudents)

  return {
    activeStudents,
    targetStudents: LINGOFLOW_TARGET_ACTIVE_STUDENTS,
    gap,
    progressPercent: Number(((activeStudents / LINGOFLOW_TARGET_ACTIVE_STUDENTS) * 100).toFixed(1)),
  }
}

/** Only SELECT queries belong in this business read model. */
export async function getLingoFlowReadModel(): Promise<LingoFlowReadModel> {
  const rows = await getLingoFlowReadDb().enrollment.findMany({
    where: lingoFlowActiveStudentsWhere,
    select: { studentId: true },
    distinct: ['studentId'],
  })

  return buildLingoFlowReadModel(rows.map(({ studentId }) => studentId))
}
