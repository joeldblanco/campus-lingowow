'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ActivityStep, ActivityWithContent } from '@/types/activity'
import { ArrowLeft, ArrowRight, Check, HelpCircle, Mic } from 'lucide-react'
import { useState } from 'react'

interface ActivityPreviewProps {
  activity: ActivityWithContent
}

export function ActivityPreview({ activity }: ActivityPreviewProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showHint, setShowHint] = useState(false)

  // Obtener los pasos de la actividad del contenido JSON
  const steps: ActivityStep[] = (activity.steps as ActivityStep[]) || []

  // Calcular el progreso basado en el paso actual
  const progress = Math.round((currentStep / (steps.length - 1)) * 100)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      setAnswered(false)
      setSelectedAnswer(null)
      setShowHint(false)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setAnswered(false)
      setSelectedAnswer(null)
      setShowHint(false)
    }
  }

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index)
    setAnswered(true)
  }

  // Renderizar un paso específico según su tipo
  const renderStep = (step: ActivityStep) => {
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
              {step.options?.map((option, index) => (
                <Button
                  key={index}
                  variant={
                    answered
                      ? index === step.correctAnswer
                        ? 'default'
                        : selectedAnswer === index
                          ? 'outline'
                          : 'outline'
                      : 'outline'
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
                  selectedAnswer === step.correctAnswer
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <p>{step.hint}</p>
              </div>
            )}

            {!answered && step.hint && (
              <div className="mt-4 text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setShowHint(!showHint)}>
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

            {step.transcript && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-muted-foreground">{step.transcript}</p>
                </CardContent>
              </Card>
            )}
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
                {answered ? 'Grabación simulada completa' : 'Haz clic para comenzar a grabar'}
              </p>
            </div>

            {answered && step.expectedTranscript && (
              <div className="mt-4 p-4 rounded-md bg-muted">
                <p className="font-medium mb-2">Transcripción esperada:</p>
                <p className="text-muted-foreground">{step.expectedTranscript}</p>
              </div>
            )}
          </div>
        )

      case 'completion':
        return (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-500" />
              </div>
            </div>

            <h3 className="text-2xl font-bold mb-2">¡Actividad Completada!</h3>
            <p className="text-lg mb-4">{step.content}</p>
          </div>
        )

      default:
        return <p>Tipo de paso no compatible</p>
    }
  }

  // Si no hay pasos, mostrar mensaje informativo
  if (!steps.length) {
    return (
      <div className="p-8 bg-muted text-center rounded-md">
        <p>Esta actividad no tiene contenido para mostrar.</p>
        <p className="text-sm text-muted-foreground mt-2">Edita la actividad para añadir pasos.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Vista previa: {activity.title}</h2>
          <span className="text-sm text-muted-foreground">
            Paso {currentStep + 1} de {steps.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="p-6">{steps[currentStep] && renderStep(steps[currentStep])}</div>

      <div className="p-4 border-t flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        <Button
          onClick={handleNext}
          disabled={
            currentStep === steps.length - 1 ||
            (steps[currentStep]?.type === 'question' && !answered) ||
            (steps[currentStep]?.type === 'recording' && !answered)
          }
        >
          Siguiente
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
