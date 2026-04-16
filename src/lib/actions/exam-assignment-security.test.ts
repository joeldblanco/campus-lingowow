import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assignExamToStudents as assignTeacherExamToStudents } from './teacher-exams'
import {
  assignExamToStudents as assignAdminExamToStudents,
  getNonAdminUsersForExamAssignment,
} from './exams'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { assignExamStudentsWithNotifications } from '@/lib/exams/assign-exam-students'

vi.mock('@prisma/client', () => ({
  AssignmentStatus: {
    ASSIGNED: 'ASSIGNED',
  },
  AttemptStatus: {
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
  },
  ExamType: {
    COURSE_EXAM: 'COURSE_EXAM',
    PLACEMENT_TEST: 'PLACEMENT_TEST',
    DIAGNOSTIC: 'DIAGNOSTIC',
    PRACTICE: 'PRACTICE',
  },
  UserRole: {
    ADMIN: 'ADMIN',
    TEACHER: 'TEACHER',
    STUDENT: 'STUDENT',
    GUEST: 'GUEST',
  },
  Prisma: {
    validator: () => (value: unknown) => value,
  },
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/mail', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    exam: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    enrollment: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/exams/assign-exam-students', () => ({
  assignExamStudentsWithNotifications: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/audit-log', () => ({
  auditLog: vi.fn(),
}))

describe('exam assignment server validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects teacher assignments for students outside the teacher roster', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'teacher-1',
        roles: ['TEACHER'],
      },
    } as never)

    vi.mocked(db.exam.findFirst).mockResolvedValue({
      id: 'exam-1',
      title: 'Exam 1',
      courseId: 'course-1',
    } as never)

    vi.mocked(db.enrollment.findMany).mockResolvedValue([{ studentId: 'student-1' }] as never)

    const result = await assignTeacherExamToStudents('exam-1', ['student-1', 'student-2'])

    expect(result).toEqual({
      success: false,
      error: 'Uno o más estudiantes no pueden recibir este examen',
    })
    expect(assignExamStudentsWithNotifications).not.toHaveBeenCalled()
  })

  it('requires admin role for admin exam assignment and user lookup', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'teacher-1',
        roles: ['TEACHER'],
      },
    } as never)

    const assignResult = await assignAdminExamToStudents({
      examId: 'exam-1',
      studentIds: ['student-1'],
      dueDate: '',
      instructions: '',
    })

    const lookupResult = await getNonAdminUsersForExamAssignment()

    expect(assignResult).toEqual({ success: false, error: 'No autorizado' })
    expect(lookupResult).toEqual({ success: false, error: 'No autorizado', users: [] })
    expect(assignExamStudentsWithNotifications).not.toHaveBeenCalled()
  })
})