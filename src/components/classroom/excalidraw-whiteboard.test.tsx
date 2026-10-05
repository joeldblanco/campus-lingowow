import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  elements: [] as Array<{ id: string; version: number }>,
  sendCommand: vi.fn(),
  listeners: new Map<string, (data: Record<string, unknown>) => void>(),
}))
vi.mock('./livekit-context', () => ({ useLiveKit: () => ({
  sendCommand: state.sendCommand,
  addCommandListener: addListener,
  removeCommandListener: removeListener,
  connectionStatus: 'connected',
}) }))
function addListener(name: string, callback: (data: Record<string, unknown>) => void) { state.listeners.set(name, callback) }
function removeListener(name: string) { state.listeners.delete(name) }
vi.mock('@/lib/actions/classroom-whiteboard', () => ({ getWhiteboardData: vi.fn().mockResolvedValue([]), saveWhiteboardData: vi.fn() }))
vi.mock('next/dynamic', () => ({ default: () => function MockCanvas(props: { excalidrawAPI: (api: unknown) => void; onChange: () => void }) {
  const initialize = React.useRef(props.excalidrawAPI)
  React.useEffect(() => { initialize.current({ getSceneElements: () => state.elements, updateScene: vi.fn() }) }, [])
  return <button onClick={props.onChange}>draw</button>
} }))
import { ExcalidrawWhiteboard } from './excalidraw-whiteboard'

describe('whiteboard recording synchronization', () => {
  beforeEach(() => { vi.useFakeTimers(); state.elements = []; state.listeners.clear(); state.sendCommand.mockClear() })
  afterEach(() => vi.useRealTimers())

  it('sends the current unsaved teacher scene when a recorder joins', async () => {
    state.elements = [{ id: 'unsaved', version: 2 }]
    render(<ExcalidrawWhiteboard isTeacher />)
    await act(async () => { state.listeners.get('sync-request')?.({ type: 'REQUEST_SYNC' }) })
    expect(state.sendCommand).toHaveBeenCalledWith('whiteboard-sync', {
      type: 'WHITEBOARD_UPDATE', elements: state.elements, participantId: 'teacher',
    })
  })

  it('does not let the student override the authoritative join snapshot', async () => {
    render(<ExcalidrawWhiteboard />)
    await act(async () => { state.listeners.get('sync-request')?.({ type: 'REQUEST_SYNC' }) })
    expect(state.sendCommand).not.toHaveBeenCalled()
  })

  it('broadcasts clearing the last drawing so the recording cannot retain it', async () => {
    render(<ExcalidrawWhiteboard isTeacher />)
    state.elements = [{ id: 'drawing', version: 1 }]
    fireEvent.click(screen.getByText('draw'))
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(state.sendCommand).toHaveBeenCalledTimes(1)
    state.elements = []
    fireEvent.click(screen.getByText('draw'))
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(state.sendCommand).toHaveBeenLastCalledWith('whiteboard-sync', {
      type: 'WHITEBOARD_UPDATE', elements: [], participantId: 'teacher',
    })
    expect(state.sendCommand).toHaveBeenCalledTimes(2)
  })
})
