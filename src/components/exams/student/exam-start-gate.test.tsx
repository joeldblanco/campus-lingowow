import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExamStartGate } from './exam-start-gate'
import { ExamFocusProvider, ExamChrome } from './exam-focus'
import { loadExamTakingSession } from '@/lib/actions/exam-entry'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), usePathname: () => '/exams/exam/take' }))
vi.mock('@/lib/actions/exam-entry', () => ({ loadExamTakingSession: vi.fn() }))
vi.mock('@/app/(private)/exams/[examId]/take/exam-taking-client', () => ({ ExamTakingClient: () => <div>Exam controls</div> }))
vi.mock('./exam-entry-dialog', () => ({ ExamEntryDialog: ({ onEnter, onCancel }: { onEnter: () => Promise<void>; onCancel: () => void }) => <><button onClick={onEnter}>Entrar</button><button onClick={onCancel}>Cancelar</button></> }))

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement })
})

const props = { examId: 'exam', title: 'Unit quiz', cancelUrl: '/exams/exam', proctoring: { enabled: true, requireFullscreen: true, blockCopyPaste: true, blockRightClick: true, maxWarnings: 5 } }

describe('exam start boundary', () => {
  it('does not create or mount an exam while the notice is open or cancelled', () => {
    render(<ExamStartGate {...props} />)
    expect(loadExamTakingSession).not.toHaveBeenCalled()
    expect(screen.queryByText('Exam controls')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancelar'))
    expect(replace).toHaveBeenCalledWith('/exams/exam')
    expect(loadExamTakingSession).not.toHaveBeenCalled()
  })

  it('starts after acceptance, removes chrome and keeps it absent after effects settle', async () => {
    vi.mocked(loadExamTakingSession).mockResolvedValue({ examId: 'exam' } as never)
    render(<ExamFocusProvider><ExamChrome><header>App header</header></ExamChrome><ExamStartGate {...props} /></ExamFocusProvider>)
    fireEvent.click(screen.getByText('Entrar'))
    await waitFor(() => expect(screen.getByText('Exam controls')).toBeVisible())
    expect(loadExamTakingSession).toHaveBeenCalledWith('exam')
    expect(screen.queryByText('App header')).not.toBeInTheDocument()
    expect(screen.queryByText('Entrar')).not.toBeInTheDocument()
  })

  it('preserves a rejected-attempt destination without mounting exam controls', async () => {
    const exit = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit })
    vi.mocked(loadExamTakingSession).mockResolvedValue({ redirectUrl: '/exams/exam?error=max-attempts' })
    render(<ExamStartGate {...props} />)
    fireEvent.click(screen.getByText('Entrar'))
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/exams/exam?error=max-attempts'))
    expect(exit).toHaveBeenCalledOnce()
    expect(screen.queryByText('Exam controls')).not.toBeInTheDocument()
  })
})
