import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: sendEmailMock,
    },
  })),
}))

import { sendEnrollmentConfirmationStudentEmail } from './mail'

describe('enrollment confirmation email copy', () => {
  beforeEach(() => {
    sendEmailMock.mockReset()
    process.env.NEXT_PUBLIC_DOMAIN = 'https://lingowow.test'
  })

  it('uses async-course copy when the course has no live first class', async () => {
    await sendEnrollmentConfirmationStudentEmail('student@example.com', {
      studentName: 'Ana',
      courseName: 'English Async',
      isSynchronousCourse: false,
    })

    const emailPayload = sendEmailMock.mock.calls[0][0]

    expect(emailPayload.html).toContain('Este curso es asíncrono')
    expect(emailPayload.html).toContain(
      'Este curso no incluye una primera clase en vivo. Ya puedes acceder a tu contenido desde el dashboard.'
    )
    expect(emailPayload.html).not.toContain(
      'Tu equipo académico te compartirá pronto el detalle de tu primera clase.'
    )
    expect(emailPayload.html).not.toContain(
      'Te avisaremos por este medio apenas se confirme el horario.'
    )
  })

  it('keeps the pending-first-class copy for synchronous courses without a booking yet', async () => {
    await sendEnrollmentConfirmationStudentEmail('student@example.com', {
      studentName: 'Ana',
      courseName: 'English Live',
      isSynchronousCourse: true,
    })

    const emailPayload = sendEmailMock.mock.calls[0][0]

    expect(emailPayload.html).toContain(
      'Tu equipo académico te compartirá pronto el detalle de tu primera clase.'
    )
    expect(emailPayload.html).toContain(
      'Te avisaremos por este medio apenas se confirme el horario.'
    )
  })
})
