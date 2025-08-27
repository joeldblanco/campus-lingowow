import { Trophy, Star, Flame, ArrowRight, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface ActivityCompleteScreenProps {
  score: number
  totalPoints: number
  newTotalXP: number
  streak: number
  onContinue: () => void
}

export default function ActivityCompleteScreen({
  score,
  totalPoints,
  newTotalXP,
  streak,
  onContinue,
}: ActivityCompleteScreenProps) {
  // Calcular porcentaje de aciertos
  const percentage = Math.round((score / totalPoints) * 100)

  // Determinar mensaje basado en el porcentaje
  const getMessage = () => {
    if (percentage >= 90) return '¡Perfecto! Dominaste esta actividad.'
    if (percentage >= 70) return '¡Muy bien! Has dominado gran parte del contenido.'
    if (percentage >= 50) return 'Buen trabajo. Sigue practicando para mejorar.'
    return 'Continúa practicando para dominar este tema.'
  }

  // Estrellas ganadas (1-3)
  const getStars = () => {
    if (percentage >= 90) return 3
    if (percentage >= 70) return 2
    if (percentage >= 40) return 1
    return 0
  }

  const earnedStars = getStars()

  return (
    <div className="max-w-md mx-auto">
      <Card className="border shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-yellow-100 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <Trophy className="h-10 w-10 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">¡Actividad Completada!</CardTitle>
          <CardDescription>{getMessage()}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Estrellas ganadas */}
          <div className="flex justify-center space-x-4 py-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  i < earnedStars ? 'bg-yellow-100' : 'bg-gray-100'
                }`}
              >
                <Star
                  className={`h-8 w-8 ${i < earnedStars ? 'text-yellow-500' : 'text-gray-300'}`}
                />
              </div>
            ))}
          </div>

          {/* Puntos ganados */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Puntos ganados:</span>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500 mr-1" />
                <span className="font-bold">{score} XP</span>
              </div>
            </div>
            <Progress value={percentage} className="h-2" />
            <div className="flex justify-between mt-1 text-sm text-muted-foreground">
              <span>0</span>
              <span>{totalPoints} XP</span>
            </div>
          </div>

          {/* Experiencia total */}
          <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <Trophy className="h-6 w-6 text-green-500 mr-2" />
              <span className="font-medium">Experiencia total:</span>
            </div>
            <span className="font-bold">{newTotalXP} XP</span>
          </div>

          {/* Racha actual */}
          <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center">
              <Flame className="h-6 w-6 text-orange-500 mr-2" />
              <span className="font-medium">Racha actual:</span>
            </div>
            <span className="font-bold">{streak} días</span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" onClick={onContinue}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <Button variant="outline" className="w-full">
            <Share2 className="mr-2 h-4 w-4" />
            Compartir Progreso
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
