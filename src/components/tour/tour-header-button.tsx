'use client'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import { useTour } from './tour-context'
import type { TourType } from './tour-types'

export function TourHeaderButton() {
  const { data: session } = useSession()
  const { startTour } = useTour()

  const handleStartTour = () => {
    if (!session?.user?.roles) return

    let tourType: TourType = 'guest'
    
    if (session.user.roles.includes(UserRole.TEACHER)) {
      tourType = 'teacher'
    } else if (session.user.roles.includes(UserRole.STUDENT)) {
      tourType = 'student'
    } else if (session.user.roles.includes(UserRole.GUEST)) {
      tourType = 'guest'
    }

    startTour(tourType)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStartTour}
            className="h-9 w-9"
          >
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Iniciar tour guiado</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tour guiado</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
