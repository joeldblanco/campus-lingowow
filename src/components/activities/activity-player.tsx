'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, Volume2, Mic, ArrowRight } from 'lucide-react'

interface ActivityStep {
  type: 'instruction' | 'question' | 'audio' | 'recording' | 'completion'
  content: string
  options?: string[]
  correctAnswer?: number
  hint?: string
  audioUrl?: string
  transcript?: string
  expectedTranscript?: string
}

interface ActivityPlayerProps {
  activity: {
    id: string
    title: string
    description: string
    steps: { steps: ActivityStep[] }
    points: number
  }
  onComplete: (score: number) => void
  onClose: () => void
}

export default function ActivityPlayer({ activity, onComplete, onClose }: ActivityPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)

  const resetActivity = () => {
    setCurrentStep(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setIsCorrect(false)
    setScore(0)
  }

  const steps = activity.steps.steps
  const step = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex)
  }

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return

    const correct = selectedAnswer === step.correctAnswer
    setIsCorrect(correct)
    setShowResult(true)

    if (correct) {
      setScore(prev => prev + 1)
    }

  }

  const handleNextStep = () => {
    setSelectedAnswer(null)
    setShowResult(false)
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Actividad completada - calcular puntaje final
      const totalQuestions = steps.filter(s => s.type === 'question').length
      const finalScore = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
      onComplete(finalScore)
    }
  }


  const renderStep = () => {
    switch (step.type) {
      case 'instruction':
        return (
          <div className="text-center space-y-4">
            <div className="text-lg text-muted-foreground">
              {step.content}
            </div>
            <Button onClick={handleNextStep} className="mt-4">
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )

      case 'question':
        return (
          <div className="space-y-4">
            <div className="text-lg font-medium mb-4">
              {step.content}
            </div>
            
            <div className="grid gap-2">
              {step.options?.map((option, index) => (
                <Button
                  key={index}
                  variant={selectedAnswer === index ? "default" : "outline"}
                  className="justify-start text-left h-auto p-4"
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                >
                  <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </Button>
              ))}
            </div>

            {step.hint && selectedAnswer !== null && !showResult && (
              <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                💡 Pista: {step.hint}
              </div>
            )}

            {showResult && (
              <div className={`p-4 rounded-lg flex items-center gap-2 ${
                isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {isCorrect ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    ¡Correcto! Bien hecho.
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    Incorrecto. La respuesta correcta es: {step.options?.[step.correctAnswer || 0]}
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end mt-4">
              {!showResult ? (
                <Button 
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                >
                  Responder
                </Button>
              ) : (
                <Button onClick={handleNextStep}>
                  {currentStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )

      case 'audio':
        return (
          <div className="text-center space-y-4">
            <div className="text-lg mb-4">
              {step.content}
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <Button variant="outline" size="lg" className="mb-4">
                <Volume2 className="mr-2 h-5 w-5" />
                Reproducir Audio
              </Button>
              
              {step.transcript && (
                <div className="text-sm text-muted-foreground">
                  Transcripción: &quot;{step.transcript}&quot;
                </div>
              )}
            </div>
            
            <Button onClick={handleNextStep}>
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )

      case 'recording':
        return (
          <div className="text-center space-y-4">
            <div className="text-lg mb-4">
              {step.content}
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <Button variant="outline" size="lg" className="mb-4">
                <Mic className="mr-2 h-5 w-5" />
                Grabar Respuesta
              </Button>
              
              {step.expectedTranscript && (
                <div className="text-sm text-muted-foreground">
                  Ejemplo: &quot;{step.expectedTranscript}&quot;
                </div>
              )}
            </div>
            
            <Button onClick={handleNextStep}>
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )

      case 'completion':
        const totalQuestions = steps.filter(s => s.type === 'question').length
        const finalPercentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
        const passed = finalPercentage >= 60
        
        return (
          <div className="text-center space-y-4">
            <div className="text-2xl">{passed ? '🎉' : '😔'}</div>
            <div className={`text-lg font-medium ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {passed ? step.content : '¡Sigue practicando! Necesitas al menos 60% para completar la actividad.'}
            </div>
            <div className="text-sm text-muted-foreground">
              Puntuación: {finalPercentage}% ({score}/{totalQuestions} correctas)
            </div>
            <div className="flex gap-2 justify-center">
              {!passed && (
                <Button onClick={resetActivity} variant="outline">
                  Intentar de nuevo
                </Button>
              )}
              <Button onClick={handleNextStep} size="lg">
                {passed ? 'Finalizar Actividad' : 'Salir'}
              </Button>
            </div>
          </div>
        )

      default:
        return <div>Tipo de paso no reconocido</div>
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{activity.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {activity.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{activity.points} XP</Badge>
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Paso {currentStep + 1} de {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  )
}
