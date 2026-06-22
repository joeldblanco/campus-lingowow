import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Calendar } from './calendar'

// Guards the react-day-picker v10 migration: the v8 classNames keys
// (caption/head_cell/day_*) and the IconLeft/IconRight components were
// removed, so a stale wrapper renders an unstyled / broken calendar.
describe('Calendar (react-day-picker v10)', () => {
  const month = new Date(2026, 5, 15) // June 2026

  it('renders a day grid for the given month', () => {
    const { getByText, container } = render(
      <Calendar mode="single" month={month} selected={month} />
    )
    // Day buttons render (nav + ~30 days).
    expect(container.querySelectorAll('button').length).toBeGreaterThan(7)
    // A specific day of the month is present.
    expect(getByText('15')).toBeTruthy()
  })

  it('marks the selected day', () => {
    const { container } = render(
      <Calendar mode="single" month={month} selected={month} />
    )
    expect(container.querySelector('[aria-selected="true"]')).not.toBeNull()
  })

  it('renders nav chevrons via the v10 Chevron component', () => {
    const { container } = render(<Calendar mode="single" month={month} />)
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2)
  })
})
