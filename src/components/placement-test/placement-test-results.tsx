'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Trophy, Clock, Target, BookOpen, ArrowRight, Share2 } from 'lucide-react'
import { PlacementTestResult, RecommendedCourse, LanguageLevel } from '@/types/exam'
import { toast } from 'sonner'

interface PlacementTestResultsProps {
  result: PlacementTestResult
  recommendedCourses: RecommendedCourse[]
}

const LEVEL_DESCRIPTIONS: Record<LanguageLevel, { title: string; description: string }> = {
  A1: {
    title: 'Principiante',
    description: 'Puedes comprender y utilizar expresiones cotidianas de uso muy frecuente.',
  },
  A2: {
    title: 'Elemental',
    description: 'Puedes comunicarte en tareas simples y cotidianas que requieren intercambios sencillos.',
  },
  B1: {
    title: 'Intermedio',
    description: 'Puedes desenvolverte en la mayoría de situaciones que pueden surgir durante un viaje.',
  },
  B2: {
    title: 'Intermedio Alto',
    description: 'Puedes relacionarte con hablantes nativos con un grado suficiente de fluidez.',
  },
  C1: {
    title: 'Avanzado',
    description: 'Puedes expresarte de forma fluida y espontánea sin muestras muy evidentes de esfuerzo.',
  },
  C2: {
    title: 'Maestría',
    description: 'Puedes comprender con facilidad prácticamente todo lo que oyes o lees.',
  },
}

const LEVEL_COLORS: Record<LanguageLevel, string> = {
  A1: 'from-green-500 to-green-600',
  A2: 'from-lime-500 to-lime-600',
  B1: 'from-yellow-500 to-yellow-600',
  B2: 'from-orange-500 to-orange-600',
  C1: 'from-red-500 to-red-600',
  C2: 'from-purple-500 to-purple-600',
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'Inglés',
  es: 'Español',
  fr: 'Francés',
  de: 'Alemán',
  pt: 'Portugués',
  it: 'Italiano',
}

export function PlacementTestResults({ result, recommendedCourses }: PlacementTestResultsProps) {
  const router = useRouter()
  const levelInfo = LEVEL_DESCRIPTIONS[result.recommendedLevel]
  const levelColor = LEVEL_COLORS[result.recommendedLevel]

  const handleShare = async () => {
    const text = `¡Acabo de completar mi test de clasificación de ${LANGUAGE_NAMES[result.targetLanguage] || result.targetLanguage}! Mi nivel es ${result.recommendedLevel} (${levelInfo.title}). 🎉`
    
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        await navigator.clipboard.writeText(text)
        toast.success('Copiado al portapapeles')
      }
    } else {
      await navigator.clipboard.writeText(text)
      toast.success('Copiado al portapapeles')
    }
  }

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <div className={`bg-gradient-to-r ${levelColor} p-8 text-white text-center`}>
          <Trophy className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">¡Test Completado!</h1>
          <p className="text-white/80">
            Has completado el test de clasificación de {LANGUAGE_NAMES[result.targetLanguage] || result.targetLanguage}
          </p>
        </div>
        
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-primary/10 to-primary/20 mb-4">
              <span className="text-4xl font-bold text-primary">{result.recommendedLevel}</span>
            </div>
            <h2 className="text-2xl font-bold">{levelInfo.title}</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {levelInfo.description}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{Math.round(result.score)}%</div>
              <div className="text-sm text-muted-foreground">Puntaje</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{result.timeSpent} min</div>
              <div className="text-sm text-muted-foreground">Tiempo</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50 col-span-2 md:col-span-1">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{result.recommendedLevel}</div>
              <div className="text-sm text-muted-foreground">Nivel Recomendado</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Progreso hacia el siguiente nivel</span>
              <span>{Math.round(result.score)}%</span>
            </div>
            <Progress value={result.score} className="h-2" />
          </div>
        </CardContent>

        <CardFooter className="flex gap-4 p-6 bg-muted/30">
          <Button variant="outline" onClick={handleShare} className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Compartir
          </Button>
          <Button onClick={() => router.push('/placement-test')} className="flex-1">
            Volver a Tests
          </Button>
        </CardFooter>
      </Card>

      {recommendedCourses.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Cursos Recomendados para Ti</h2>
          <p className="text-muted-foreground mb-6">
            Basándonos en tu nivel {result.recommendedLevel}, te recomendamos estos cursos:
          </p>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendedCourses.map((course) => (
              <Card key={course.id} className="flex flex-col">
                {course.image && (
                  <div className="aspect-video relative overflow-hidden rounded-t-lg">
                    <Image 
                      src={course.image} 
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{course.level}</Badge>
                    <Badge variant="secondary">{course.language}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{course.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <CardDescription className="line-clamp-2">
                    {course.description}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push(`/courses/${course.id}`)}
                  >
                    Ver Curso
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {recommendedCourses.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Próximamente más cursos</h3>
            <p className="text-muted-foreground">
              Estamos preparando cursos perfectos para tu nivel {result.recommendedLevel}.
              ¡Mantente atento!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
