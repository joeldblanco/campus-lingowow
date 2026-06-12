import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RecordingCard } from './recording-card'

const baseBooking = {
  id: 'booking-1',
  day: '2026-06-01',
  timeSlot: '10:00-11:00',
  student: { id: 's1', name: 'Ana', lastName: 'Lopez', image: null },
  teacher: { id: 't1', name: 'Bob', lastName: 'Smith', image: null },
}

describe('RecordingCard', () => {
  it('renders course title and level when enrollment exists', () => {
    render(
      <RecordingCard
        recording={{
          id: 'rec-1',
          bookingId: 'booking-1',
          status: 'READY',
          duration: 120,
          startedAt: null,
          endedAt: null,
          booking: {
            ...baseBooking,
            enrollment: {
              course: { id: 'c1', title: 'Inglés A1', language: 'en', level: 'A1' },
            },
          },
        }}
      />
    )

    expect(screen.getByText('Inglés A1')).toBeInTheDocument()
    expect(screen.getByText('A1')).toBeInTheDocument()
  })

  it('renders a fallback without crashing when enrollment is null (orphaned/trial booking)', () => {
    render(
      <RecordingCard
        recording={{
          id: 'rec-2',
          bookingId: 'booking-1',
          status: 'READY',
          duration: null,
          startedAt: null,
          endedAt: null,
          booking: {
            ...baseBooking,
            enrollment: null,
          },
        }}
      />
    )

    expect(screen.getByText('Clase sin curso')).toBeInTheDocument()
  })
})
