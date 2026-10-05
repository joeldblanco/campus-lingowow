import { afterEach, describe, expect, it, vi } from 'vitest'

import { exportAttemptToPDF } from './pdf-export-attempt'

describe('PDF export dependency compatibility', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates a PDF data URI through the production attempt exporter', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)

    await exportAttemptToPDF({
      studentName: 'María López',
      studentEmail: 'maria@example.com',
      examTitle: 'English placement',
      courseName: 'English A1',
      attemptNumber: 1,
      submittedAt: '2026-10-05T12:00:00.000Z',
      totalScore: 8,
      maxScore: 10,
      answers: [],
    })

    expect(open).toHaveBeenCalledOnce()
    expect(open.mock.calls[0][0]).toMatch(/^data:application\/pdf;/)
    expect(open.mock.calls[0][1]).toBe('_blank')
  })
})
