import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@prisma/client', () => ({
  AssignmentStatus: { ASSIGNED: 'ASSIGNED' },
}))

vi.mock('@/auth', () => ({ auth: vi.fn() }))

vi.mock('@/lib/db', () => ({
  db: {
    exam: { findFirst: vi.fn() },
    enrollment: { findMany: vi.fn() },
    examAssignment: { upsert: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/actions/notifications', () => ({ notifyExamAssigned: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { assignExamToStudents } from './teacher-exams'
import { auth } from '@/auth'
import { db } from '@/lib/db'

const exam = { id: 'exam-1', title: 'Exam 1', courseId: 'course-1' }

describe('assignExamToStudents — roster security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a teacher assigning to a student outside their roster', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'teacher-1', roles: ['TEACHER'] } } as never)
    vi.mocked(db.exam.findFirst).mockResolvedValue(exam as never)
    // Only student-1 is in the teacher's roster.
    vi.mocked(db.enrollment.findMany).mockResolvedValue([{ studentId: 'student-1' }] as never)

    const result = await assignExamToStudents('exam-1', ['student-1', 'student-2'])

    expect(result).toEqual({
      success: false,
      error: 'Uno o más estudiantes no pueden recibir este examen',
    })
    expect(db.examAssignment.upsert).not.toHaveBeenCalled()
  })

  it('assigns when every target student is in the roster', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'teacher-1', roles: ['TEACHER'] } } as never)
    vi.mocked(db.exam.findFirst).mockResolvedValue(exam as never)
    vi.mocked(db.enrollment.findMany).mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
    ] as never)
    vi.mocked(db.examAssignment.upsert).mockResolvedValue({ id: 'a1' } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({ name: 'Prof' } as never)

    const result = await assignExamToStudents('exam-1', ['student-1', 'student-2'])

    expect(result.success).toBe(true)
    expect(db.examAssignment.upsert).toHaveBeenCalledTimes(2)
  })

  it('lets an admin assign to any enrolled student', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1', roles: ['ADMIN'] } } as never)
    vi.mocked(db.exam.findFirst).mockResolvedValue(exam as never)
    vi.mocked(db.enrollment.findMany).mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
    ] as never)
    vi.mocked(db.examAssignment.upsert).mockResolvedValue({ id: 'a1' } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({ name: 'Admin' } as never)

    const result = await assignExamToStudents('exam-1', ['student-1', 'student-2'])

    expect(result.success).toBe(true)
    expect(db.examAssignment.upsert).toHaveBeenCalledTimes(2)
  })
})
