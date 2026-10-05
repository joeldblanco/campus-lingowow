import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { NavStudent } from './nav-student'

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }))
vi.mock('next/navigation', () => ({ usePathname: () => '/schedule' }))
vi.mock('@/hooks/use-socket-channel', () => ({ useSocketChannel: vi.fn() }))
vi.mock('@/lib/actions/floating-chat', () => ({ getTotalUnreadCount: vi.fn() }))
vi.mock('@/components/ui/sidebar', () => {
  const Wrapper = ({ children }: { children: ReactNode }) => <div>{children}</div>
  return Object.fromEntries(
    [
      'SidebarGroup',
      'SidebarGroupContent',
      'SidebarMenu',
      'SidebarMenuButton',
      'SidebarMenuItem',
    ].map((name) => [name, Wrapper])
  )
})

describe('student navigation', () => {
  it('provides direct course and schedule links while preserving existing destinations', () => {
    render(<NavStudent />)
    expect(screen.getByRole('link', { name: 'Mi curso' })).toHaveAttribute('href', '/my-courses')
    expect(screen.getByRole('link', { name: 'Horario' })).toHaveAttribute('href', '/schedule')
    expect(screen.getByRole('link', { name: 'Tienda' })).toHaveAttribute('href', '/shop')
    expect(screen.getByRole('link', { name: 'Mensajes' })).toHaveAttribute('href', '/messages')
  })
})
