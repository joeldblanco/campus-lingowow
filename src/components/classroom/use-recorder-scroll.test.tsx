import { useRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecorderScroll } from './use-recorder-scroll'

const mocks = vi.hoisted(() => ({ send: vi.fn(), add: vi.fn(), remove: vi.fn() }))
vi.mock('./livekit-context', () => ({ useLiveKit: () => ({
  sendCommand: mocks.send, addCommandListener: mocks.add, removeCommandListener: mocks.remove, connectionStatus: 'connected',
}) }))

function Lesson({ teacher = true }) {
  const ref = useRef<HTMLDivElement>(null)
  useRecorderScroll(ref, teacher)
  return <><div data-testid="scroller"><div ref={ref}>Lesson</div></div><div data-testid="chat" /></>
}
describe('recording lesson viewport', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks() })
  afterEach(() => vi.useRealTimers())
  it('publishes the teacher scroll ratio and ignores unrelated panels', async () => {
    render(<Lesson />)
    const target = screen.getByTestId('scroller')
    Object.defineProperties(target, { scrollHeight: { value: 1000 }, clientHeight: { value: 200 }, scrollTop: { value: 400 } })
    fireEvent.scroll(target)
    await act(async () => { await vi.advanceTimersByTimeAsync(110) })
    expect(mocks.send).toHaveBeenCalledWith('lesson-scroll', { type: 'LESSON_SCROLL', progress: 0.5 })
    fireEvent.scroll(screen.getByTestId('chat'))
    await act(async () => { await vi.advanceTimersByTimeAsync(110) })
    expect(mocks.send).toHaveBeenCalledTimes(1)
    act(() => mocks.add.mock.calls[0][1]({ type: 'REQUEST_SYNC' }))
    expect(mocks.send).toHaveBeenCalledTimes(2)
  })
  it('never broadcasts a student viewport', async () => {
    render(<Lesson teacher={false} />)
    fireEvent.scroll(screen.getByTestId('scroller'))
    await act(async () => { await vi.advanceTimersByTimeAsync(110) })
    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.add).not.toHaveBeenCalled()
  })
  it('cancels pending scroll updates on unmount', async () => {
    const { unmount } = render(<Lesson />)
    fireEvent.scroll(screen.getByTestId('scroller'))
    unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(110) })
    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.remove).toHaveBeenCalledWith('sync-request', expect.any(Function))
  })
})
