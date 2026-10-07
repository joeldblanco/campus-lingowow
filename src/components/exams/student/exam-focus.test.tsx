import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { ExamChrome, ExamContentArea, ExamFocusProvider, ExamMain, useExamFocus } from './exam-focus'

vi.mock('next/navigation', () => ({ usePathname: () => '/exams/exam/take' }))
vi.mock('@/components/ui/sidebar', () => ({ SidebarInset: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }))

function Controls() {
  const { setActive } = useExamFocus()
  const [answer, setAnswer] = useState('')
  return <><input aria-label="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} /><button onClick={() => setActive(true)}>Enter</button><button onClick={() => setActive(false)}>Leave</button></>
}

describe('focused exam shell', () => {
  it('removes app chrome while keeping exam controls and their answers mounted', () => {
    render(<ExamFocusProvider><ExamChrome><nav>App sidebar</nav></ExamChrome><ExamMain><ExamChrome><header>App header</header></ExamChrome><ExamContentArea><Controls /></ExamContentArea></ExamMain></ExamFocusProvider>)
    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'My answer' } })
    fireEvent.click(screen.getByText('Enter'))
    expect(screen.queryByText('App sidebar')).not.toBeInTheDocument()
    expect(screen.queryByText('App header')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Answer')).toHaveValue('My answer')
    fireEvent.click(screen.getByText('Leave'))
    expect(screen.getByText('App sidebar')).toBeVisible()
    expect(screen.getByText('App header')).toBeVisible()
    expect(screen.getByLabelText('Answer')).toHaveValue('My answer')
  })
})
