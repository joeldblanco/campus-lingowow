'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, HelpCircle, CheckCircle, AlertCircle } from 'lucide-react'
import { PlacementTestWithDetails, LanguageLevel } from '@/types/exam'
import { canUserTakePlacementTest } from '@/lib/actions/exams'
import { toast } from 'sonner'

interface PlacementTestListProps {
  tests: PlacementTestWithDetails[]
  userId: string
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  pt: '🇧🇷',
  it: '🇮🇹',
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'Inglés',
  es: 'Español',
  fr: 'Francés',
  de: 'Alemán',
  pt: 'Portugués',
  it: 'Italiano',
}

const LEVEL_COLORS: Record<LanguageLevel, string> = {
  A1: 'bg-green-100 text-green-700',
  A2: 'bg-lime-100 text-lime-700',
  B1: 'bg-yellow-100 text-yellow-700',
  B2: 'bg-orange-100 text-orange-700',
  C1: 'bg-red-100 text-red-700',
  C2: 'bg-purple-100 text-purple-700',
}

export function PlacementTestList({ tests, userId }: PlacementTestListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleStartTest = async (testId: string) => {
    setLoading(testId)
    try {
      const result = await canUserTakePlacementTest(testId, userId)
      
      if (!result.canTake) {
        toast.error(result.reason || 'No puedes tomar este test')
        return
      }

      router.push(`/placement-test/${testId}`)
    } catch (error) {
      console.error('Error checking eligibility:', error)
      toast.error('Error al verificar elegibilidad')
    } finally {
      setLoading(null)
    }
  }

  if (tests.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay tests disponibles</h3>
          <p className="text-muted-foreground">
            Actualmente no hay tests de clasificación disponibles. 
            Por favor, vuelve más tarde.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {tests.map((test) => (
        <Card key={test.id} className="flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{LANGUAGE_FLAGS[test.targetLanguage] || '🌐'}</span>
                <div>
                  <CardTitle className="text-lg">{test.title}</CardTitle>
                  <CardDescription>
                    {LANGUAGE_NAMES[test.targetLanguage] || test.targetLanguage}
                  </CardDescription>
                </div>
              </div>
              {test.hasAttempted && test.lastAttemptLevel && (
                <Badge className={LEVEL_COLORS[test.lastAttemptLevel]}>
                  Nivel {test.lastAttemptLevel}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground mb-4">
              {test.description}
            </p>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <HelpCircle className="h-4 w-4" />
                <span>{test.totalQuestions} preguntas</span>
              </div>
              {test.timeLimit && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{test.timeLimit} min</span>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter>
            {test.hasAttempted ? (
              <div className="flex items-center gap-2 w-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-muted-foreground flex-1">
                  Ya completaste este test
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/placement-test/${test.id}/results`)}
                >
                  Ver resultados
                </Button>
              </div>
            ) : (
              <Button 
                className="w-full" 
                onClick={() => handleStartTest(test.id)}
                disabled={loading === test.id}
              >
                {loading === test.id ? 'Verificando...' : 'Comenzar Test'}
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
