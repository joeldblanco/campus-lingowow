import { BookOpen, Headphones, Mic, PenTool, Clock, Award, Lock, Check } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ActivityProps {
  activity: {
    id: string
    title: string
    type: 'reading' | 'listening' | 'speaking' | 'writing' | 'vocabulary'
    points: number
    duration: number
    level: number
    completed: boolean
    locked: boolean
  }
  onComplete: () => void
}

export default function ActivityCard({ activity, onComplete }: ActivityProps) {
  const { title, type, points, duration, completed, locked } = activity

  const getIcon = () => {
    switch (type) {
      case 'reading':
        return <BookOpen className="h-5 w-5 text-green-500" />
      case 'listening':
        return <Headphones className="h-5 w-5 text-blue-500" />
      case 'speaking':
        return <Mic className="h-5 w-5 text-purple-500" />
      case 'writing':
        return <PenTool className="h-5 w-5 text-orange-500" />
      case 'vocabulary':
        return <BookOpen className="h-5 w-5 text-yellow-500" />
      default:
        return <BookOpen className="h-5 w-5" />
    }
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'reading':
        return 'Lectura'
      case 'listening':
        return 'Escucha'
      case 'speaking':
        return 'Habla'
      case 'writing':
        return 'Escritura'
      case 'vocabulary':
        return 'Vocabulario'
      default:
        return type
    }
  }

  return (
    <Card
      className={`border h-full transition-all ${
        completed ? 'bg-green-50 border-green-200' : locked ? 'bg-gray-50 opacity-75' : ''
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="flex items-center gap-1">
            {getIcon()}
            <span>{getTypeLabel()}</span>
          </Badge>

          <div className="flex items-center text-yellow-500">
            <Award className="h-5 w-5 mr-1" />
            <span className="font-medium">{points} XP</span>
          </div>
        </div>
        <CardTitle className="text-lg mt-2">{title}</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-1" />
          <span>{duration} minutos</span>
        </div>
      </CardContent>

      <CardFooter>
        {locked ? (
          <Button className="w-full" variant="outline" disabled>
            <Lock className="h-4 w-4 mr-2" />
            Bloqueado
          </Button>
        ) : completed ? (
          <Button className="w-full" variant="outline" disabled>
            <Check className="h-4 w-4 mr-2" />
            Completado
          </Button>
        ) : (
          <Button className="w-full" onClick={onComplete}>
            Comenzar
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
