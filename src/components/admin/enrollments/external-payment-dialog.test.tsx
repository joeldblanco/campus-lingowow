import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ExternalPaymentDialog } from './external-payment-dialog'
const mocks = vi.hoisted(() => ({ options: vi.fn(), register: vi.fn() }))
vi.mock('@/lib/actions/external-payments', () => ({
  getExternalPaymentEnrollmentOptions: mocks.options,
  registerExternalPaymentEnrollment: mocks.register,
}))

async function openAndFill() {
  fireEvent.click(screen.getByRole('button', { name: 'Registrar pago Culqi' }))
  await screen.findByLabelText('Estudiante')
  for (const [label, value] of [
    ['Estudiante', 'student-test'],
    ['Curso', 'course-test'],
    ['Período académico', 'period-test'],
    ['Referencia del comprobante Culqi', 'chr_test'],
    ['Importe pagado', '240.00'],
    ['Moneda', 'USD'],
    ['Fecha y hora del pago (hora local de tu dispositivo)', '2020-01-01T12:00'],
    ['Paquete o concepto del comprobante', 'Test package'],
    ['Clases pagadas', '12'],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  fireEvent.click(screen.getByRole('checkbox'))
}

describe('external payment dialog', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.options.mockResolvedValue({
      students: [
        { id: 'student-test', name: 'Test', lastName: 'Student', email: 'test@example.test' },
      ],
      courses: [{ id: 'course-test', title: 'Test course' }],
      periods: [{ id: 'period-test', name: 'Test period' }],
    })
  })

  it('requires evidence fields and submits decimal amount and actual local payment time', async () => {
    mocks.register.mockResolvedValue({ success: true, data: { enrollmentId: 'enrollment-test' } })
    const refresh = vi.fn()
    render(<ExternalPaymentDialog onEnrollmentCreated={refresh} />)
    await openAndFill()
    expect(screen.getByLabelText('Referencia del comprobante Culqi')).toBeRequired()
    expect(screen.getByRole('checkbox')).toBeRequired()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago y crear matrícula' }))
    await screen.findByRole('status')
    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'culqi',
        amount: '240.00',
        currency: 'USD',
        classesTotal: 12,
        paidAt: new Date('2020-01-01T12:00').toISOString(),
      })
    )
    expect(screen.getByRole('status')).toHaveTextContent('enrollment-test')
    expect(refresh).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('retains input and permits retry after an error', async () => {
    mocks.register
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ success: false, error: 'La referencia ya existe' })
    render(<ExternalPaymentDialog />)
    await openAndFill()
    const submit = screen.getByRole('button', { name: 'Registrar pago y crear matrícula' })
    fireEvent.click(submit)
    await screen.findByRole('alert')
    expect(screen.getByLabelText('Referencia del comprobante Culqi')).toHaveValue('chr_test')
    fireEvent.click(submit)
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('La referencia ya existe')
    )
    expect(mocks.register).toHaveBeenCalledTimes(2)
  })

  it('disables duplicate submission while waiting', async () => {
    mocks.register.mockReturnValue(new Promise(() => {}))
    render(<ExternalPaymentDialog />)
    await openAndFill()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago y crear matrícula' }))
    expect(await screen.findByRole('button', { name: 'Registrando…' })).toBeDisabled()
    expect(mocks.register).toHaveBeenCalledOnce()
  })

  it('reports a load failure without enabling registration', async () => {
    mocks.options.mockRejectedValue(new Error('load'))
    render(<ExternalPaymentDialog />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago Culqi' }))
    await screen.findByRole('alert')
    expect(
      screen.queryByRole('button', { name: 'Registrar pago y crear matrícula' })
    ).not.toBeInTheDocument()
  })
})
