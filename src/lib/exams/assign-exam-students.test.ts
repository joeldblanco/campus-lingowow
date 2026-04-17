import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assignExamStudentsWithNotifications } from './assign-exam-students'
import { db } from '@/lib/db'

vi.mock('@prisma/client', () => ({
  AssignmentStatus: {
    ASSIGNED: 'ASSIGNED',
  },
  NotificationType: {
    TASK_ASSIGNED: 'TASK_ASSIGNED',
  },
  Prisma: {
    validator: () => (value: unknown) => value,
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

describe('assignExamStudentsWithNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates notifications only for assignments inserted by the current transaction', async () => {
    const tx = {
      examAssignment: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ userId: 'student-1' }])
          .mockResolvedValueOnce([
            { id: 'assignment-1', examId: 'exam-1', userId: 'student-1' },
            { id: 'assignment-2', examId: 'exam-1', userId: 'student-2' },
          ]),
      },
      notification: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    }

    vi.mocked(db.user.findUnique).mockResolvedValue({
      name: 'Ana',
      lastName: 'Pérez',
      roles: ['TEACHER'],
    } as never)

    vi.mocked(db.$transaction).mockImplementation(async (callback) => callback(tx as never))

    const assignments = await assignExamStudentsWithNotifications({
      examId: 'exam-1',
      studentIds: ['student-1', 'student-2', 'student-2'],
      assignedById: 'teacher-1',
      examTitle: 'Midterm',
      dueDate: new Date('2026-04-20T10:00:00.000Z'),
      instructions: 'Read carefully',
    })

    expect(tx.examAssignment.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ examId: 'exam-1', userId: 'student-1', assignedBy: 'teacher-1' }),
        expect.objectContaining({ examId: 'exam-1', userId: 'student-2', assignedBy: 'teacher-1' }),
      ]),
      skipDuplicates: true,
    })

    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'student-1',
          title: 'Nuevo examen asignado',
          link: '/student/exams',
        }),
      ],
    })

    expect(assignments).toHaveLength(2)
  })
})
