import { vi, describe, it, expect, beforeEach } from 'vitest'

const notificationCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  db: { notification: { create: (args: unknown) => notificationCreate(args) } },
}))

// Break the next-auth import chain (notifications.ts -> session -> auth -> next-auth).
vi.mock('@/lib/utils/session', () => ({ getCurrentUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { notifyExamAssigned } from './notifications'

describe('notifyExamAssigned (#118)', () => {
  beforeEach(() => {
    notificationCreate.mockReset()
    notificationCreate.mockResolvedValue({ id: 'notif-1' })
  })

  it('creates an EXAM_ASSIGNED notification addressed to the student', async () => {
    await notifyExamAssigned({
      studentId: 'student-1',
      examTitle: 'Examen de Nivel B1',
      teacherName: 'Prof. Ana',
      examId: 'exam-1',
      dueDate: new Date('2026-06-15T00:00:00.000Z'),
    })

    expect(notificationCreate).toHaveBeenCalledTimes(1)
    const arg = notificationCreate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(arg.data.userId).toBe('student-1')
    expect(arg.data.type).toBe('EXAM_ASSIGNED')
    expect(arg.data.message).toContain('Examen de Nivel B1')
    expect(arg.data.message).toContain('Prof. Ana')
    expect(arg.data.link).toBe('/exams/exam-1')
  })

  it('includes the exam id and due date in the metadata', async () => {
    await notifyExamAssigned({
      studentId: 'student-2',
      examTitle: 'Quiz',
      teacherName: 'Prof. Luis',
      examId: 'exam-9',
      dueDate: new Date('2026-07-01T12:00:00.000Z'),
    })

    const arg = notificationCreate.mock.calls[0][0] as {
      data: { metadata: { examId: string; dueDate: string } }
    }
    expect(arg.data.metadata.examId).toBe('exam-9')
    expect(arg.data.metadata.dueDate).toBe('2026-07-01T12:00:00.000Z')
  })
})
