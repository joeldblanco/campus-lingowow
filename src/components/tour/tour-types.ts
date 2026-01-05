import type { Step } from 'react-joyride'

export type TourType = 'teacher' | 'student' | 'guest'

export interface TourStep extends Step {
  target: string
}

export interface TourState {
  run: boolean
  stepIndex: number
  tourType: TourType | null
}

export interface TourContextType {
  state: TourState
  startTour: (tourType: TourType) => void
  stopTour: () => void
  nextStep: () => void
  prevStep: () => void
  setStepIndex: (index: number) => void
  hasCompletedTour: (tourType: TourType) => boolean
  markTourAsCompleted: (tourType: TourType) => void
}

export const TOUR_STORAGE_KEY = 'lingowow_completed_tours'
