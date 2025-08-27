import { Trophy, Flame, Star, Calendar } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'

interface UserProgressProps {
  level: number
  streak: number
  experience: number
  nextLevelXP: number
  currentDay: number
}

export default function UserProgress({
  level,
  streak,
  experience,
  nextLevelXP,
  currentDay,
}: UserProgressProps) {
  const progress = Math.round((experience / nextLevelXP) * 100)

  // Array que representa los 7 días de la semana
  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <Card className="border shadow-sm">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <div>
                <h3 className="font-semibold">Nivel {level}</h3>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  {experience}/{nextLevelXP} XP para el siguiente nivel
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              <div>
                <h3 className="font-semibold">Racha: {streak} días</h3>
                <p className="text-sm text-muted-foreground">
                  ¡Sigue practicando para mantener tu racha!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-purple-500" />
              <p className="font-medium">{experience} XP acumulados</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Tu progreso semanal</h3>
            </div>

            <div className="flex justify-between">
              {weekDays.map((day, index) => {
                const isDayComplete = index < currentDay
                const isToday = index === currentDay

                return (
                  <div key={day} className="flex flex-col items-center">
                    <div className="text-sm font-medium mb-2">{day}</div>
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : isDayComplete
                            ? 'bg-green-100'
                            : 'bg-gray-100'
                      }`}
                    >
                      {isDayComplete && <Flame className="h-6 w-6 text-green-500" />}
                      {isToday && (
                        <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
