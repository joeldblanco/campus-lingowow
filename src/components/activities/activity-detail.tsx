'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getActivity } from '@/lib/actions/activity'
import { ActivityStep, ActivityWithContent } from '@/types/activity'
import { ArrowLeft, Award, Calendar, Check, Clock, HelpCircle, Mic, Star } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ActivityDetailProps {
  activityId: string
  onBack: () => void
  onComplete: (score: number, totalPoints: number) => void
}

export default function ActivityDetail({ activityId, onBack, onComplete }: ActivityDetailProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [score, setScore] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [activity, setActivity] = useState<ActivityWithContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [activitySteps, setActivitySteps] = useState<ActivityStep[]>([])

  // Obtener los datos de la actividad desde la base de datos
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const activityData = await getActivity(activityId)
        if (activityData) {
          setActivity(activityData)
          if (!(typeof activityData.steps === 'string')) return

          setActivitySteps(JSON.parse(activityData.steps))
        }
      } catch (error) {
        console.error('Error fetching activity:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [activityId])

  useEffect(() => {
    if (activity) {
      setProgress(Math.round((currentStep / (activitySteps.length - 1)) * 100))
    }
  }, [activity, activitySteps.length, currentStep])

  const handleNext = () => {
    if (activity && currentStep < activitySteps.length - 1) {
      setCurrentStep((prev) => prev + 1)
      setAnswered(false)
      setShowHint(false)
    } else if (activity) {
      onComplete(score, activity.points)
    }
  }

  const handleAnswer = (index: number) => {
    if (!activity) return

    const currentQuestion = activitySteps[currentStep]
    if (currentQuestion.type === 'question') {
      setAnswered(true)
      if (index === currentQuestion.correctAnswer) {
        setScore((prev) => prev + 5)
      }
    }
  }

  const shouldShowContinueButton = () => {
    if (!activity) return false

    const currentStepType = activitySteps[currentStep].type
    return (
      answered ||
      currentStepType === 'instruction' ||
      currentStepType === 'completion' ||
      currentStepType === 'audio'
    )
  }

  const renderStep = () => {
    if (loading) {
      return <div className="py-8 text-center">Cargando actividad...</div>
    }

    if (!activity) {
      return <div className="py-8 text-center">No se encontró la actividad</div>
    }

    const step = activitySteps[currentStep]

    switch (step.type) {
      case 'instruction':
        return (
          <div className="py-8 text-center">
            <p className="text-lg">{step.content}</p>
          </div>
        )

      case 'question':
        return (
          <div className="py-4">
            <h3 className="text-lg font-medium mb-4">{step.content}</h3>

            <div className="grid gap-3">
              {step.options &&
                step.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={
                      answered ? (index === step.correctAnswer ? 'default' : 'outline') : 'outline'
                    }
                    className={`justify-start py-6 h-auto text-left ${
                      answered && index === step.correctAnswer
                        ? 'bg-green-100 border-green-500 hover:bg-green-100'
                        : answered
                          ? 'opacity-50'
                          : ''
                    }`}
                    onClick={() => !answered && handleAnswer(index)}
                    disabled={answered}
                  >
                    <div className="flex items-center w-full">
                      <div className="mr-3 h-6 w-6 rounded-full border flex items-center justify-center">
                        {answered && index === step.correctAnswer && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      {option}
                    </div>
                  </Button>
                ))}
            </div>

            {answered && (
              <div
                className={`mt-4 p-4 rounded-md ${
                  step.correctAnswer !== undefined
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <p>{step.hint}</p>
              </div>
            )}

            {!answered && (
              <div className="mt-4 text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
                        <HelpCircle className="h-4 w-4 mr-1" />
                        Pista
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        {showHint ? step.hint : 'Haz clic para mostrar una pista'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        )

      case 'audio':
        return (
          <div className="py-4">
            <h3 className="text-lg font-medium mb-4">{step.content}</h3>

            <div className="bg-slate-100 rounded-lg p-4 mb-4">
              <div className="h-12 flex items-center justify-center">
                <div className="bg-primary text-white h-10 w-10 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground">{step.transcript}</p>
              </CardContent>
            </Card>
          </div>
        )

      case 'recording':
        return (
          <div className="py-4">
            <h3 className="text-lg font-medium mb-4">{step.content}</h3>

            <div className="bg-slate-100 rounded-lg p-6 flex flex-col items-center justify-center">
              <Button
                size="lg"
                className="rounded-full h-16 w-16"
                onClick={() => setAnswered(true)}
              >
                <Mic className="h-6 w-6" />
              </Button>

              <p className="mt-4 text-sm text-muted-foreground">
                {answered ? 'Grabación completa' : 'Haz clic para comenzar a grabar'}
              </p>
            </div>
          </div>
        )

      case 'completion':
        return (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
                <Star className="h-12 w-12 text-yellow-500" />
              </div>
            </div>

            <h3 className="text-2xl font-bold mb-2">¡Excelente trabajo!</h3>
            <p className="text-lg mb-6">{step.content}</p>

            <div className="flex items-center justify-center gap-6 mb-8">
              <div className="flex items-center">
                <Award className="h-6 w-6 text-yellow-500 mr-2" />
                <span className="font-bold">
                  {score} / {activity.points} XP
                </span>
              </div>

              <div className="flex items-center">
                <Clock className="h-6 w-6 text-blue-500 mr-2" />
                <span>{activity.duration} min</span>
              </div>

              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-green-500 mr-2" />
                <span>Hoy</span>
              </div>
            </div>
          </div>
        )

      default:
        return <p>Paso no reconocido</p>
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </div>
        <div className="text-center py-8">Cargando actividad...</div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </div>
        <div className="text-center py-8">No se encontró la actividad</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>

        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">{activity.title}</h2>

      <div className="bg-white rounded-lg border shadow-sm p-6">{renderStep()}</div>

      <div className="mt-6 flex justify-end">
        {shouldShowContinueButton() && (
          <Button onClick={handleNext}>
            {currentStep < activitySteps.length - 1 ? 'Continuar' : 'Finalizar'}
          </Button>
        )}
      </div>
    </div>
  )
}
