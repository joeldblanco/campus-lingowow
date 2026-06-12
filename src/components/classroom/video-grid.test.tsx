import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { VideoGrid, type VideoTrack } from './video-grid'

const makeTrack = (overrides: Partial<VideoTrack> = {}): VideoTrack => ({
  participantId: 'p1',
  name: 'Rut',
  isLocal: false,
  isMuted: false,
  isVideoMuted: true,
  ...overrides,
})

describe('VideoGrid', () => {
  it('shows a waiting state for the teacher when the student has no remote tracks yet', () => {
    render(<VideoGrid isTeacher={false} localTrack={makeTrack({ isLocal: true })} remoteTracks={[]} />)

    expect(screen.getByText('Esperando al profesor...')).toBeInTheDocument()
    // No phantom participant tile for the absent teacher
    expect(screen.queryByText('Profesor')).not.toBeInTheDocument()
  })

  it('shows a waiting state for the student slot in the teacher view when alone', () => {
    render(<VideoGrid isTeacher={true} localTrack={makeTrack({ isLocal: true })} remoteTracks={[]} />)

    expect(screen.getByText('Esperando al estudiante...')).toBeInTheDocument()
    expect(screen.queryByText('Estudiante')).not.toBeInTheDocument()
  })

  it('renders the remote teacher tile instead of the waiting state once connected', () => {
    render(
      <VideoGrid
        isTeacher={false}
        localTrack={makeTrack({ isLocal: true })}
        remoteTracks={[makeTrack({ name: 'Profe Ana', isTeacher: true })]}
      />
    )

    expect(screen.queryByText('Esperando al profesor...')).not.toBeInTheDocument()
    expect(screen.getByText('Profe Ana')).toBeInTheDocument()
  })

  it('shows a connecting state for the local slot before local tracks exist', () => {
    render(<VideoGrid isTeacher={false} remoteTracks={[]} />)

    expect(screen.getByText('Conectando tu cámara...')).toBeInTheDocument()
  })
})
