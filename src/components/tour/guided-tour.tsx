'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
import type { CallBackProps } from 'react-joyride'
import { STATUS } from 'react-joyride'
import { useTour } from './tour-context'
import { getTourSteps } from './tour-steps'

const Joyride = dynamic(() => import('react-joyride'), { ssr: false })

const tourStyles = {
  options: {
    arrowColor: '#ffffff',
    backgroundColor: '#ffffff',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    primaryColor: '#3b82f6',
    spotlightShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
    textColor: '#1e293b',
    zIndex: 10000,
  },
  buttonNext: {
    backgroundColor: '#3b82f6',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    padding: '10px 20px',
  },
  buttonBack: {
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 500,
    marginRight: '10px',
  },
  buttonClose: {
    color: '#94a3b8',
    height: '14px',
    width: '14px',
  },
  buttonSkip: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  tooltip: {
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    padding: '20px',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  tooltipTitle: {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '10px',
  },
  tooltipContent: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#475569',
  },
  spotlight: {
    borderRadius: '12px',
  },
}

export function GuidedTour() {
  const { state, stopTour, setStepIndex, markTourAsCompleted } = useTour()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, index, type } = data
      const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]

      if (finishedStatuses.includes(status as string)) {
        if (state.tourType) {
          markTourAsCompleted(state.tourType)
        }
        stopTour()
      }

      if (type === 'step:after') {
        setStepIndex(index + 1)
      }
    },
    [state.tourType, stopTour, setStepIndex, markTourAsCompleted]
  )

  if (!mounted || !state.run || !state.tourType) {
    return null
  }

  const steps = getTourSteps(state.tourType)

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton={false}
      run={state.run}
      scrollToFirstStep
      showProgress
      showSkipButton
      stepIndex={state.stepIndex}
      steps={steps}
      styles={tourStyles}
      locale={{
        back: 'Anterior',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        open: 'Abrir',
        skip: 'Saltar tour',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  )
}
