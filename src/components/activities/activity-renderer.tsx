'use client'

import { useState, useCallback, useMemo } from 'react'
import { Check, X, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

// Types for activity questions
interface ScrambledWord {
  id: string
  text: string
  originalIndex: number
}

interface ActivityQuestion {
  id: string
  type: 'multiple_choice' | 'fill_blanks' | 'matching_pairs' | 'sentence_unscramble'
  order: number
  questionText?: string
  options?: { id: string; text: string; isCorrect: boolean }[]
  sentenceWithBlanks?: string
  blanks?: { id: string; answer: string }[]
  pairs?: { id: string; left: string; right: string }[]
  correctSentence?: string
  scrambledWords?: ScrambledWord[]
}

interface ActivityRendererProps {
  activity: {
    id: string
    title: string
    description?: string
    questions: ActivityQuestion[]
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    tags?: string[]
    points?: number
  }
  onComplete?: (score: number, totalQuestions: number) => void
  onClose?: () => void
}

interface QuestionAnswer {
  questionId: string
  answer: string | ScrambledWord[] | Record<string, string>
  isCorrect?: boolean
}

export function ActivityRenderer({ activity, onComplete, onClose }: ActivityRendererProps) {
  const [currentStep, setCurrentStep] = useState(0) // 0 = intro, 1-n = questions, n+1 = results
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [score, setScore] = useState(0)

  const totalSteps = activity.questions.length + 2 // intro + questions + results
  const isIntro = currentStep === 0
  const isResults = currentStep === totalSteps - 1
  const currentQuestionIndex = currentStep - 1
  const currentQuestion = activity.questions[currentQuestionIndex]

  const handleAnswerChange = useCallback((questionId: string, answer: QuestionAnswer['answer']) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { questionId, answer }
    }))
  }, [])

  const checkAnswer = (question: ActivityQuestion, answer: QuestionAnswer['answer']): boolean => {
    switch (question.type) {
      case 'multiple_choice':
        const correctOption = question.options?.find(opt => opt.isCorrect)
        return answer === correctOption?.id
      
      case 'fill_blanks':
        if (!question.blanks || typeof answer !== 'object') return false
        const blanksAnswer = answer as Record<string, string>
        return question.blanks.every(blank => 
          blanksAnswer[blank.id]?.toLowerCase().trim() === blank.answer.toLowerCase().trim()
        )
      
      case 'matching_pairs':
        if (!question.pairs || typeof answer !== 'object') return false
        const pairsAnswer = answer as Record<string, string>
        return question.pairs.every(pair => pairsAnswer[pair.left] === pair.right)
      
      case 'sentence_unscramble':
        if (!question.correctSentence || !Array.isArray(answer)) return false
        // Convert ScrambledWord[] to string by joining text properties
        const scrambledAnswer = answer as ScrambledWord[]
        const answerText = scrambledAnswer.map(w => w.text).join(' ')
        return answerText === question.correctSentence
      
      default:
        return false
    }
  }

  const handleCheckAnswer = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!currentQuestion) return
    
    // Create particle burst effect at button center position at click time
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    createParticleBurst(centerX, centerY)
    
    const answer = answers[currentQuestion.id]
    if (answer) {
      const isCorrect = checkAnswer(currentQuestion, answer.answer)
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: { ...answer, isCorrect }
      }))
      if (isCorrect) {
        setScore(prev => prev + 1)
      }
    } else {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: { questionId: currentQuestion.id, answer: '', isCorrect: false }
      }))
    }
    setShowFeedback(true)
  }

  const handleNext = () => {
    setShowFeedback(false)
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    }
    if (currentStep === totalSteps - 2) {
      // Moving to results
      onComplete?.(score, activity.questions.length)
    }
  }

  const handleSkip = () => {
    // Mark the current question as incorrect and move to next
    if (currentQuestion) {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: { questionId: currentQuestion.id, answer: '', isCorrect: false }
      }))
    }
    setShowFeedback(false)
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    }
    if (currentStep === totalSteps - 2) {
      // Moving to results
      onComplete?.(score, activity.questions.length)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setShowFeedback(false)
    setScore(0)
    setCurrentStep(0)
  }

  const handleStart = () => {
    setCurrentStep(1)
  }

  // Particle Burst Effect
  const createParticleBurst = (clientX: number, clientY: number) => {
    // Usar coordenadas exactas del clic en lugar de la posición del botón
    const centerX = clientX
    const centerY = clientY
    
    const blueColor = '#3B82F6' // Solo azul brillante
    
    const particleCount = 10 + Math.floor(Math.random() * 3) // 10-12 particles
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2 // 0 to 360 degrees
      const distance = 80 + Math.random() * 120 // 80-200px (más largo)
      const color = blueColor
      const size = 3 + Math.random() * 4 // 3-7px (más grande)
      
      const particle = document.createElement('div')
      particle.className = 'particle'
      particle.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transform-origin: center;
        transition: all 0.8s ease-out;
        opacity: 1;
      `
      
      // Calculate end position
      const endX = Math.cos(angle) * distance
      const endY = Math.sin(angle) * distance
      
      // Set CSS variables for animation
      particle.style.setProperty('--tx', `${endX}px`)
      particle.style.setProperty('--ty', `${endY}px`)
      
      document.body.appendChild(particle)
      
      // Trigger animation
      requestAnimationFrame(() => {
        particle.style.opacity = '0'
        particle.style.transform = `translate(${endX}px, ${endY}px) scale(0)`
      })
      
      // Remove particle after animation
      setTimeout(() => {
        particle.remove()
      }, 800)
    }
  }

  const progress = ((currentStep) / (totalSteps - 1)) * 100

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced: 'bg-red-100 text-red-700'
  }

  const difficultyLabels = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado'
  }

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const hasAnswered = currentAnswer && (
    (typeof currentAnswer.answer === 'string' && currentAnswer.answer !== '') ||
    (Array.isArray(currentAnswer.answer) && currentAnswer.answer.length > 0) ||
    (typeof currentAnswer.answer === 'object' && Object.keys(currentAnswer.answer).length > 0)
  )

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 no-select">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-[700px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
                {activity.title}
              </h1>
              <div className="flex items-center gap-2">
                {activity.difficulty && (
                  <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', difficultyColors[activity.difficulty])}>
                    {difficultyLabels[activity.difficulty]}
                  </Badge>
                )}
                {!isIntro && !isResults && (
                  <span className="text-xs text-slate-500">
                    Pregunta {currentQuestionIndex + 1} de {activity.questions.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2">
        <div className="max-w-[700px] mx-auto">
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[700px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Intro Screen */}
        {isIntro && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 text-center">
            <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 text-primary mx-auto mb-6">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {activity.title}
            </h2>
            {activity.description && (
              <p className="text-slate-500 mb-4">{activity.description}</p>
            )}
            <div className="flex items-center justify-center gap-4 text-sm text-slate-500 mb-6">
              <span>{activity.questions.length} preguntas</span>
              {activity.difficulty && (
                <Badge variant="secondary" className={cn('text-xs', difficultyColors[activity.difficulty])}>
                  {difficultyLabels[activity.difficulty]}
                </Badge>
              )}
              {activity.points && <span>{activity.points} puntos</span>}
            </div>
            {activity.tags && activity.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                {activity.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs bg-primary/10 text-primary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <Button size="lg" onClick={handleStart} className="px-8">
              Comenzar Actividad
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Question Screen */}
        {!isIntro && !isResults && currentQuestion && (
          <div className="space-y-6">
            <QuestionRenderer
              question={currentQuestion}
              index={currentQuestionIndex}
              answer={currentAnswer}
              onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
              submitted={showFeedback}
            />

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleSkip}
                className={cn(
                  "text-slate-600 hover:text-slate-700 transition-all duration-300 transform",
                  showFeedback && "scale-0 opacity-0 pointer-events-none"
                )}
                disabled={showFeedback}
              >
                Saltar
              </Button>

              {!showFeedback ? (
                <Button
                  onClick={handleCheckAnswer}
                  disabled={!hasAnswered}
                  className="relative overflow-visible transition-all duration-300"
                >
                  <span className="relative z-10">Verificar Respuesta</span>
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  {currentStep === totalSteps - 2 ? 'Ver Resultados' : 'Siguiente Pregunta'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Results Screen */}
        {isResults && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 text-center">
            <div className={cn(
              "flex items-center justify-center size-20 rounded-full mx-auto mb-6",
              score >= activity.questions.length * 0.7 ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
            )}>
              {score >= activity.questions.length * 0.7 ? (
                <Check className="h-10 w-10" />
              ) : (
                <RotateCcw className="h-10 w-10" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {score >= activity.questions.length * 0.7 ? '¡Excelente Trabajo!' : '¡Sigue Practicando!'}
            </h2>
            <div className="text-4xl font-bold text-primary mb-2">
              {Math.round((score / activity.questions.length) * 100)}%
            </div>
            <p className="text-slate-500 mb-6">
              Obtuviste {score} de {activity.questions.length} respuestas correctas
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={handleRetry} variant="outline" size="lg">
                <RotateCcw className="mr-2 h-4 w-4" />
                Intentar de Nuevo
              </Button>
              {onClose && (
                <Button onClick={onClose} size="lg">
                  Finalizar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Question Renderer Component
interface QuestionRendererProps {
  question: ActivityQuestion
  index: number
  answer?: QuestionAnswer
  onAnswerChange: (answer: QuestionAnswer['answer']) => void
  submitted: boolean
}

function QuestionRenderer({ question, index, answer, onAnswerChange, submitted }: QuestionRendererProps) {
  const questionTypeLabels: Record<string, string> = {
    multiple_choice: 'Opción Múltiple',
    fill_blanks: 'Completar Espacios',
    matching_pairs: 'Relacionar Pares',
    sentence_unscramble: 'Ordenar Oración'
  }

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-xl border shadow-sm transition-colors no-select",
      submitted && answer?.isCorrect && "border-green-300 dark:border-green-800",
      submitted && answer?.isCorrect === false && "border-red-300 dark:border-red-800",
      !submitted && "border-slate-200 dark:border-slate-800"
    )}>
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center size-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold">
              {index + 1}
            </span>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              {questionTypeLabels[question.type]}
            </h3>
          </div>
          {submitted && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
              answer?.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {answer?.isCorrect ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Correcto
                </>
              ) : (
                <>
                  <X className="h-3.5 w-3.5" />
                  Incorrecto
                </>
              )}
            </div>
          )}
        </div>

        {/* Question Content */}
        {question.type === 'multiple_choice' && (
          <MultipleChoiceQuestion
            question={question}
            answer={answer?.answer as string}
            onAnswerChange={onAnswerChange}
            submitted={submitted}
          />
        )}
        {question.type === 'fill_blanks' && (
          <FillBlanksQuestion
            question={question}
            answer={answer?.answer as Record<string, string>}
            onAnswerChange={onAnswerChange}
            submitted={submitted}
          />
        )}
        {question.type === 'matching_pairs' && (
          <MatchingPairsQuestion
            question={question}
            answer={answer?.answer as Record<string, string>}
            onAnswerChange={onAnswerChange}
            submitted={submitted}
          />
        )}
        {question.type === 'sentence_unscramble' && (
          <SentenceUnscrambleQuestion
            question={question}
            answer={(answer?.answer as unknown) as ScrambledWord[]}
            onAnswerChange={onAnswerChange}
            submitted={submitted}
          />
        )}
      </div>
    </div>
  )
}

// Multiple Choice Question
function MultipleChoiceQuestion({
  question,
  answer,
  onAnswerChange,
  submitted
}: {
  question: ActivityQuestion
  answer?: string
  onAnswerChange: (answer: string) => void
  submitted: boolean
}) {
  const options = question.options || []

  return (
    <div className="space-y-4 no-select">
      {question.questionText && (
        <div className="relative">
          <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <HelpCircle className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-700 dark:text-slate-300">{question.questionText}</p>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {options.map((option) => {
          const isSelected = answer === option.id
          const showCorrect = submitted && option.isCorrect
          const showIncorrect = submitted && isSelected && !option.isCorrect

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => !submitted && onAnswerChange(option.id)}
              disabled={submitted}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                !submitted && isSelected && "border-primary bg-primary/5",
                !submitted && !isSelected && "border-slate-200 dark:border-slate-700 hover:border-slate-300",
                showCorrect && "border-green-500 bg-green-50 dark:bg-green-900/20",
                showIncorrect && "border-red-500 bg-red-50 dark:bg-red-900/20",
                submitted && "cursor-default"
              )}
            >
              <div className={cn(
                "size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                isSelected && !submitted && "border-primary bg-primary",
                !isSelected && !submitted && "border-slate-300",
                showCorrect && "border-green-500 bg-green-500",
                showIncorrect && "border-red-500 bg-red-500"
              )}>
                {(isSelected || showCorrect) && (
                  <div className="size-2 rounded-full bg-white" />
                )}
              </div>
              <span className={cn(
                "text-sm flex-1",
                showCorrect && "text-green-700 dark:text-green-300 font-medium",
                showIncorrect && "text-red-700 dark:text-red-300"
              )}>
                {option.text}
              </span>
              {showCorrect && <Check className="h-4 w-4 text-green-500" />}
              {showIncorrect && <X className="h-4 w-4 text-red-500" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Fill in the Blanks Question
function FillBlanksQuestion({
  question,
  answer = {},
  onAnswerChange,
  submitted
}: {
  question: ActivityQuestion
  answer?: Record<string, string>
  onAnswerChange: (answer: Record<string, string>) => void
  submitted: boolean
}) {
  const sentence = question.sentenceWithBlanks || ''
  const blanks = question.blanks || []
  const parts = sentence.split(/\[([^\]]+)\]/g)

  const handleBlankChange = (blankId: string, value: string) => {
    onAnswerChange({ ...answer, [blankId]: value })
  }

  let blankIndex = 0

  return (
    <div className="space-y-4">
      <div className="text-base text-slate-800 dark:text-slate-200 leading-relaxed flex flex-wrap items-center gap-1 no-select">
        {parts.map((part, index) => {
          if (index % 2 === 1) {
            const blank = blanks[blankIndex]
            blankIndex++
            if (!blank) return null

            const userAnswer = answer[blank.id] || ''
            const isCorrect = submitted && userAnswer.toLowerCase().trim() === blank.answer.toLowerCase().trim()
            const isIncorrect = submitted && !isCorrect

            return (
              <span key={index} className="inline-flex items-center gap-1">
                <Input
                  value={userAnswer}
                  onChange={(e) => !submitted && handleBlankChange(blank.id, e.target.value)}
                  disabled={submitted}
                  placeholder="..."
                  className={cn(
                    "w-24 h-8 text-sm text-center px-2 selectable",
                    isCorrect && "border-green-500 bg-green-50 text-green-700",
                    isIncorrect && "border-red-500 bg-red-50 text-red-700"
                  )}
                />
                {submitted && isIncorrect && (
                  <span className="text-xs text-green-600 font-medium">({blank.answer})</span>
                )}
              </span>
            )
          }
          return <span key={index}>{part}</span>
        })}
      </div>
    </div>
  )
}

// Matching Pairs Question
function MatchingPairsQuestion({
  question,
  answer = {},
  onAnswerChange,
  submitted
}: {
  question: ActivityQuestion
  answer?: Record<string, string>
  onAnswerChange: (answer: Record<string, string>) => void
  submitted: boolean
}) {
  const pairs = question.pairs || []
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)

  // Shuffle right items for display - usar useMemo para evitar re-shuffle en cada render
  const rightItems = useMemo(() => 
    [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pairs.length] // Solo re-shuffle cuando cambia el número de pares
  )

  const handleLeftClick = (left: string) => {
    if (submitted) return
    setSelectedLeft(left)
  }

  const handleRightClick = (right: string) => {
    if (submitted || !selectedLeft) return
    onAnswerChange({ ...answer, [selectedLeft]: right })
    setSelectedLeft(null)
  }

  return (
    <div className="space-y-4 no-select">
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 mb-2">Elementos</div>
          {pairs.map((pair) => {
            const isMatched = answer[pair.left]
            const isSelected = selectedLeft === pair.left
            const isCorrect = submitted && answer[pair.left] === pair.right
            const isIncorrect = submitted && isMatched && answer[pair.left] !== pair.right

            return (
              <button
                key={pair.left}
                type="button"
                onClick={() => handleLeftClick(pair.left)}
                disabled={submitted}
                className={cn(
                  "w-full p-3 rounded-lg border text-sm text-left transition-all",
                  isSelected && "border-primary bg-primary/5",
                  isMatched && !submitted && "border-blue-300 bg-blue-50",
                  !isSelected && !isMatched && "border-slate-200 hover:border-slate-300",
                  isCorrect && "border-green-500 bg-green-50",
                  isIncorrect && "border-red-500 bg-red-50"
                )}
              >
                {pair.left}
                {isMatched && (
                  <span className="text-xs text-slate-400 ml-2">→ {answer[pair.left]}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 mb-2">Relaciones</div>
          {rightItems.map((right) => {
            const isUsed = Object.values(answer).includes(right)

            return (
              <button
                key={right}
                type="button"
                onClick={() => handleRightClick(right)}
                disabled={submitted || isUsed}
                className={cn(
                  "w-full p-3 rounded-lg border text-sm text-left transition-all",
                  selectedLeft && !isUsed && "border-primary/50 hover:border-primary hover:bg-primary/5",
                  isUsed && "border-slate-200 bg-slate-50 text-slate-400",
                  !selectedLeft && !isUsed && "border-slate-200"
                )}
              >
                {right}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Sentence Unscramble Question
function SentenceUnscrambleQuestion({
  question,
  answer = [],
  onAnswerChange,
  submitted
}: {
  question: ActivityQuestion
  answer?: ScrambledWord[]
  onAnswerChange: (answer: ScrambledWord[]) => void
  submitted: boolean
}) {
  const scrambledWords = question.scrambledWords || []
  const correctSentence = question.correctSentence || ''

  // Filter available words by checking if their ID is already used in the answer
  const availableWords = scrambledWords.filter(
    wordObj => !answer.some(usedWord => usedWord.id === wordObj.id)
  )

  const handleWordClick = (wordObj: ScrambledWord) => {
    if (submitted) return
    onAnswerChange([...answer, wordObj])
  }

  const handleRemoveWord = (index: number) => {
    if (submitted) return
    const newAnswer = [...answer]
    newAnswer.splice(index, 1)
    onAnswerChange(newAnswer)
  }

  // Check if answer is correct by comparing the text of words
  const answerText = answer.map(w => w.text).join(' ')
  const isCorrect = submitted && answerText === correctSentence

  return (
    <div className="space-y-4 no-select">
      {/* Answer Area */}
      <div className={cn(
        "min-h-[60px] p-4 rounded-lg border-2 border-dashed flex flex-wrap gap-2",
        answer.length === 0 && "items-center justify-center",
        isCorrect && "border-green-300 bg-green-50",
        submitted && !isCorrect && "border-red-300 bg-red-50",
        !submitted && "border-slate-300"
      )}>
        {answer.length === 0 ? (
          <span className="text-sm text-slate-400">Haz clic en las palabras de abajo para construir tu oración</span>
        ) : (
          answer.map((wordObj, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleRemoveWord(idx)}
              disabled={submitted}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                !submitted && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
                submitted && "bg-slate-100 text-slate-500 border-slate-200"
              )}
            >
              {wordObj.text}
            </button>
          ))
        )}
      </div>

      {/* Available Words */}
      <div className="flex flex-wrap gap-2">
        {availableWords.map((wordObj, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleWordClick(wordObj)}
            disabled={submitted}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {wordObj.text}
          </button>
        ))}
      </div>

      {/* Show correct answer if wrong */}
      {submitted && !isCorrect && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Respuesta correcta:</p>
          <p className="text-sm text-green-700 dark:text-green-300">{correctSentence}</p>
        </div>
      )}
    </div>
  )
}
