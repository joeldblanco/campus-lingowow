import { useRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useRecorderMedia } from './use-recorder-media'

const mocks = vi.hoisted(() => ({ send: vi.fn(), add: vi.fn(), remove: vi.fn() }))
vi.mock('./livekit-context', () => ({ useLiveKit: () => ({
  sendCommand: mocks.send, addCommandListener: mocks.add, removeCommandListener: mocks.remove, connectionStatus: 'connected',
}) }))
function Material() {
  const ref = useRef<HTMLDivElement>(null)
  useRecorderMedia(ref, true)
  return <><div ref={ref}><section data-block-id="audio-block"><audio data-testid="audio" /></section><section data-block-id="video-block"><video data-testid="video" /></section></div><audio data-testid="unrelated" /></>
}
beforeEach(() => vi.clearAllMocks())
it('broadcasts native audio play, seek, pause and existing state for a joining recorder', () => {
  render(<Material />)
  const audio = screen.getByTestId('audio') as HTMLAudioElement
  Object.defineProperty(audio, 'paused', { value: false, configurable: true })
  audio.currentTime = 12
  fireEvent.play(audio)
  expect(mocks.send).toHaveBeenLastCalledWith('audio-sync', expect.objectContaining({ type: 'AUDIO_PLAY', blockId: 'audio-block', currentTime: 12, mediaType: 'audio' }))
  audio.currentTime = 30
  fireEvent.seeked(audio)
  expect(mocks.send).toHaveBeenLastCalledWith('audio-sync', expect.objectContaining({ type: 'AUDIO_PLAY', currentTime: 30 }))
  Object.defineProperty(audio, 'paused', { value: true })
  fireEvent.pause(audio)
  expect(mocks.send).toHaveBeenLastCalledWith('audio-sync', expect.objectContaining({ type: 'AUDIO_PAUSE' }))
  mocks.send.mockClear()
  act(() => mocks.add.mock.calls[0][1]({ type: 'REQUEST_SYNC' }))
  expect(mocks.send).toHaveBeenCalledTimes(2)
})
it('includes native video and ignores unrelated media, then removes listeners', () => {
  const { unmount } = render(<Material />)
  fireEvent.play(screen.getByTestId('video'))
  expect(mocks.send).toHaveBeenLastCalledWith('audio-sync', expect.objectContaining({ mediaType: 'video', blockId: 'video-block' }))
  fireEvent.play(screen.getByTestId('unrelated'))
  expect(mocks.send).toHaveBeenCalledTimes(1)
  unmount()
  expect(mocks.remove).toHaveBeenCalledWith('sync-request', expect.any(Function))
})
