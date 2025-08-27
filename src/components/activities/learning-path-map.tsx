import { Check, Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface LearningPathMapProps {
  currentLevel: number
  maxLevel: number
}

export default function LearningPathMap({ currentLevel, maxLevel }: LearningPathMapProps) {
  const levels = Array.from({ length: maxLevel }, (_, i) => i + 1)

  // Nombres temáticos para los niveles
  const getLevelName = (level: number) => {
    const levelNames = [
      'Principiante',
      'Expresiones Básicas',
      'Conversación Casual',
      'Vida Cotidiana',
      'Viajes y Turismo',
      'Cultura y Tradiciones',
      'Negocios Básicos',
      'Discusión Académica',
      'Literatura y Arte',
      'Fluidez Avanzada',
    ]

    return levelNames[level - 1] || `Nivel ${level}`
  }

  return (
    <Card className="border shadow-sm">
      <CardContent className="pt-6">
        <h3 className="font-semibold text-lg mb-4">Tu Camino de Aprendizaje</h3>

        <div className="relative">
          {/* Línea de conexión */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0" />

          <div className="flex justify-between relative z-10">
            {levels.map((level) => {
              const isComplete = level < currentLevel
              const isCurrent = level === currentLevel
              const isLocked = level > currentLevel

              return (
                <div key={level} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center mb-2 transition-all',
                      isComplete
                        ? 'bg-green-500 text-white'
                        : isCurrent
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {isComplete && <Check className="h-6 w-6" />}
                    {isCurrent && <span className="font-bold">{level}</span>}
                    {isLocked && <Lock className="h-5 w-5" />}
                  </div>

                  <span
                    className={cn(
                      'text-xs font-medium text-center max-w-24 truncate',
                      isCurrent && 'text-blue-500 font-semibold'
                    )}
                  >
                    {getLevelName(level)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
