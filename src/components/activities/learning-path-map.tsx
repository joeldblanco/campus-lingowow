import { Check, Lock, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface LevelSummary {
  level: number
  totalActivities: number
  completedActivities: number
  levelName: string
  hasActivities: boolean
  isComplete: boolean
  progress: number
}

interface LearningPathMapProps {
  currentLevel: number
  maxLevel: number
  levelsSummary: LevelSummary[]
}

export default function LearningPathMap({ currentLevel, levelsSummary }: LearningPathMapProps) {
  // Nombres temáticos para los niveles como fallback
  const getFallbackLevelName = (level: number) => {
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
            {levelsSummary.map((levelData) => {
              const { level, totalActivities, completedActivities, hasActivities, isComplete } = levelData
              const isCurrent = level === currentLevel
              const isLocked = level > currentLevel && !hasActivities
              const isPartiallyComplete = completedActivities > 0 && completedActivities < totalActivities

              return (
                <div key={level} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center mb-2 transition-all relative',
                      isComplete
                        ? 'bg-green-500 text-white'
                        : isCurrent
                          ? 'bg-blue-500 text-white'
                          : isPartiallyComplete
                            ? 'bg-yellow-500 text-white'
                            : hasActivities
                              ? 'bg-gray-300 text-gray-700'
                              : 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {isComplete && <Check className="h-6 w-6" />}
                    {isCurrent && <span className="font-bold">{level}</span>}
                    {isLocked && <Lock className="h-5 w-5" />}
                    {isPartiallyComplete && <BookOpen className="h-5 w-5" />}
                    {!isComplete && !isCurrent && !isLocked && !isPartiallyComplete && hasActivities && (
                      <span className="font-bold text-sm">{level}</span>
                    )}
                  </div>

                  {/* Progress indicator for partially completed levels */}
                  {isPartiallyComplete && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400 transition-all duration-300"
                          style={{ width: `${(completedActivities / totalActivities) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <span
                    className={cn(
                      'text-xs font-medium text-center max-w-24 truncate mt-1',
                      isCurrent && 'text-blue-500 font-semibold',
                      isComplete && 'text-green-600 font-semibold'
                    )}
                  >
                    {getFallbackLevelName(level)}
                  </span>
                  
                  {/* Activity count */}
                  {hasActivities && (
                    <span className="text-xs text-gray-500 mt-1">
                      {completedActivities}/{totalActivities}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
