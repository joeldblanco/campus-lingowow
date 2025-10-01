'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { CreateExamSectionData } from '@/types/exam'
import { Clock, FileText, Award, RotateCcw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { gradeExam, ExamGradingResult } from '@/lib/utils/exam-grading'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { AudioPlayer } from './audio-player'

interface ExamPreviewInteractiveProps {
  title: string
  description: string
  sections: CreateExamSectionData[]
  timeLimit: number
  totalPoints: number
  passingScore?: number
}

export function ExamPreviewInteractive({
  title,
  description,
  sections,
  timeLimit,
  totalPoints,
  passingScore = 70,
}: ExamPreviewInteractiveProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [gradingResult, setGradingResult] = useState<ExamGradingResult | null>(null)
  const [showResults, setShowResults] = useState(false)

  const handleAnswerChange = (questionKey: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionKey]: value }))
    // Limpiar resultados si el usuario cambia respuestas
    if (showResults) {
      setShowResults(false)
      setGradingResult(null)
    }
  }

  const handleReset = () => {
    setAnswers({})
    setShowResults(false)
    setGradingResult(null)
  }

  const handleSubmit = () => {
    const result = gradeExam(sections, answers, passingScore)
    setGradingResult(result)
    setShowResults(true)
  }

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Vista Previa</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6 pr-4">
            {/* Exam Header */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold">{title || 'Sin título'}</h1>
              {description && (
                <p className="text-muted-foreground">{description}</p>
              )}

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{timeLimit} minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{totalQuestions} preguntas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>{totalPoints} puntos</span>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reiniciar respuestas
              </Button>
            </div>

            <Separator />

            {/* Results Summary */}
            {showResults && gradingResult && (
              <Alert className={gradingResult.passed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                <div className="flex items-start gap-3">
                  {gradingResult.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-2">
                    <AlertTitle className="text-lg font-bold">
                      {gradingResult.passed ? '¡Examen Aprobado!' : 'Examen No Aprobado'}
                    </AlertTitle>
                    <AlertDescription className="space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-semibold">Calificación</p>
                          <p className="text-2xl font-bold">{gradingResult.percentage.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="font-semibold">Puntos</p>
                          <p className="text-lg">{gradingResult.earnedPoints} / {gradingResult.totalPoints}</p>
                        </div>
                        <div>
                          <p className="font-semibold">Correctas</p>
                          <p className="text-lg text-green-600">{gradingResult.correctAnswers}</p>
                        </div>
                        <div>
                          <p className="font-semibold">Incorrectas</p>
                          <p className="text-lg text-red-600">{gradingResult.incorrectAnswers}</p>
                        </div>
                      </div>
                      <Progress value={gradingResult.percentage} className="h-2" />
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            {/* Sections Preview */}
            {sections.map((section, sIndex) => {
              // Find if any question in this section has SECTION_TOP audio
              const sectionAudio = section.questions.find(q => q.audioUrl && q.audioPosition === 'SECTION_TOP')
              
              return (
                <Card key={sIndex}>
                  <CardHeader>
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    {section.description && (
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    )}
                    
                    {/* Section-level Audio */}
                    {sectionAudio && (
                      <div className="mt-3">
                        <AudioPlayer
                          audioUrl={sectionAudio.audioUrl!}
                          maxPlays={sectionAudio.maxAudioPlays}
                          autoplay={sectionAudio.audioAutoplay}
                          pausable={sectionAudio.audioPausable}
                        />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {section.questions.map((question, qIndex) => {
                    const questionKey = `${sIndex}-${qIndex}`
                    const questionResult = showResults 
                      ? gradingResult?.questionResults.find(r => r.questionKey === questionKey)
                      : null
                    
                    return (
                      <div key={qIndex} className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-1">
                            {qIndex + 1}
                          </Badge>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <p className="font-medium">{question.question}</p>
                                {showResults && questionResult && question.type !== 'ESSAY' && (
                                  questionResult.isCorrect ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                  )
                                )}
                              </div>
                              <Badge variant="secondary">{question.points} pts</Badge>
                            </div>

                            {/* Audio Player - BEFORE_QUESTION */}
                            {question.audioUrl && question.audioPosition === 'BEFORE_QUESTION' && (
                              <div className="mt-3">
                                <AudioPlayer
                                  audioUrl={question.audioUrl}
                                  maxPlays={question.maxAudioPlays}
                                  autoplay={question.audioAutoplay}
                                  pausable={question.audioPausable}
                                />
                              </div>
                            )}

                            {/* Question Type Specific Preview */}
                            <div className="mt-3">
                              {/* Audio Player - AFTER_QUESTION */}
                              {question.audioUrl && question.audioPosition === 'AFTER_QUESTION' && (
                                <AudioPlayer
                                  audioUrl={question.audioUrl}
                                  maxPlays={question.maxAudioPlays}
                                  autoplay={question.audioAutoplay}
                                  pausable={question.audioPausable}
                                />
                              )}

                              {/* Audio Player - BEFORE_OPTIONS */}
                              {question.audioUrl && question.audioPosition === 'BEFORE_OPTIONS' && (
                                <div className="mb-3">
                                  <AudioPlayer
                                    audioUrl={question.audioUrl}
                                    maxPlays={question.maxAudioPlays}
                                    autoplay={question.audioAutoplay}
                                    pausable={question.audioPausable}
                                  />
                                </div>
                              )}

                              {question.type === 'MULTIPLE_CHOICE' && question.options && (
                                <RadioGroup
                                  value={answers[questionKey] || ''}
                                  onValueChange={(value) => handleAnswerChange(questionKey, value)}
                                >
                                  <div className="space-y-2">
                                    {question.options.map((option, oIndex) => (
                                      <div
                                        key={oIndex}
                                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                                      >
                                        <RadioGroupItem value={option} id={`${questionKey}-${oIndex}`} />
                                        <Label htmlFor={`${questionKey}-${oIndex}`} className="flex-1 cursor-pointer">
                                          {option}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </RadioGroup>
                              )}

                              {question.type === 'TRUE_FALSE' && (
                                <RadioGroup
                                  value={answers[questionKey] || ''}
                                  onValueChange={(value) => handleAnswerChange(questionKey, value)}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                      <RadioGroupItem value="Verdadero" id={`${questionKey}-true`} />
                                      <Label htmlFor={`${questionKey}-true`} className="flex-1 cursor-pointer">
                                        Verdadero
                                      </Label>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                      <RadioGroupItem value="Falso" id={`${questionKey}-false`} />
                                      <Label htmlFor={`${questionKey}-false`} className="flex-1 cursor-pointer">
                                        Falso
                                      </Label>
                                    </div>
                                  </div>
                                </RadioGroup>
                              )}

                              {question.type === 'SHORT_ANSWER' && (
                                <Input
                                  value={answers[questionKey] || ''}
                                  onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
                                  placeholder="Escribe tu respuesta aquí..."
                                  className="mt-2"
                                />
                              )}

                              {question.type === 'ESSAY' && (
                                <Textarea
                                  value={answers[questionKey] || ''}
                                  onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
                                  placeholder="Escribe tu ensayo aquí..."
                                  className="mt-2 min-h-[150px]"
                                />
                              )}

                              {question.type === 'FILL_BLANK' && (
                                <Input
                                  value={answers[questionKey] || ''}
                                  onChange={(e) => handleAnswerChange(questionKey, e.target.value)}
                                  placeholder="Completa el espacio en blanco..."
                                  className="mt-2"
                                />
                              )}
                            </div>

                            {/* Show correct answer and explanation after grading */}
                            {showResults && questionResult && (
                              <div className="mt-3 space-y-2">
                                {question.type !== 'ESSAY' && !questionResult.isCorrect && (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-900">
                                      <strong>Respuesta correcta:</strong>{' '}
                                      {Array.isArray(questionResult.correctAnswer)
                                        ? questionResult.correctAnswer.join(', ')
                                        : questionResult.correctAnswer}
                                    </p>
                                  </div>
                                )}
                                {questionResult.pointsEarned > 0 && questionResult.pointsEarned < questionResult.maxPoints && (
                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm text-yellow-900">
                                      <strong>Crédito parcial:</strong> {questionResult.pointsEarned} / {questionResult.maxPoints} puntos
                                    </p>
                                  </div>
                                )}
                                {question.type === 'ESSAY' && (
                                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                      <p className="text-sm text-blue-900">
                                        Los ensayos requieren corrección manual por un profesor
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {question.explanation && (showResults || true) && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-900">
                                  <strong>Explicación:</strong> {question.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {qIndex < section.questions.length - 1 && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    )
                    })}
                  </CardContent>
                </Card>
              )
            })}

            {sections.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay preguntas para mostrar</p>
              </div>
            )}

            {/* Submit Button */}
            {totalQuestions > 0 && (
              <div className="flex justify-center gap-3 pt-4">
                {!showResults ? (
                  <Button size="lg" onClick={handleSubmit}>
                    Enviar y Corregir (Vista previa)
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Intentar de nuevo
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
