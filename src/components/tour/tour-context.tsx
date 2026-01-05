'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { TourContextType, TourState, TourType } from './tour-types'
import { TOUR_STORAGE_KEY } from './tour-types'

const initialState: TourState = {
  run: false,
  stepIndex: 0,
  tourType: null,
}

const TourContext = createContext<TourContextType | undefined>(undefined)

export function TourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TourState>(initialState)

  const getCompletedTours = useCallback((): string[] => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }, [])

  const hasCompletedTour = useCallback(
    (tourType: TourType): boolean => {
      const completed = getCompletedTours()
      return completed.includes(tourType)
    },
    [getCompletedTours]
  )

  const markTourAsCompleted = useCallback(
    (tourType: TourType) => {
      if (typeof window === 'undefined') return
      try {
        const completed = getCompletedTours()
        if (!completed.includes(tourType)) {
          completed.push(tourType)
          localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed))
        }
      } catch {
        // Silently fail if localStorage is not available
      }
    },
    [getCompletedTours]
  )

  const startTour = useCallback((tourType: TourType) => {
    setState({
      run: true,
      stepIndex: 0,
      tourType,
    })
  }, [])

  const stopTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      run: false,
    }))
  }, [])

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stepIndex: prev.stepIndex + 1,
    }))
  }, [])

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stepIndex: Math.max(0, prev.stepIndex - 1),
    }))
  }, [])

  const setStepIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      stepIndex: index,
    }))
  }, [])

  return (
    <TourContext.Provider
      value={{
        state,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        setStepIndex,
        hasCompletedTour,
        markTourAsCompleted,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return context
}
