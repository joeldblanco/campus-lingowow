import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImpersonationBanner } from './impersonation-banner'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('next-auth/react', () => ({ useSession }))
vi.mock('@/lib/actions/impersonate', () => ({ exitImpersonation: vi.fn() }))

describe('impersonation banner', () => {
  beforeEach(() => vi.clearAllMocks())
  it('stays hidden outside impersonation', () => {
    useSession.mockReturnValue({ data: { user: { name: 'Joel' } } })
    const { container } = render(<ImpersonationBanner />)
    expect(container).toBeEmptyDOMElement()
  })
  it('shows concise user context and an exit control without covering the page', () => {
    useSession.mockReturnValue({
      data: { user: { name: 'Cristina Castillo', impersonationData: {} } },
    })
    const { container } = render(<ImpersonationBanner />)
    expect(screen.getByText('Cristina')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salir' })).toBeEnabled()
    expect(container.firstChild).not.toHaveClass('fixed')
  })
})
