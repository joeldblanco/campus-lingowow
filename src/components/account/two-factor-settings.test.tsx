import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/image', () => ({ default: () => null }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/actions/two-factor', () => ({
  getTwoFactorStatus: vi.fn(),
  startTwoFactorSetup: vi.fn(),
  enableTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
}))

import {
  getTwoFactorStatus,
  startTwoFactorSetup,
} from '@/lib/actions/two-factor'
import { TwoFactorSettings } from './two-factor-settings'

describe('TwoFactorSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the enable action when 2FA is disabled', async () => {
    vi.mocked(getTwoFactorStatus).mockResolvedValue({
      success: true,
      message: 'OK',
      data: { enabled: false, remainingRecoveryCodes: 0 },
    } as never)

    render(<TwoFactorSettings />)

    expect(await screen.findByText('Activar 2FA')).toBeInTheDocument()
  })

  it('shows enabled state with remaining recovery codes', async () => {
    vi.mocked(getTwoFactorStatus).mockResolvedValue({
      success: true,
      message: 'OK',
      data: { enabled: true, remainingRecoveryCodes: 7 },
    } as never)

    render(<TwoFactorSettings />)

    expect(await screen.findByText(/Activada/)).toBeInTheDocument()
    expect(screen.getByText(/7 códigos de recuperación/)).toBeInTheDocument()
    expect(screen.getByText('Desactivar')).toBeInTheDocument()
  })

  it('starts setup and reveals the QR secret + code input on activate', async () => {
    vi.mocked(getTwoFactorStatus).mockResolvedValue({
      success: true,
      message: 'OK',
      data: { enabled: false, remainingRecoveryCodes: 0 },
    } as never)
    vi.mocked(startTwoFactorSetup).mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        secret: 'SECRETKEY123456',
        otpauthUri: 'otpauth://totp/Lingowow:u@e.com?secret=SECRETKEY123456',
        qrCodeDataUrl: 'data:image/png;base64,FAKEQR',
      },
    } as never)

    render(<TwoFactorSettings />)

    fireEvent.click(await screen.findByText('Activar 2FA'))

    expect(await screen.findByText('SECRETKEY123456')).toBeInTheDocument()
    expect(screen.getByTestId('enable-code-input')).toBeInTheDocument()
    expect(startTwoFactorSetup).toHaveBeenCalledTimes(1)
  })
})
