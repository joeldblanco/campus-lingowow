'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Calendar, AlertCircle } from 'lucide-react'

export function ScheduleRequirementAlert() {
  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Calendar className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">Configuración de Horario Requerida</AlertTitle>
      <AlertDescription className="text-blue-800">
        <div className="space-y-2 mt-2">
          <p>
            <strong>Importante:</strong> Después de completar tu compra, deberás seleccionar tu
            horario de clases para comenzar.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Podrás elegir entre los profesores disponibles</li>
            <li>Seleccionarás los días y horarios que mejor se adapten a ti</li>
            <li>El sistema calculará tus clases hasta el fin del período académico</li>
          </ul>
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-900">
              <strong>Nota:</strong> Si no configuras tu horario dentro de 7 días, tu inscripción
              quedará en estado pendiente y no podrás acceder a las clases hasta completar este
              paso.
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
