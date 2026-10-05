import type { TourType } from './tour-types'

export function canAutoStartTour(tourType: TourType, pathname: string): boolean {
  return tourType !== 'student' || pathname === '/dashboard'
}
