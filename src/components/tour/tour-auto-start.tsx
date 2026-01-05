'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import { useTour } from './tour-context'
import type { TourType } from './tour-types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Sparkles } from 'lucide-react'

export function TourAutoStart() {
  const { data: session } = useSession()
  const { startTour, hasCompletedTour, markTourAsCompleted } = useTour()
  const [showDialog, setShowDialog] = useState(false)
  const [tourType, setTourType] = useState<TourType | null>(null)

  useEffect(() => {
    if (!session?.user?.roles) return

    // Determine tour type based on user role
    let detectedTourType: TourType | null = null
    
    if (session.user.roles.includes(UserRole.TEACHER)) {
      detectedTourType = 'teacher'
    } else if (session.user.roles.includes(UserRole.STUDENT)) {
      detectedTourType = 'student'
    } else if (session.user.roles.includes(UserRole.GUEST)) {
      detectedTourType = 'guest'
    }

    if (detectedTourType && !hasCompletedTour(detectedTourType)) {
      setTourType(detectedTourType)
      // Small delay to ensure the page is fully loaded
      const timer = setTimeout(() => {
        setShowDialog(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [session, hasCompletedTour])

  const handleStartTour = () => {
    setShowDialog(false)
    if (tourType) {
      startTour(tourType)
    }
  }

  const handleSkipTour = () => {
    setShowDialog(false)
    if (tourType) {
      markTourAsCompleted(tourType)
    }
  }

  const getTourTitle = () => {
    switch (tourType) {
      case 'teacher':
        return '¡Bienvenido, Profesor!'
      case 'student':
        return '¡Bienvenido, Estudiante!'
      case 'guest':
        return '¡Bienvenido a Lingowow!'
      default:
        return '¡Bienvenido!'
    }
  }

  const getTourDescription = () => {
    switch (tourType) {
      case 'teacher':
        return '¿Te gustaría hacer un recorrido rápido por la plataforma? Te mostraremos cómo gestionar tus clases, ver tus ganancias y más.'
      case 'student':
        return '¿Te gustaría hacer un recorrido rápido por la plataforma? Te mostraremos cómo acceder a tus cursos, actividades y próximas clases.'
      case 'guest':
        return '¿Te gustaría hacer un recorrido rápido por la plataforma? Te mostraremos los cursos disponibles, recursos gratuitos y cómo inscribirte.'
      default:
        return '¿Te gustaría hacer un recorrido rápido por la plataforma?'
    }
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <AlertDialogTitle className="text-xl">{getTourTitle()}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            {getTourDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={handleSkipTour}>
            Saltar por ahora
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleStartTour} className="bg-blue-600 hover:bg-blue-700">
            Iniciar Tour
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
