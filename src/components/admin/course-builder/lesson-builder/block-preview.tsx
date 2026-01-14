import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  AssignmentBlock,
  AudioBlock,
  Block,
  EmbedBlock,
  FileBlock,
  ImageBlock,
  QuizBlock,
  TextBlock,
  VideoBlock,
  TabGroupBlock,
  LayoutBlock,
  GrammarBlock,
  VocabularyBlock,
  FillBlanksBlock,
  MatchBlock,
  TrueFalseBlock,
  EssayBlock,
  RecordingBlock,
  TitleBlock,
  TabItemBlock,
  StructuredContentBlock,
  GrammarVisualizerBlock,
  ShortAnswerBlock,
  MultiSelectBlock,
  TeacherNotesBlock,
  MultipleChoiceBlock,
  OrderingBlock,
  DragDropBlock,
} from '@/types/course-builder'
import {
  Download,
  FileText,
  HelpCircle,
  Link,
  Image as LucideImage,
  Music,
  Play,
  Video,
  Type,
  Book,
  Library,
  Mic,
  Pause,
  Shuffle,
  CheckCircle2,
  FileSignature,
  Sparkles,
  Edit3,
  MessageSquare,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { EssayAIGrading as EssayAIGradingButton } from '@/components/lessons/essay-ai-grading'
import { useClassroomSync } from '@/components/classroom/use-classroom-sync'

interface BlockPreviewProps {
  block: Block
  isTeacher?: boolean
  isClassroom?: boolean // When true, enables interactive block synchronization in classroom
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BlockPreview({ block, isTeacher, isClassroom }: BlockPreviewProps) {
  // Teacher notes are only visible to teachers
  if (block.type === 'teacher_notes' && !isTeacher) {
    return null
  }

  const renderBlockContent = () => {
    switch (block.type) {
      case 'title':
        return <TitleBlockPreview block={block as TitleBlock} />
      case 'text':
        return <TextBlockPreview block={block as TextBlock} />
      case 'video':
        return <VideoBlockPreview block={block as VideoBlock} />
      case 'image':
        return <ImageBlockPreview block={block as ImageBlock} />
      case 'audio':
        return <AudioBlockPreview block={block as AudioBlock} />
      case 'quiz':
        return <QuizBlockPreview block={block as QuizBlock} />
      case 'assignment':
        return <AssignmentBlockPreview block={block as AssignmentBlock} />
      case 'file':
        return <FileBlockPreview block={block as FileBlock} />
      case 'embed':
        return <EmbedBlockPreview block={block as EmbedBlock} />
      case 'tab_group':
        return <TabGroupBlockPreview block={block as TabGroupBlock} />
      case 'layout':
        return <LayoutBlockPreview block={block as LayoutBlock} />
      case 'grammar':
        return <GrammarBlockPreview block={block as GrammarBlock} />
      case 'vocabulary':
        return <VocabularyBlockPreview block={block as VocabularyBlock} />
      case 'fill_blanks':
        return <FillBlanksBlockPreview block={block as FillBlanksBlock} />
      case 'match':
        return <MatchBlockPreview block={block as MatchBlock} />
      case 'true_false':
        return <TrueFalseBlockPreview block={block as TrueFalseBlock} />
      case 'essay':
        return <EssayBlockPreview block={block as EssayBlock} />
      case 'short_answer':
        return <ShortAnswerBlockPreview block={block as ShortAnswerBlock} />
      case 'multi_select':
        return <MultiSelectBlockPreview block={block as MultiSelectBlock} />
      case 'multiple_choice':
        return <MultipleChoiceBlockPreview block={block as MultipleChoiceBlock} />
      case 'ordering':
        return <OrderingBlockPreview block={block as OrderingBlock} />
      case 'drag_drop':
        return <DragDropBlockPreview block={block as DragDropBlock} />
      case 'recording':
        return <RecordingBlockPreview block={block as RecordingBlock} />
      case 'structured-content':
        return <StructuredContentBlockPreview block={block as StructuredContentBlock} />
      case 'grammar-visualizer':
        return <GrammarVisualizerBlockPreview block={block as GrammarVisualizerBlock} />
      case 'teacher_notes':
        return <TeacherNotesBlockPreview block={block as TeacherNotesBlock} />
      default:
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
            Tipo de bloque no soportado: {block.type}
          </div>
        )
    }
  }

  if (block.type === 'file') {
    return renderBlockContent()
  }

  return (
    <div className="p-6">{renderBlockContent()}</div>
  )
}

function TitleBlockPreview({ block }: { block: TitleBlock }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <Type className="h-5 w-5" />
        <span>Título</span>
      </div>
      <div className="w-full py-2 mb-4 border-b">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
          {block.title || 'Encabezado'}
        </h2>
      </div>
    </div>
  )
}

// Text Block Preview
function TextBlockPreview({ block }: { block: TextBlock }) {
  const content = block.content || ''

  if (!content) {
    return (
      <div className="text-muted-foreground italic p-4 bg-muted/20 rounded border border-dashed flex items-center justify-center gap-2">
        <FileText className="h-4 w-4" />
        <span>Bloque de texto vacío</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <FileText className="h-5 w-5" />
        <span>Texto</span>
      </div>
      <div className="prose prose-sm max-w-none text-foreground">
        {content.includes('<') ? (
          <div
            dangerouslySetInnerHTML={{ __html: content }}
            className="leading-relaxed"
          />
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        )}
      </div>
    </div>
  )
}

// Video Block Preview
function VideoBlockPreview({ block }: { block: VideoBlock }) {
  // Extract YouTube video ID for thumbnail
  const getYouTubeThumbnail = (url: string) => {
    if (!url) return null
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null
  }

  const thumbnail = block.url ? getYouTubeThumbnail(block.url) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <Video className="h-5 w-5" />
        <span>Video</span>
      </div>

      {block.title && (
        <div>
          <h3 className="text-xl font-bold">{block.title}</h3>
        </div>
      )}

      {!block.url ? (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Video no configurado</p>
        </div>
      ) : (
        <>
          <div className="relative group">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={block.title || 'Video thumbnail'}
                  className="w-full h-full object-cover"
                  width={800}
                  height={450}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <Play className="h-12 w-12 text-white" />
            </div>
          </div>
          {block.duration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Video className="h-4 w-4" />
              <span>{block.duration} minutos</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Image Block Preview
function ImageBlockPreview({ block }: { block: ImageBlock }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <LucideImage className="h-5 w-5" />
        <span>Imagen</span>
      </div>

      {!block.url ? (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <LucideImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Imagen no configurada</p>
        </div>
      ) : (
        <>
          <div className="relative group">
            <Image
              src={block.url}
              alt={block.alt || ''}
              className="w-full rounded-lg shadow-sm"
              width={800}
              height={600}
            />
          </div>
          {block.caption && (
            <p className="text-sm text-muted-foreground text-center italic">{block.caption}</p>
          )}
        </>
      )}
    </div>
  )
}

// Audio Block Preview
// Audio Block Preview
function AudioBlockPreview({ block }: { block: AudioBlock }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [replayCount, setReplayCount] = useState(0)
  const [waveform] = useState(() => Array.from({ length: 32 }, () => Math.random() * 0.7 + 0.3)) // Random heights
  const audioRef = useRef<HTMLAudioElement>(null)

  const maxReplays = block.maxReplays || 0
  const canPlay = maxReplays === 0 || replayCount < maxReplays

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        if (!canPlay) return
        audioRef.current.play()
      }
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const curr = audioRef.current.currentTime
      const dur = audioRef.current.duration
      setCurrentTime(curr)
      setProgress((curr / dur) * 100)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handlePlayStart = () => {
    setIsPlaying(true)
    // Increment replay count if starting from beginning (approx)
    if (audioRef.current && audioRef.current.currentTime < 0.5) {
      setReplayCount(prev => prev + 1)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <Mic className="h-5 w-5" />
        <span>Pronunciación</span>
      </div>

      {block.title && (
        <div>
          <h3 className="text-xl font-bold">{block.title}</h3>
        </div>
      )}

      {!block.url ? (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Audio no configurado</p>
        </div>
      ) : (
        <>
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-6">
              <audio
                ref={audioRef}
                src={block.url}
                className="hidden"
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={handlePlayStart}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              />

              <button
                onClick={togglePlay}
                disabled={!isPlaying && !canPlay}
                className={cn(
                  "h-14 w-14 flex items-center justify-center rounded-full transition-all shadow-md shrink-0",
                  isPlaying
                    ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105"
                    : (!canPlay
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-blue-900 text-white hover:bg-blue-800 hover:scale-105")
                )}
              >
                {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
              </button>

              <div className="flex-1 space-y-2">
                {/* Waveform Visualization */}
                <div
                  className="h-12 flex items-center justify-between gap-0.5 cursor-pointer"
                  onClick={(e) => {
                    if (!canPlay && !isPlaying) return; // Prevent seeking if locked
                    if (audioRef.current && duration) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = e.clientX - rect.left
                      const pct = Math.max(0, Math.min(1, x / rect.width))
                      audioRef.current.currentTime = pct * duration
                    }
                  }}
                >
                  {waveform.map((height, i) => {
                    const barPct = (i / waveform.length) * 100
                    const isPlayed = progress > barPct
                    return (
                      <div
                        key={i}
                        className={cn(
                          "w-1 rounded-full transition-colors duration-200",
                          isPlayed ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                        style={{
                          height: `${height * 100}%`,
                          minHeight: '20%'
                        }}
                      />
                    )
                  })}
                </div>

                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span className="flex items-center gap-2">
                    {maxReplays > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider",
                        canPlay ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {replayCount} / {maxReplays} Usos
                      </span>
                    )}
                    <span>{formatTime(duration || (block.duration ? block.duration : 0))}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          {block.duration && (
            <div className="hidden text-sm text-muted-foreground">
              {/* Hidden fallback duration display if needed */}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Quiz Block Preview
function QuizBlockPreview({ block }: { block: QuizBlock }) {
  const [hasStarted, setHasStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({}) // questionId -> answer
  const [showResults, setShowResults] = useState(false)
  
  // Get classroom sync if available
  const classroomSync = useClassroomSync()
  
  // Get remote navigation state for teachers to follow student's progress
  const remoteNav = classroomSync.getRemoteNavigation(block.id)

  const questionCount = block.questions?.length || 0
  const currentQuestion = block.questions?.[currentQuestionIndex]
  
  // Check if this is a teacher in classroom mode
  const isTeacherInClassroom = classroomSync.isInClassroom && classroomSync.isTeacher
  
  // For teachers in classroom: follow student's navigation and answers (when available)
  const isTeacherViewing = isTeacherInClassroom && remoteNav
  const displayQuestionIndex = isTeacherViewing ? remoteNav.currentStep : currentQuestionIndex
  const displayHasStarted = isTeacherViewing ? remoteNav.hasStarted : hasStarted
  const displayShowResults = isTeacherViewing ? remoteNav.isCompleted : showResults
  const displayCurrentQuestion = block.questions?.[displayQuestionIndex]
  // Use remote answers for teacher, local answers for student
  const displayAnswers = isTeacherViewing && remoteNav.currentAnswers ? remoteNav.currentAnswers : answers

  const handleStart = () => {
    // Teachers in classroom mode cannot start the quiz
    if (isTeacherInClassroom) return
    
    setHasStarted(true)
    setCurrentQuestionIndex(0)
    setAnswers({})
    setShowResults(false)
    
    // Sync navigation state to teacher (with empty answers)
    if (classroomSync.canInteract) {
      classroomSync.syncBlockNavigation(block.id, 0, questionCount, true, false, {})
    }
  }

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion) return
    // Teachers in classroom mode cannot interact
    if (isTeacherInClassroom) return
    
    const newAnswers = { ...answers, [currentQuestion.id]: answer }
    setAnswers(newAnswers)
    
    // Sync answer to teacher in real-time
    if (classroomSync.canInteract) {
      classroomSync.syncBlockNavigation(block.id, currentQuestionIndex, questionCount, true, false, newAnswers)
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < (block.questions?.length || 0) - 1) {
      const newIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(newIndex)
      
      // Sync navigation state to teacher (include current answers)
      if (classroomSync.canInteract) {
        classroomSync.syncBlockNavigation(block.id, newIndex, questionCount, true, false, answers)
      }
    } else {
      // Calculate score and sync to teacher
      const { score, totalPoints } = calculateScoreInternal()
      const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
      const passed = !block.passingScore || percentage >= block.passingScore
      
      // Sync result to teacher in classroom mode (only students)
      if (classroomSync.canInteract) {
        classroomSync.sendBlockResponse(block.id, 'quiz', {
          answers,
          score,
          totalPoints,
          percentage,
        }, passed, score)
        
        // Mark as completed (include final answers)
        classroomSync.syncBlockNavigation(block.id, currentQuestionIndex, questionCount, true, true, answers)
      }
      
      setShowResults(true)
    }
  }
  
  const calculateScoreInternal = () => {
    let score = 0
    let totalPoints = 0
    block.questions?.forEach(q => {
      totalPoints += q.points || 0
      const userAnswer = answers[q.id]
      if (userAnswer === q.correctAnswer) {
        score += q.points || 0
      }
    })
    return { score, totalPoints }
  }

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(newIndex)
      
      // Sync navigation state to teacher (include current answers)
      if (classroomSync.canInteract) {
        classroomSync.syncBlockNavigation(block.id, newIndex, questionCount, true, false, answers)
      }
    }
  }

  const calculateScore = () => {
    let score = 0
    let totalPoints = 0
    block.questions?.forEach(q => {
      totalPoints += q.points || 0
      const userAnswer = answers[q.id]
      // Simple exact match check. For arrays (multiple correct answers), logic might differ, 
      // but typically single correct answer for radio, or array for checkbox. 
      // Assuming string comparison for now.
      if (userAnswer === q.correctAnswer) {
        score += q.points || 0
      }
    })
    return { score, totalPoints }
  }

  // Not started yet - show intro
  if (!displayHasStarted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <HelpCircle className="h-5 w-5" />
          <span>Quiz</span>
        </div>
        {block.title && (
          <h3 className="text-xl font-bold">{block.title}</h3>
        )}

        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">{questionCount}</p>
                <p className="text-sm text-muted-foreground">
                  {questionCount === 1 ? 'Pregunta' : 'Preguntas'}
                </p>
              </div>
              {block.passingScore && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{block.passingScore}%</p>
                  <p className="text-xs text-muted-foreground">Puntaje mínimo</p>
                </div>
              )}
            </div>

            {questionCount > 0 && (
              <div className="space-y-2 pt-4 border-t border-primary/20">
                <p className="text-sm font-medium">Contenido:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {block.questions?.slice(0, 3).map(q => (
                    <li key={q.id} className="truncate">{q.question}</li>
                  ))}
                </ul>
                {questionCount > 3 && (
                  <p className="text-xs text-muted-foreground italic pl-4">
                    ... y {questionCount - 3} preguntas más
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          {isTeacherInClassroom ? (
            <p className="text-sm text-muted-foreground italic">
              Esperando a que el estudiante comience el quiz...
            </p>
          ) : (
            <Button onClick={handleStart} disabled={questionCount === 0}>
              <Play className="h-4 w-4 mr-2" />
              Comenzar Quiz
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Results View
  if (displayShowResults) {
    const { score, totalPoints } = calculateScore()
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
    const passed = !block.passingScore || percentage >= block.passingScore
    const correctCount = Object.keys(answers).filter(qid => {
      const q = block.questions?.find(que => que.id === qid)
      return q && answers[qid] === q.correctAnswer
    }).length

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="space-y-2 text-center">
          <h3 className="text-2xl font-bold">Resumen del Quiz</h3>
          <p className="text-muted-foreground">Has completado el cuestionario</p>
        </div>

        <div className="flex justify-center">
          <div className={cn(
            "p-8 rounded-full h-32 w-32 flex flex-col items-center justify-center border-4",
            passed ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-500 text-red-700"
          )}>
            <span className="text-3xl font-bold">{percentage}%</span>
            <span className="text-xs font-semibold uppercase mt-1">{passed ? 'Aprobado' : 'Reprobado'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-sm">
          <div className="bg-muted p-3 rounded text-center">
            <p className="text-muted-foreground">Puntaje</p>
            <p className="font-bold text-lg">{score} / {totalPoints}</p>
          </div>
          <div className="bg-muted p-3 rounded text-center">
            <p className="text-muted-foreground">Correctas</p>
            <p className="font-bold text-lg">{correctCount} / {questionCount}</p>
          </div>
        </div>

        {/* Detalle de cada pregunta */}
        <div className="space-y-3 border-t pt-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Revisión de respuestas
          </h4>
          {block.questions?.map((q, idx) => {
            const userAnswer = answers[q.id]
            const isCorrect = userAnswer === q.correctAnswer
            
            return (
              <div 
                key={q.id}
                className={cn(
                  "p-4 rounded-lg border-2 space-y-2",
                  isCorrect 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className={cn(
                    "shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                    isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                  )}>
                    {isCorrect ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {idx + 1}. {q.question}
                    </p>
                  </div>
                </div>
                
                <div className="ml-8 space-y-1 text-sm">
                  <p className={cn(
                    "flex items-center gap-2",
                    isCorrect ? "text-green-700" : "text-red-700"
                  )}>
                    <span className="font-medium">Tu respuesta:</span>
                    <span>{userAnswer || '(Sin respuesta)'}</span>
                  </p>
                  
                  {!isCorrect && (
                    <p className="flex items-center gap-2 text-green-700">
                      <span className="font-medium">Respuesta correcta:</span>
                      <span className="font-bold">{q.correctAnswer}</span>
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center pt-2">
          <Button onClick={handleStart} variant="outline">
            Intentar de nuevo
          </Button>
        </div>
      </div>
    )
  }

  // Question View - use display variables for teacher sync with smooth animations
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Pregunta {displayQuestionIndex + 1} de {questionCount}</span>
        <span>{Math.round(((displayQuestionIndex + 1) / questionCount) * 100)}% completado</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${((displayQuestionIndex + 1) / questionCount) * 100}%` }}
        />
      </div>

      {/* Question Card with smooth transition */}
      <div 
        key={displayQuestionIndex}
        className="bg-card border rounded-xl p-6 shadow-sm min-h-[300px] flex flex-col animate-in fade-in slide-in-from-right-4 duration-300"
      >
        <h3 className="text-xl font-bold mb-6">{displayCurrentQuestion?.question}</h3>

        <div className="flex-1 space-y-3">
          {displayCurrentQuestion?.type === 'multiple-choice' && displayCurrentQuestion.options?.map((opt, i) => (
            <div
              key={i}
              onClick={() => handleAnswerSelect(opt)}
              className={cn(
                "p-4 border rounded-lg transition-all flex items-center gap-3",
                classroomSync.isTeacher ? "cursor-default" : "cursor-pointer hover:bg-muted/50",
                displayAnswers[displayCurrentQuestion.id] === opt ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input"
              )}
            >
              <div className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                displayAnswers[displayCurrentQuestion.id] === opt ? "border-primary" : "border-muted-foreground"
              )}>
                {displayAnswers[displayCurrentQuestion.id] === opt && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </div>
              <span className="text-base">{opt}</span>
            </div>
          ))}

          {displayCurrentQuestion?.type === 'true-false' && (
            <div className="grid grid-cols-2 gap-4">
              {['Verdadero', 'Falso'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswerSelect(opt)}
                  disabled={classroomSync.isInClassroom && classroomSync.isTeacher}
                  className={cn(
                    "p-8 border-2 rounded-xl font-bold text-lg transition-all",
                    !classroomSync.isTeacher && "hover:scale-[1.02]",
                    displayAnswers[displayCurrentQuestion.id] === opt
                      ? (opt === 'Verdadero' ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700")
                      : "border-muted bg-card hover:bg-muted/50"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {displayCurrentQuestion?.type === 'short-answer' && (
            <Textarea
              placeholder={classroomSync.isTeacher ? "El estudiante escribirá aquí..." : "Escribe tu respuesta aquí..."}
              className="min-h-[150px] text-lg p-4"
              value={displayAnswers[displayCurrentQuestion.id] || ''}
              onChange={(e) => handleAnswerSelect(e.target.value)}
              disabled={classroomSync.isInClassroom && classroomSync.isTeacher}
            />
          )}
        </div>
      </div>

      {/* Navigation - hidden for teachers in classroom */}
      {!(classroomSync.isInClassroom && classroomSync.isTeacher) && (
        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={handlePrev} disabled={currentQuestionIndex === 0}>
            Anterior
          </Button>
          <Button onClick={handleNext} disabled={!answers[currentQuestion?.id || '']}>
            {currentQuestionIndex === questionCount - 1 ? 'Finalizar' : 'Siguiente'}
          </Button>
        </div>
      )}
    </div>
  )
}

// Assignment Block Preview
function AssignmentBlockPreview({ block }: { block: AssignmentBlock }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <FileText className="h-5 w-5" />
        <span>Fill in the Blanks</span>
      </div>
      {block.title && (
        <h3 className="text-xl font-bold">{block.title}</h3>
      )}

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              📝 Instrucciones
            </h4>
            {block.description ? (
              <p className="text-sm leading-relaxed">{block.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No hay instrucciones proporcionadas
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-orange-200 dark:border-orange-800">
            <Badge variant="outline" className="bg-background">
              📤 Tipo: {' '}
              {block.submissionType === 'text'
                ? 'Texto'
                : block.submissionType === 'file'
                  ? 'Archivo'
                  : 'Enlace'}
            </Badge>
            {block.maxScore && (
              <Badge variant="outline" className="bg-background">
                🎯 Puntos: {block.maxScore}
              </Badge>
            )}
            {block.dueDate && (
              <Badge variant="outline" className="bg-background">
                📅 Fecha límite
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="text-center">
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto">
          <FileText className="h-4 w-4" />
          Entregar Tarea
        </button>
      </div>
    </div>
  )
}

// File Block Preview
// File Block Preview
function FileBlockPreview({ block }: { block: FileBlock }) {
  const b = block as unknown as { url?: string; filename?: string; fileType?: string; filesize?: number }
  const files = block.files?.length > 0
    ? block.files
    : (b.url ? [{ id: 'legacy', title: b.filename || 'Archivo', url: b.url, fileType: b.fileType || 'file', size: b.filesize || 0 }] : [])

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
      {/* Icon */}
      <div className="bg-blue-100 p-4 rounded-full text-blue-600 shrink-0">
        <Download className="h-8 w-8" />
      </div>

      {/* Content */}
      <div className="flex-1 text-center md:text-left space-y-1">
        <h3 className="text-lg font-bold text-foreground">{block.title || 'Materiales del Curso'}</h3>
        <p className="text-sm text-muted-foreground">
          {block.description || 'Descarga los recursos para esta lección para estudiar offline.'}
        </p>
      </div>

      {/* File Buttons */}
      <div className="flex flex-col gap-2 w-full md:w-1/3 min-w-[220px]">
        {files.map((file, i) => (
          <a
            key={i}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-white hover:bg-white/80 border border-input shadow-sm px-4 py-2.5 rounded-lg transition-all hover:border-blue-200"
          >
            <div className="shrink-0 text-muted-foreground group-hover:text-blue-600 transition-colors">
              <FileIconByType type={file.fileType || ''} />
            </div>
            <div className="flex-1 text-left min-w-0 flex items-center">
              <span className="text-sm font-semibold text-foreground group-hover:text-blue-700 block transition-colors truncate">
                {file.title}
              </span>
              <span className="text-xs text-muted-foreground font-normal ml-1 whitespace-nowrap shrink-0">({getFileExtension(file).toUpperCase()})</span>
            </div>
          </a>
        ))}
        {files.length === 0 && (
          <div className="text-xs text-muted-foreground italic text-center p-2 border border-dashed rounded bg-white/50">
            Ningún archivo configurado
          </div>
        )}
      </div>
    </div>
  )
}

function getFileExtension(file: { fileType?: string, url?: string }) {
  if (file.fileType && !file.fileType.includes('/')) return file.fileType;
  // try to get from url
  const ext = file.url?.split('.').pop()?.split('?')[0];
  if (ext && ext.length < 5) return ext;
  return 'file';
}

function FileIconByType({ type, url }: { type: string, url?: string }) {
  const t = type.toLowerCase()
  const ext = url ? url.split('.').pop()?.split('?')[0]?.toLowerCase() : ''

  if (t.includes('pdf') || ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />
  if (t.includes('audio') || t.includes('mp3') || t.includes('wav') || ext === 'mp3' || ext === 'wav') return <Music className="h-5 w-5 text-purple-500" />
  if (t.includes('video') || t.includes('mp4') || ext === 'mp4') return <Video className="h-5 w-5 text-blue-500" />
  if (t.includes('image') || t.includes('jpg') || t.includes('png') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return <LucideImage className="h-5 w-5 text-green-500" />
  if (t.includes('word') || t.includes('doc') || ['doc', 'docx'].includes(ext || '')) return <FileText className="h-5 w-5 text-blue-700" />
  if (t.includes('sheet') || t.includes('excel') || ['xls', 'xlsx'].includes(ext || '')) return <FileText className="h-5 w-5 text-green-700" />
  return <FileText className="h-5 w-5 text-gray-500" />
}



// Embed Block Preview

// Grammar Visualizer Preview
export function GrammarVisualizerBlockPreview({ block }: { block: GrammarVisualizerBlock }) {
  if (!block.sets || block.sets.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground bg-muted/20">
        <p className="mb-2">No hay patrones gramaticales configurados.</p>
        <p className="text-sm">Edita este bloque para agregar patrones y oraciones.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {block.title && (
        <h3 className="text-xl font-bold text-center border-b pb-2">{block.title}</h3>
      )}

      {block.sets.map((set, setIndex) => (
        <div key={set.id} className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 shrink-0">
              {setIndex + 1}
            </Badge>
            <h4 className="font-semibold text-lg">{set.title}</h4>
          </div>

          <div className="space-y-4 pl-8">
            {set.variants.map((variant) => (
              <div key={variant.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="mb-3">
                  <Badge variant="secondary" className="text-xs uppercase tracking-wider mb-2">
                    {variant.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {variant.tokens.map((token) => {
                    const grammarInfo = getGrammarVisualizerColor(token.grammarType)
                    return (
                      <div
                        key={token.id}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg border-2 border-transparent transition-all min-w-[60px]",
                          grammarInfo.bg
                        )}
                      >
                        <span className={cn("px-2 py-1 rounded text-lg font-medium bg-white/80 w-full text-center shadow-sm", grammarInfo.color)}>
                          {token.content}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">
                            {grammarInfo.label}
                          </span>
                          <HoverCard openDelay={1000}>
                            <HoverCardTrigger asChild>
                              <div className="cursor-help opacity-40 hover:opacity-100 transition-opacity">
                                <HelpCircle className="h-2.5 w-2.5" />
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-64 p-3" side="top">
                              <div className="space-y-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                                  {grammarInfo.label}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {grammarInfo.explanation}
                                </p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {variant.hint && (
                  <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-3 rounded-lg text-sm border border-amber-100 mt-3">
                    <LucideIcons.Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>{variant.hint}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function getGrammarVisualizerColor(type?: string) {
  const map: Record<string, { label: string, color: string, bg: string, explanation: string }> = {
    // Sujeto
    'subject': { 
      label: 'Sujeto', 
      color: 'text-yellow-700', 
      bg: 'bg-yellow-100',
      explanation: 'Quien realiza la acción o de quien se habla en la oración. (Ej: *She* runs, *The dog* barks).'
    },
    // Verbos
    'action-verb': { 
      label: 'Verbo de acción', 
      color: 'text-green-700', 
      bg: 'bg-green-100',
      explanation: 'Palabra que expresa una acción física o mental. (Ej: She *runs*, He *thinks*).'
    },
    'auxiliary-verb': { 
      label: 'Verbo auxiliar', 
      color: 'text-green-800', 
      bg: 'bg-green-200',
      explanation: 'Ayuda al verbo principal a formar tiempos verbales, preguntas o negaciones. (Ej: I *have* eaten, She *will* go).'
    },
    'linking-verb': { 
      label: 'Verbo copulativo', 
      color: 'text-green-600', 
      bg: 'bg-green-50',
      explanation: 'Une al sujeto con una descripción o estado (ej: be, seem, become). (Ej: He *is* happy, She *seems* tired).'
    },
    // Objetos
    'direct-object': { 
      label: 'Objeto directo', 
      color: 'text-blue-700', 
      bg: 'bg-blue-100',
      explanation: 'Persona o cosa que recibe directamente la acción del verbo. (Ej: I read a *book*, She loves her *dog*).'
    },
    'indirect-object': { 
      label: 'Objeto indirecto', 
      color: 'text-blue-800', 
      bg: 'bg-blue-200',
      explanation: 'Indica a quién o para quién se realiza la acción del verbo. (Ej: He gave *me* a gift, She sent *her* a letter).'
    },
    // Complementos
    'subject-complement': { 
      label: 'Complemento del sujeto', 
      color: 'text-purple-700', 
      bg: 'bg-purple-100',
      explanation: 'Palabra o frase que sigue a un verbo copulativo y describe al sujeto. (Ej: She is a *teacher*, He seems *happy*).'
    },
    'object-complement': { 
      label: 'Complemento del objeto', 
      color: 'text-fuchsia-700', 
      bg: 'bg-fuchsia-100',
      explanation: 'Describe o renombra al objeto directo. (Ej: We named him *Jack*, She called him *honey*).'
    },
    // Modificadores
    'adjective': { 
      label: 'Adjetivo', 
      color: 'text-pink-700', 
      bg: 'bg-pink-100',
      explanation: 'Palabra que describe o modifica a un sustantivo o pronombre. (Ej: *Blue* sky, *Happy* birthday).'
    },
    'adverb': { 
      label: 'Adverbio', 
      color: 'text-teal-700', 
      bg: 'bg-teal-100',
      explanation: 'Modifica a un verbo, adjetivo u otro adverbio, indicando cómo, cuándo o dónde. (Ej: Run *fast*, She sings *beautifully*).'
    },
    'adverbial-complement': { 
      label: 'Complemento adverbial', 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-100',
      explanation: 'Información obligatoria o adicional sobre el lugar, tiempo o modo. (Ej: He lives *in Paris*, She will arrive *tomorrow*).'
    },
    // Determinantes y artículos
    'determiner': { 
      label: 'Determinante', 
      color: 'text-orange-700', 
      bg: 'bg-orange-100',
      explanation: 'Palabra que introduce un sustantivo y especifica su referencia. (Ej: *That* car, *This* book).'
    },
    'article': { 
      label: 'Artículo', 
      color: 'text-orange-500', 
      bg: 'bg-orange-50',
      explanation: 'Indica si el sustantivo es específico (el, la) o general (un, una). (Ej: *The* sun, *A* dog).'
    },
    // Pronombres
    'pronoun': { 
      label: 'Pronombre', 
      color: 'text-violet-700', 
      bg: 'bg-violet-100',
      explanation: 'Palabra que se usa en lugar de un sustantivo. (Ej: *They* are friends, *He* is happy).'
    },
    'possessive-pronoun': { 
      label: 'Pronombre posesivo', 
      color: 'text-violet-500', 
      bg: 'bg-violet-50',
      explanation: 'Indica posesión o pertenencia (ej: mine, yours, theirs). (Ej: This is *mine*, That is *hers*).'
    },
    // Preposiciones
    'preposition': { 
      label: 'Preposición', 
      color: 'text-orange-800', 
      bg: 'bg-orange-200',
      explanation: 'Muestra la relación (espacial, temporal o lógica) entre palabras. (Ej: The cat is *under* the table, The book is *on* the shelf).'
    },
    'prepositional-object': { 
      label: 'Objeto de la preposición', 
      color: 'text-amber-800', 
      bg: 'bg-amber-200',
      explanation: 'Sustantivo o pronombre que sigue a una preposición. (Ej: Under the *table*, On the *shelf*).'
    },
    // Conectores
    'conjunction': { 
      label: 'Conjunción', 
      color: 'text-gray-700', 
      bg: 'bg-gray-100',
      explanation: 'Une palabras, frases u oraciones (ej: and, but, or). (Ej: Salt *and* pepper, I like reading *but* I don\'t like writing).'
    },
    'interjection': { 
      label: 'Interjección', 
      color: 'text-red-700', 
      bg: 'bg-red-100',
      explanation: 'Palabra que expresa una emoción fuerte o exclamación. (Ej: *Wow*!, *Oh no*!).'
    },
    // Otros elementos
    'negation': { 
      label: 'Negación', 
      color: 'text-red-800', 
      bg: 'bg-red-200',
      explanation: 'Palabra usada para negar o expresar lo opuesto. (Ej: I do *not* know, She is *not* happy).'
    },
    'modal-verb': { 
      label: 'Modal verb', 
      color: 'text-lime-700', 
      bg: 'bg-lime-100',
      explanation: 'Tipo de auxiliar que indica posibilidad, habilidad, permiso u obligación. (Ej: I *can* swim, She *must* go).'
    },
    'infinitive': { 
      label: 'Infinitivo', 
      color: 'text-sky-600', 
      bg: 'bg-sky-100',
      explanation: 'La forma básica del verbo, generalmente precedida por "to". (Ej: To *learn*, To *go*).'
    },
    'gerund': { 
      label: 'Gerundio', 
      color: 'text-cyan-600', 
      bg: 'bg-cyan-100',
      explanation: 'Forma verbal terminada en -ing que funciona como sustantivo. (Ej: *Swimming* is fun, *Eating* is healthy).'
    },
    'relative-pronoun': { 
      label: 'Pronombre relativo', 
      color: 'text-indigo-700', 
      bg: 'bg-indigo-100',
      explanation: 'Introduce una oración que describe a un sustantivo previo (ej: who, which). (Ej: The man *who* called, The book *that* I read).'
    },
    // Puntuación
    'punctuation': { 
      label: 'Puntuación', 
      color: 'text-slate-500', 
      bg: 'bg-slate-100',
      explanation: 'Signos que ayudan a estructurar y dar sentido al texto. (Ej: Hello*.*, I love reading*!*).'
    },
    'other': { 
      label: 'Otro', 
      color: 'text-zinc-700', 
      bg: 'bg-zinc-100',
      explanation: 'Otros elementos gramaticales. (Ej: *etc*).'
    }
  }
  return map[type || 'other'] || map['other']
}

// Embed Block Utility Functions
function getEmbedType(url: string): 'youtube' | 'vimeo' | 'google-docs' | 'google-slides' | 'google-forms' | 'spotify' | 'soundcloud' | 'codepen' | 'figma' | 'canva' | 'genially' | 'iframe' {
  if (!url) return 'iframe'
  
  const lowerUrl = url.toLowerCase()
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube'
  if (lowerUrl.includes('vimeo.com')) return 'vimeo'
  if (lowerUrl.includes('docs.google.com/document')) return 'google-docs'
  if (lowerUrl.includes('docs.google.com/presentation')) return 'google-slides'
  if (lowerUrl.includes('docs.google.com/forms')) return 'google-forms'
  if (lowerUrl.includes('spotify.com')) return 'spotify'
  if (lowerUrl.includes('soundcloud.com')) return 'soundcloud'
  if (lowerUrl.includes('codepen.io')) return 'codepen'
  if (lowerUrl.includes('figma.com')) return 'figma'
  if (lowerUrl.includes('canva.com')) return 'canva'
  if (lowerUrl.includes('genial.ly') || lowerUrl.includes('genially')) return 'genially'
  
  return 'iframe'
}

function getGoogleSlidesEmbedUrl(url: string, options?: { autoplay?: boolean; loop?: boolean; delayMs?: number }): string {
  let baseUrl = url
  
  // Remove any existing query parameters and hash
  baseUrl = baseUrl.split('?')[0].split('#')[0]
  
  // Convert /edit or /preview to /embed for proper embedding
  if (baseUrl.includes('/edit')) {
    baseUrl = baseUrl.replace('/edit', '/embed')
  } else if (baseUrl.includes('/preview')) {
    baseUrl = baseUrl.replace('/preview', '/embed')
  } else if (baseUrl.includes('/pub')) {
    baseUrl = baseUrl.replace('/pub', '/embed')
  } else if (!baseUrl.endsWith('/embed')) {
    baseUrl = baseUrl.replace(/\/?$/, '/embed')
  }
  
  // Build query parameters for Google Slides
  const params = new URLSearchParams()
  
  if (options?.autoplay) {
    params.set('start', 'true')
  }
  
  if (options?.loop) {
    params.set('loop', 'true')
  }
  
  if (options?.delayMs) {
    params.set('delayms', options.delayMs.toString())
  }
  
  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

function getEmbedUrl(url: string, options?: { autoplay?: boolean; loop?: boolean; delayMs?: number }): string {
  if (!url) return ''
  
  const embedType = getEmbedType(url)
  
  switch (embedType) {
    case 'youtube': {
      let videoId = ''
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split(/[?&#]/)[0] || ''
      } else if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(url.split('?')[1])
        videoId = urlParams.get('v') || ''
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1]?.split(/[?&#]/)[0] || ''
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url
    }
    case 'vimeo': {
      const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
      const videoId = vimeoMatch?.[1]
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url
    }
    case 'google-slides': {
      return getGoogleSlidesEmbedUrl(url, options)
    }
    case 'google-docs':
    case 'google-forms': {
      if (url.includes('/edit')) {
        return url.replace('/edit', '/preview')
      }
      if (!url.includes('/preview') && !url.includes('/embed') && !url.includes('/pub')) {
        return url + '/preview'
      }
      return url
    }
    case 'spotify': {
      if (url.includes('open.spotify.com') && !url.includes('/embed/')) {
        return url.replace('open.spotify.com/', 'open.spotify.com/embed/')
      }
      return url
    }
    case 'figma': {
      if (url.includes('figma.com/file/') || url.includes('figma.com/design/')) {
        return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
      }
      return url
    }
    case 'canva':
    case 'genially':
    default:
      return url
  }
}

function getEmbedTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'youtube': 'YouTube',
    'vimeo': 'Vimeo',
    'google-docs': 'Google Docs',
    'google-slides': 'Google Slides',
    'google-forms': 'Google Forms',
    'spotify': 'Spotify',
    'soundcloud': 'SoundCloud',
    'codepen': 'CodePen',
    'figma': 'Figma',
    'canva': 'Canva',
    'genially': 'Genially',
    'iframe': 'Contenido Web',
  }
  return labels[type] || 'Contenido Web'
}

function EmbedBlockPreview({ block }: { block: EmbedBlock }) {
  const embedType = getEmbedType(block.url || '')
  const isGoogleSlides = embedType === 'google-slides'
  const embedUrl = getEmbedUrl(block.url || '', {
    autoplay: block.autoplay,
    loop: block.loop,
    delayMs: block.delayMs,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Link className="h-5 w-5" />
          <span>Contenido Embebido</span>
        </div>
        <div className="flex items-center gap-2">
          {isGoogleSlides && block.autoplay && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
              Auto
            </span>
          )}
          {isGoogleSlides && block.loop && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Loop
            </span>
          )}
          {block.url && (
            <span className="text-xs bg-muted px-2 py-1 rounded font-medium">
              {getEmbedTypeLabel(embedType)}
            </span>
          )}
        </div>
      </div>

      {block.title && (
        <div>
          <h3 className="text-xl font-bold">{block.title}</h3>
        </div>
      )}

      {!block.url ? (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <Link className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Contenido embebido no configurado</p>
          <p className="text-xs text-muted-foreground mt-2">
            Soporta Google Slides, YouTube, Vimeo, Google Docs, Spotify, Figma, Canva, Genially y más
          </p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden border bg-black/5 shadow-sm">
          <iframe
            src={embedUrl}
            title={block.title || 'Contenido embebido'}
            className="w-full border-0"
            style={{ height: block.height || 400 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}

// Tab Group Block Preview
function TabGroupBlockPreview({ block }: { block: TabGroupBlock }) {
  const [activeTabId, setActiveTabId] = useState<string>(block.children?.[0]?.id || '')

  // Update active tab if block children change (e.g. new tab added)
  // But be careful not to reset user selection unnecessarily.
  // We can use a simple effect or just default if current selection invalid.
  // Filter children to ensure they are TabItemBlocks
  const tabs = (block.children?.filter((child): child is TabItemBlock => child.type === 'tab_item') || [])
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0]

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
        <div className="flex bg-muted/50 border-b overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                "px-6 py-3 text-sm font-medium border-r last:border-r-0 whitespace-nowrap transition-all",
                (activeTab?.id === tab.id)
                  ? "bg-background text-primary border-b-2 border-b-primary -mb-px font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.title}
            </button>
          ))}
        </div>
        <div className="p-6 min-h-[200px] bg-card">
          {activeTab ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              {activeTab.children && activeTab.children.length > 0 ? (
                activeTab.children.map((child: Block) => (
                  <div key={child.id} className="relative">
                    <BlockPreview block={child} />
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground italic border-2 border-dashed rounded-lg">
                  Este panel está vacío
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              Selecciona una pestaña
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LayoutBlockPreview({ block }: { block: LayoutBlock }) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}>
      {block.children?.map(col => (
        <div key={col.id} className="min-h-[50px]">
          {col.children?.map((child: Block) => (
            <div key={child.id} className="mb-4 last:mb-0">
              <BlockPreview block={child} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function GrammarBlockPreview({ block }: { block: GrammarBlock }) {
  if (!block.title && !block.description && (!block.examples || block.examples.length === 0)) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center bg-muted/20">
        <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Regla gramatical no configurada</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <LucideIcons.Book className="h-5 w-5" />
            <span>Gramática</span>
          </div>

          <h3 className="text-2xl font-bold">{block.title || 'Regla sin título'}</h3>

          <div
            className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: block.description || '' }}
          />

          {block.examples && block.examples.length > 0 && (
            <div className={cn(
              "bg-muted/50 rounded-lg p-4 space-y-2 border-l-4 border-primary mt-4",
              "text-muted-foreground"
            )}>
              <p className="font-medium text-foreground">Ejemplo:</p>
              {block.examples.map((ex) => (
                <div key={ex.id}>
                  <p
                    className="font-mono text-sm mt-1 [&_b]:text-blue-600 [&_b]:font-bold"
                    dangerouslySetInnerHTML={{ __html: ex.sentence }}
                  />
                  {ex.translation && <p className="text-xs text-muted-foreground italic">{ex.translation}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Illustration */}
        {/* Illustration or Icon */}
        <div className="w-full md:w-1/3 aspect-video bg-muted/30 rounded-lg flex items-center justify-center border relative overflow-hidden">
          {block.image ? (
            block.image.includes('/') || block.image.includes('http') ? (
              <Image src={block.image} alt="Grammar illustration" fill className="object-cover" />
            ) : (
              (() => {
                const Icon = (LucideIcons as unknown as Record<string, React.ElementType>)[block.image] || Book
                return <Icon className="h-32 w-32 text-blue-500/80" />
              })()
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground/50">
              <Book className="h-10 w-10 mb-2" />
              <span className="text-xs">Sin ilustración</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



// ... existing imports ...

// Note: Ensure this import is at the top of the file, merged with existing lucide-react imports or as a separate one if easier for the tool. 
// Since I can't easily merge imports with replace_file_content if I don't see the top, I will handle the component logic and assume I need to direct the user or just patch the component.
// Actually, I can just use the existing imports if I knew them, but dynamic requires all.
// I will create a helper component inside the file to avoid import issues or reuse the existing one if I can view top.
// I'll just skip the import patch for a second and assume I can use `LucideIcons` if I add it.
// Let's add the import to the existing list or a new line.

function VocabularyBlockPreview({ block }: { block: VocabularyBlock }) {
  const hasItems = block.items && block.items.length > 0

  if (!block.title && !hasItems) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center bg-muted/20">
        <Library className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">El set de vocabulario está vacío</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-4">
        <LucideIcons.Library className="h-5 w-5" />
        <span>Vocabulario</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">{block.title || 'Vocabulario'}</h3>
        <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded">
          {block.items?.length || 0} Ítems
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {block.items?.map((item) => {
          // Dynamic Icon Rendering
          const iconName = item.icon || 'Book'
          const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[iconName] || Book

          return (
            <Card key={item.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className="h-10 w-10 rounded bg-blue-50 flex items-center justify-center shrink-0 text-blue-500">
                  <IconComponent className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base">{item.term}</span>
                      {item.audioUrl && (
                        <button
                          className="text-blue-500 hover:text-blue-700 transition-colors p-0.5 rounded-full hover:bg-blue-50"
                          onClick={() => {
                            const audio = new Audio(item.audioUrl);
                            audio.play();
                          }}
                          title="Escuchar pronunciación"
                        >
                          <LucideIcons.Volume2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {item.pronunciation && (
                      <span className="text-xs text-muted-foreground font-mono shrink-0">/{item.pronunciation}/</span>
                    )}
                  </div>

                  {item.definition && (
                    <div className="mt-2 text-sm text-foreground/90 leading-snug">
                      {item.definition}
                    </div>
                  )}

                  {item.example && item.example.trim() !== '' && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <span className="text-xs font-semibold text-muted-foreground block mb-0.5">Ejemplo:</span>
                      <p
                        className="text-sm italic text-muted-foreground [&_b]:text-blue-600 [&_b]:font-bold"
                        dangerouslySetInnerHTML={{ __html: item.example }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
        {(!block.items || block.items.length === 0) && (
          <div className="col-span-full py-8 text-center text-muted-foreground italic">
            No hay ítems agregados aún.
          </div>
        )}
      </div>
    </div>
  )
}

function FillBlanksBlockPreview({ block }: { block: FillBlanksBlock }) {
  const [index, setIndex] = useState(0)
  const [allInputs, setAllInputs] = useState<Record<string, Record<number, string>>>({})
  const [allResults, setAllResults] = useState<Record<string, boolean>>({})
  const items = block.items || []
  const currentItem = items[index]
  
  // Get classroom sync
  const classroomSync = useClassroomSync()
  const remoteNav = classroomSync.getRemoteNavigation(block.id)
  const isTeacherInClassroom = classroomSync.isInClassroom && classroomSync.isTeacher
  
  // For teachers: follow student's navigation
  const displayIndex = isTeacherInClassroom && remoteNav ? remoteNav.currentStep : index
  const displayItem = items[displayIndex]
  
  // Parse remote answers for display
  const displayInputs = isTeacherInClassroom && remoteNav?.currentAnswers 
    ? Object.fromEntries(Object.entries(remoteNav.currentAnswers).map(([k, v]) => [parseInt(k), v]))
    : (allInputs[displayItem?.id] || {})

  const handleInputChange = (partIndex: number, value: string) => {
    if (isTeacherInClassroom || !currentItem) return
    const newInputs = { ...allInputs[currentItem.id], [partIndex]: value }
    setAllInputs(prev => ({ ...prev, [currentItem.id]: newInputs }))
    
    // Sync to teacher
    if (classroomSync.canInteract) {
      const answersForSync = Object.fromEntries(Object.entries(newInputs).map(([k, v]) => [k, v]))
      classroomSync.syncBlockNavigation(block.id, index, items.length, true, false, answersForSync)
    }
  }

  const handleCheck = () => {
    if (isTeacherInClassroom || !currentItem) return
    const parts = currentItem.content ? currentItem.content.split(/(\[[^\]]+\])/g) : []
    const inputs = allInputs[currentItem.id] || {}
    const blanks = parts.filter(part => part.startsWith('[') && part.endsWith(']'))
    let correctCount = 0
    blanks.forEach((part) => {
      const answer = part.slice(1, -1)
      const partIndex = parts.indexOf(part)
      const userAnswer = inputs[partIndex] || ''
      if (userAnswer.toLowerCase().trim() === answer.toLowerCase().trim()) correctCount++
    })
    const allCorrect = correctCount === blanks.length
    setAllResults(prev => ({ ...prev, [currentItem.id]: allCorrect }))
    
    // Sync result to teacher
    if (classroomSync.canInteract) {
      classroomSync.sendBlockResponse(block.id, 'fill_blanks', {
        itemId: currentItem.id,
        correctCount,
        totalBlanks: blanks.length,
      }, allCorrect, correctCount)
    }
  }

  const handleNav = (newIndex: number) => {
    if (isTeacherInClassroom) return
    setIndex(newIndex)
    
    if (classroomSync.canInteract) {
      const currentInputs = allInputs[items[newIndex]?.id] || {}
      const answersForSync = Object.fromEntries(Object.entries(currentInputs).map(([k, v]) => [k, v]))
      classroomSync.syncBlockNavigation(block.id, newIndex, items.length, true, false, answersForSync)
    }
  }

  if (!items.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Edit3 className="h-5 w-5" />
          <span>Rellenar Espacios</span>
        </div>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Sin ejercicios configurados</p>
        </div>
      </div>
    )
  }

  const parts = displayItem?.content ? displayItem.content.split(/(\[[^\]]+\])/g) : []
  const showResult = displayItem ? allResults[displayItem.id] !== undefined : false

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Edit3 className="h-5 w-5" />
          <span>Rellenar Espacios</span>
        </div>
        {items.length > 1 && (
          <span className="text-xs text-muted-foreground">
            Ejercicio {displayIndex + 1} de {items.length}
          </span>
        )}
      </div>

      {block.title && <h3 className="text-xl font-bold">{block.title}</h3>}

      <div className="relative">
        <div key={displayItem?.id} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-6 bg-white rounded-xl border shadow-sm leading-loose text-lg">
            {parts.map((part, i) => {
              if (part.startsWith('[') && part.endsWith(']')) {
                const answer = part.slice(1, -1)
                const userAnswer = displayInputs[i] || ''
                const isCorrect = userAnswer.toLowerCase().trim() === answer.toLowerCase().trim()

                return (
                  <span key={i} className="mx-1 inline-block relative">
                    <input
                      value={userAnswer}
                      onChange={(e) => handleInputChange(i, e.target.value)}
                      disabled={showResult || isTeacherInClassroom}
                      placeholder={isTeacherInClassroom ? "..." : ""}
                      className={cn(
                        "border-b-2 px-2 py-0.5 text-center min-w-[80px] font-medium focus:outline-none rounded-t transition-colors",
                        showResult
                          ? (isCorrect ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700")
                          : "border-primary/50 bg-primary/5 text-primary",
                        isTeacherInClassroom && "cursor-default"
                      )}
                    />
                    {showResult && !isCorrect && (
                      <span className="absolute -top-6 left-0 text-xs text-green-600 font-bold bg-green-100 px-1 rounded whitespace-nowrap z-10">
                        {answer}
                      </span>
                    )}
                  </span>
                )
              }
              return <span key={i}>{part}</span>
            })}
            {(!displayItem?.content) && (
              <div className="text-muted-foreground italic text-sm">Contenido no configurado</div>
            )}
          </div>

          {!isTeacherInClassroom && (
            <div className="flex gap-2">
              <Button onClick={handleCheck} disabled={showResult} size="sm">
                Verificar
              </Button>
            </div>
          )}
          
          {isTeacherInClassroom && !showResult && (
            <p className="text-sm text-muted-foreground italic text-center">Esperando respuesta del estudiante...</p>
          )}
        </div>

        {items.length > 1 && !isTeacherInClassroom && (
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNav(Math.max(0, index - 1))}
              disabled={index === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNav(Math.min(items.length - 1, index + 1))}
              disabled={index === items.length - 1}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function MatchBlockPreview({ block }: { block: MatchBlock }) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [matches, setMatches] = useState<Record<string, string>>({}) // leftId -> rightId
  const [shuffledRight, setShuffledRight] = useState<Array<{ id: string, text: string }>>([])
  const [showResult, setShowResult] = useState(false)
  
  // Get classroom sync
  const classroomSync = useClassroomSync()
  const remoteNav = classroomSync.getRemoteNavigation(block.id)
  const isTeacherInClassroom = classroomSync.isInClassroom && classroomSync.isTeacher
  
  // For teachers: use remote matches
  const displayMatches = isTeacherInClassroom && remoteNav?.currentAnswers ? remoteNav.currentAnswers : matches

  // Shuffle effects
  const init = () => {
    if (block.pairs) {
      const rightSide = block.pairs.map(p => ({ id: p.id, text: p.right }))
      // Simple shuffle
      setShuffledRight([...rightSide].sort(() => Math.random() - 0.5))
      setMatches({})
      setShowResult(false)
      setSelectedLeft(null)
    }
  }

  // Initialize on mount or block change
  useEffect(() => {
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-shuffle when block pairs change effectively (or manual reset)
  const handleReset = () => {
    if (isTeacherInClassroom) return
    init()
  }

  const handleLeftClick = (id: string) => {
    if (showResult || isTeacherInClassroom) return
    if (matches[id]) {
      const newMatches = { ...matches }
      delete newMatches[id]
      setMatches(newMatches)
      
      // Sync to teacher
      if (classroomSync.canInteract) {
        classroomSync.syncBlockNavigation(block.id, 0, block.pairs?.length || 0, true, false, newMatches)
      }
    }
    setSelectedLeft(id)
  }

  const handleRightClick = (rightId: string) => {
    if (showResult || isTeacherInClassroom) return
    if (selectedLeft) {
      const newMatches = { ...matches, [selectedLeft]: rightId }
      setMatches(newMatches)
      setSelectedLeft(null)
      
      // Sync to teacher
      if (classroomSync.canInteract) {
        classroomSync.syncBlockNavigation(block.id, 0, block.pairs?.length || 0, true, false, newMatches)
      }
    }
  }

  const checkAnswers = () => {
    if (isTeacherInClassroom) return
    setShowResult(true)
    
    // Calculate and sync result
    if (classroomSync.canInteract && block.pairs) {
      const correctMatches = Object.keys(matches).filter(leftId => matches[leftId] === leftId).length
      const allCorrect = correctMatches === block.pairs.length
      classroomSync.sendBlockResponse(block.id, 'match', {
        matches,
        correctCount: correctMatches,
        totalPairs: block.pairs.length,
      }, allCorrect, correctMatches)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <Shuffle className="h-5 w-5" />
        <span>Emparejar</span>
      </div>
      {block.title && <h3 className="font-bold text-lg">{block.title}</h3>}

      <div className="grid grid-cols-2 gap-8 relative p-4">
        {/* Left Side */}
        <div className="space-y-4">
          {block.pairs?.map(pair => {
            const isMatched = !!displayMatches[pair.id]
            const isSelected = selectedLeft === pair.id
            const matchedRightId = displayMatches[pair.id]

            // Check correctness if showing result
            let statusClass = "border-gray-200 bg-white"
            if (showResult && isMatched) {
              statusClass = matchedRightId === pair.id
                ? "border-green-500 bg-green-50"
                : "border-red-500 bg-red-50"
            } else if (isSelected && !isTeacherInClassroom) {
              statusClass = "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
            } else if (isMatched) {
              statusClass = "border-blue-200 bg-blue-50/50"
            }

            return (
              <div
                key={`l-${pair.id}`}
                onClick={() => handleLeftClick(pair.id)}
                className={cn(
                  "p-4 border rounded-lg shadow-sm font-medium flex items-center justify-between transition-all",
                  isTeacherInClassroom ? "cursor-default" : "cursor-pointer hover:shadow-md",
                  statusClass
                )}
              >
                {pair.left}
                <div className={cn("h-3 w-3 rounded-full -mr-5 border-2 border-white ring-1 ring-gray-200", isMatched || isSelected ? "bg-blue-500" : "bg-gray-200")}></div>
              </div>
            )
          })}
        </div>

        {/* Right Side */}
        <div className="space-y-4">
          {shuffledRight.map(item => {
            // Find which left ID is connected to this right ID
            const connectedLeftId = Object.keys(displayMatches).find(key => displayMatches[key] === item.id)
            const isConnected = !!connectedLeftId

            let statusClass = "border-2 border-dashed border-gray-200 bg-muted/30"
            if (showResult && isConnected) {
              statusClass = connectedLeftId === item.id
                ? "border-green-500 bg-green-50 border-solid"
                : "border-red-500 bg-red-50 border-solid"
            } else if (isConnected) {
              statusClass = "border-blue-300 bg-blue-50/50 border-solid"
            }

            return (
              <div
                key={`r-${item.id}`}
                onClick={() => handleRightClick(item.id)}
                className={cn(
                  "p-4 rounded-lg text-muted-foreground flex items-center gap-2 cursor-pointer transition-all hover:bg-muted",
                  statusClass
                )}
              >
                <div className={cn("h-3 w-3 rounded-full -ml-5 border-2 border-white ring-1 ring-gray-200", isConnected ? "bg-blue-500" : "bg-gray-200")}></div>
                <span className="flex-1 text-right">{item.text}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <Button onClick={checkAnswers} disabled={showResult} size="sm">
          Verificar
        </Button>
        <Button variant="outline" onClick={handleReset} size="sm">
          Reiniciar
        </Button>
      </div>

      {showResult && block.pairs && block.pairs.length > 0 && (() => {
        const correctMatches = Object.keys(matches).filter(leftId => matches[leftId] === leftId).length
        const totalPairs = block.pairs.length
        const allCorrect = correctMatches === totalPairs
        
        return (
          <div className="space-y-4">
            <div className={cn(
              "p-4 rounded-lg text-center",
              allCorrect ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            )}>
              <p className="font-bold">
                {allCorrect 
                  ? "¡Perfecto! Todos los pares están correctos" 
                  : `${correctMatches} de ${totalPairs} pares correctos`}
              </p>
            </div>

            {/* Detalle de cada par */}
            {!allCorrect && (
              <div className="space-y-2 border-t pt-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Revisión de pares
                </h4>
                {block.pairs.map((pair) => {
                  const userMatchedRightId = matches[pair.id]
                  const userMatchedRight = shuffledRight.find(r => r.id === userMatchedRightId)
                  const isCorrect = userMatchedRightId === pair.id
                  
                  return (
                    <div 
                      key={pair.id}
                      className={cn(
                        "p-3 rounded-lg border-2 flex items-center gap-3",
                        isCorrect 
                          ? "bg-green-50 border-green-200" 
                          : "bg-red-50 border-red-200"
                      )}
                    >
                      <span className={cn(
                        "shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                        isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                      )}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      
                      <div className="flex-1 text-sm">
                        <div className="flex items-center gap-2 font-medium">
                          <span>{pair.left}</span>
                          <span className="text-muted-foreground">→</span>
                          {isCorrect ? (
                            <span className="text-green-700">{pair.right}</span>
                          ) : (
                            <span className="text-red-600 line-through">{userMatchedRight?.text || '(sin emparejar)'}</span>
                          )}
                        </div>
                        
                        {!isCorrect && (
                          <p className="text-green-700 mt-1">
                            <span className="font-medium">Correcto:</span> {pair.left} → <strong>{pair.right}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {(!block.pairs || block.pairs.length === 0) && (
        <div className="text-center p-4 border border-dashed rounded text-muted-foreground">
          Sin pares definidos
        </div>
      )}
    </div>
  )
}

function TrueFalseBlockPreview({ block }: { block: TrueFalseBlock }) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({})
  const [results, setResults] = useState<Record<string, boolean>>({})
  const items = block.items || []
  const currentItem = items[index]
  
  // Get classroom sync
  const classroomSync = useClassroomSync()
  const remoteNav = classroomSync.getRemoteNavigation(block.id)
  const isTeacherInClassroom = classroomSync.isInClassroom && classroomSync.isTeacher
  
  // For teachers: follow student's navigation
  const displayIndex = isTeacherInClassroom && remoteNav ? remoteNav.currentStep : index
  const displayItem = items[displayIndex]
  const displayAnswers = isTeacherInClassroom && remoteNav?.currentAnswers 
    ? Object.fromEntries(Object.entries(remoteNav.currentAnswers).map(([k, v]) => [k, v === 'true']))
    : answers

  const handleSelect = (value: boolean) => {
    if (isTeacherInClassroom || !currentItem) return
    const newAnswers = { ...answers, [currentItem.id]: value }
    setAnswers(newAnswers)
    
    // Sync to teacher
    if (classroomSync.canInteract) {
      const answersForSync = Object.fromEntries(Object.entries(newAnswers).map(([k, v]) => [k, String(v)]))
      classroomSync.syncBlockNavigation(block.id, index, items.length, true, false, answersForSync)
    }
  }

  const handleCheck = () => {
    if (isTeacherInClassroom || !currentItem) return
    const isCorrect = answers[currentItem.id] === currentItem.correctAnswer
    setResults(prev => ({ ...prev, [currentItem.id]: isCorrect }))
    
    // Sync result to teacher
    if (classroomSync.canInteract) {
      classroomSync.sendBlockResponse(block.id, 'true_false', {
        itemId: currentItem.id,
        answer: answers[currentItem.id],
        isCorrect,
      }, isCorrect, isCorrect ? 1 : 0)
    }
  }

  const handleNav = (newIndex: number) => {
    if (isTeacherInClassroom) return
    setIndex(newIndex)
    
    if (classroomSync.canInteract) {
      const answersForSync = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, String(v)]))
      classroomSync.syncBlockNavigation(block.id, newIndex, items.length, true, false, answersForSync)
    }
  }

  if (!items.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <CheckCircle2 className="h-5 w-5" />
          <span>Verdadero o Falso</span>
        </div>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Sin preguntas configuradas</p>
        </div>
      </div>
    )
  }

  const currentAnswer = displayAnswers[displayItem?.id]
  const currentResult = results[displayItem?.id]
  const showResult = currentResult !== undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <CheckCircle2 className="h-5 w-5" />
          <span>Verdadero o Falso</span>
        </div>
        {items.length > 1 && (
          <span className="text-xs text-muted-foreground">
            Pregunta {displayIndex + 1} de {items.length}
          </span>
        )}
      </div>

      {block.title && <h3 className="text-xl font-bold">{block.title}</h3>}

      <div className="relative">
        <div key={displayItem?.id} className="p-6 bg-white border rounded-xl shadow-sm text-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="text-xl font-medium leading-relaxed">
            {displayItem?.statement || "Afirmación..."}
          </h3>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => handleSelect(true)}
              disabled={showResult || isTeacherInClassroom}
              className={cn(
                "px-8 py-3 rounded-lg border-2 font-bold transition-all flex items-center gap-2",
                currentAnswer === true
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-green-50 text-green-700 border-green-100 hover:bg-green-100",
                isTeacherInClassroom && "cursor-default"
              )}
            >
              Verdadero
            </button>
            <button
              onClick={() => handleSelect(false)}
              disabled={showResult || isTeacherInClassroom}
              className={cn(
                "px-8 py-3 rounded-lg border-2 font-bold transition-all flex items-center gap-2",
                currentAnswer === false
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-red-50 text-red-700 border-red-100 hover:bg-red-100",
                isTeacherInClassroom && "cursor-default"
              )}
            >
              Falso
            </button>
          </div>

          {showResult && (
            <div className={cn(
              "p-4 rounded-lg text-center space-y-2",
              currentResult ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              <p className="font-bold text-lg">
                {currentResult ? "¡Correcto!" : "Incorrecto"}
              </p>
              {!currentResult && displayItem && (
                <p className="text-sm">
                  La respuesta correcta es: <strong>{displayItem.correctAnswer ? "Verdadero" : "Falso"}</strong>
                </p>
              )}
            </div>
          )}

          {!showResult && !isTeacherInClassroom && (
            <Button onClick={handleCheck} disabled={currentAnswer === null || currentAnswer === undefined} size="sm">
              Enviar Respuesta
            </Button>
          )}
          
          {isTeacherInClassroom && !showResult && (
            <p className="text-sm text-muted-foreground italic">Esperando respuesta del estudiante...</p>
          )}
        </div>

        {items.length > 1 && !isTeacherInClassroom && (
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNav(Math.max(0, index - 1))}
              disabled={index === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNav(Math.min(items.length - 1, index + 1))}
              disabled={index === items.length - 1}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function EssayBlockPreview({ block }: { block: EssayBlock }) {
  const [text, setText] = useState('')
  
  // Get classroom sync
  const classroomSync = useClassroomSync()
  const remoteNav = classroomSync.getRemoteNavigation(block.id)
  const isTeacherInClassroom = classroomSync.isInClassroom && classroomSync.isTeacher
  
  // For teachers: show student's text
  const displayText = isTeacherInClassroom && remoteNav?.currentAnswers?.text 
    ? remoteNav.currentAnswers.text 
    : text
  
  const wordCount = displayText.trim().split(/\s+/).filter(w => w.length > 0).length
  const meetsMinWords = !block.minWords || wordCount >= block.minWords

  const handleTextChange = (value: string) => {
    if (isTeacherInClassroom) return
    setText(value)
    
    // Sync to teacher (debounced would be better but simple for now)
    if (classroomSync.canInteract) {
      classroomSync.syncBlockNavigation(block.id, 0, 1, true, false, { text: value })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <FileSignature className="h-5 w-5" />
          <span>Ensayo</span>
        </div>
        {block.aiGrading && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            <span>Autocorrección</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-bold text-lg">{block.prompt || 'Escribe tu respuesta aquí...'}</h3>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {block.minWords && <span>Mínimo {block.minWords} palabras</span>}
          {block.aiGradingConfig?.targetLevel && (
            <span className="px-1.5 py-0.5 rounded bg-muted">Nivel: {block.aiGradingConfig.targetLevel}</span>
          )}
        </div>
      </div>

      <textarea
        className={cn(
          "w-full p-4 rounded-lg border bg-background min-h-[150px] focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50",
          isTeacherInClassroom && "cursor-default"
        )}
        placeholder={isTeacherInClassroom ? "El estudiante escribirá aquí..." : "Escribe tu respuesta..."}
        value={displayText}
        onChange={(e) => handleTextChange(e.target.value)}
        disabled={isTeacherInClassroom}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className={cn(block.minWords && wordCount < block.minWords ? "text-red-500" : "text-green-600")}>
          {wordCount} palabras
        </span>
        {block.maxWords && <span>Máx {block.maxWords}</span>}
      </div>
      
      {isTeacherInClassroom && !displayText && (
        <p className="text-sm text-muted-foreground italic text-center">Esperando que el estudiante escriba...</p>
      )}
      
      {!isTeacherInClassroom && (
        <div className="flex justify-end">
          {block.aiGrading ? (
            <EssayAIGradingButton
              essayText={text}
              prompt={block.prompt || ''}
              blockId={block.id}
              language={block.aiGradingConfig?.language}
              targetLevel={block.aiGradingConfig?.targetLevel}
              disabled={!meetsMinWords || !text.trim()}
              onSyncResponse={classroomSync.canInteract ? classroomSync.sendBlockResponse : undefined}
            />
          ) : (
            <Button size="sm" disabled={!meetsMinWords}>Enviar</Button>
          )}
        </div>
      )}
    </div>
  )
}

function RecordingBlockPreview({ block }: { block: RecordingBlock }) {
  const [isRecording, setIsRecording] = useState(false)
  const [timeLeft, setTimeLeft] = useState(block.timeLimit || 60)
  const [hasRecorded, setHasRecorded] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const toggleRecording = () => {
    if (isRecording) {
      // Stop
      setIsRecording(false)
      setHasRecorded(true)
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      // Start
      setIsRecording(true)
      setTimeLeft(block.timeLimit || 60)
      setHasRecorded(false)
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRecording(false)
            setHasRecorded(true)
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <Mic className="h-5 w-5" />
        <span>Grabación</span>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl space-y-6 text-center">
        <div className="space-y-2">
          <h3 className="font-medium text-lg text-blue-900">
            {block.instruction || block.prompt || 'Graba tu respuesta...'}
          </h3>
          {block.timeLimit && (
            <span className="inline-block px-2 py-1 bg-white rounded text-xs font-mono text-blue-600 border border-blue-200">
              {isRecording ? `Tiempo restante: ${timeLeft}s` : `Límite: ${block.timeLimit}s`}
            </span>
          )}
        </div>

        <div className="flex justify-center">
          <div
            onClick={toggleRecording}
            className={cn(
              "h-20 w-20 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-all relative",
              isRecording ? "bg-white border-4 border-red-500" : "bg-red-500 shadow-red-200"
            )}
          >
            {isRecording ? (
              <div className="h-8 w-8 bg-red-500 rounded sm" />
            ) : (
              <Mic className="h-8 w-8 text-white" />
            )}
            {isRecording && (
              <span className="absolute -bottom-8 text-xs text-red-500 font-bold animate-pulse">GRABANDO</span>
            )}
          </div>
        </div>

        <p className="text-sm text-blue-600/80">
          {hasRecorded ? "Grabación completada. ¿Grabar de nuevo?" : (isRecording ? "Haz clic para detener" : "Haz clic para comenzar a grabar")}
        </p>

        {hasRecorded && !isRecording && (
          <Button size="sm" className="mt-2">Enviar Grabación</Button>
        )}
      </div>
    </div>
  )
}

// Structured Content (Table) Block Preview
export function StructuredContentBlockPreview({ block }: { block: StructuredContentBlock }) {
  const { config, content, title, subtitle } = block
  const hasHeaderRow = config?.hasHeaderRow !== false // default true
  const hasStripedRows = config?.hasStripedRows // default false
  const hasBorders = config?.hasBorders !== false // default true

  return (
    <div className="space-y-4 p-4">
      {/* Block Header - Icon + Fixed Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <LucideIcons.Table className="w-5 h-5 text-primary" />
        </div>
        <span className="text-lg font-semibold text-primary">
          Tabla
        </span>
      </div>

      {/* Title/Subtitle Section */}
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && <h3 className="text-xl font-bold">{title}</h3>}
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      {/* Table Container */}
      <div className={cn("overflow-hidden", hasBorders ? "border rounded-lg" : "")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            {/* Table Header */}
            {hasHeaderRow && content?.headers && content.headers.length > 0 && (
              <thead className={cn(
                "bg-muted/50 text-muted-foreground font-medium uppercase text-xs tracking-wider",
                hasBorders ? "border-b" : ""
              )}>
                <tr>
                  {content.headers.map((header, i) => (
                    <th key={i} className={cn("px-4 py-3", hasBorders && i < content.headers.length - 1 ? "border-r" : "")}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}

            {/* Table Body */}
            <tbody className="divide-y">
              {content?.rows?.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    "transition-colors hover:bg-muted/30",
                    hasStripedRows && rowIndex % 2 === 1 ? "bg-muted/20" : "",
                    !hasBorders ? "border-none" : "divide-x"
                  )}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-3 whitespace-pre-wrap"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {(!content?.rows || content.rows.length === 0) && (
                <tr>
                  <td colSpan={content?.headers?.length || 1} className="px-4 py-8 text-center text-muted-foreground italic">
                    Sin datos en la tabla
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ShortAnswerBlockPreview({ block }: { block: ShortAnswerBlock }) {
  const items = block.items || []
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, boolean | null>>({})

  // Get classroom sync
  const classroomSync = useClassroomSync()
  const remoteNav = classroomSync.getRemoteNavigation(block.id)
  const isTeacherInClassroom = classroomSync.isInClassroom && classroomSync.isTeacher
  
  // For teachers: follow student's navigation and answers
  const displayStep = isTeacherInClassroom && remoteNav ? remoteNav.currentStep : currentStep
  const displayAnswers = isTeacherInClassroom && remoteNav?.currentAnswers ? remoteNav.currentAnswers : answers
  const currentItem = items[currentStep]
  const displayItem = items[displayStep]

  const handleAnswerChange = (value: string) => {
    if (isTeacherInClassroom || !currentItem) return
    const newAnswers = { ...answers, [currentItem.id]: value }
    setAnswers(newAnswers)
    
    // Sync to teacher
    if (classroomSync.canInteract) {
      classroomSync.syncBlockNavigation(block.id, currentStep, items.length, true, false, newAnswers)
    }
  }

  const checkAnswer = () => {
    if (isTeacherInClassroom || !currentItem) return
    const userAnswer = answers[currentItem.id] || ''
    const isCorrect = block.caseSensitive
      ? userAnswer.trim() === currentItem.correctAnswer.trim()
      : userAnswer.trim().toLowerCase() === currentItem.correctAnswer.trim().toLowerCase()
    setResults(prev => ({ ...prev, [currentItem.id]: isCorrect }))
    
    // Sync result to teacher
    if (classroomSync.canInteract) {
      classroomSync.sendBlockResponse(block.id, 'short_answer', {
        itemId: currentItem.id,
        answer: userAnswer,
        isCorrect,
      }, isCorrect, isCorrect ? 1 : 0)
    }
  }

  const handleNav = (newStep: number) => {
    if (isTeacherInClassroom) return
    setCurrentStep(newStep)
    
    if (classroomSync.canInteract) {
      classroomSync.syncBlockNavigation(block.id, newStep, items.length, true, false, answers)
    }
  }

  const reset = () => {
    if (isTeacherInClassroom) return
    setAnswers({})
    setResults({})
    setCurrentStep(0)
  }

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-8">
        No hay preguntas configuradas
      </div>
    )
  }

  const currentResult = displayItem ? results[displayItem.id] : null
  const answeredCount = Object.keys(results).length
  const correctCount = Object.values(results).filter(r => r === true).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <MessageSquare className="h-5 w-5" />
          <span>Respuesta Corta</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Pregunta {displayStep + 1} de {items.length}
        </div>
      </div>

      {block.context && (
        <div className="bg-muted/30 p-4 rounded-lg border text-sm leading-relaxed">
          {block.context}
        </div>
      )}

      {displayItem && (
        <div key={displayItem.id} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="font-medium text-lg">
            {displayStep + 1}. {displayItem.question}
          </div>

          <input
            type="text"
            value={displayAnswers[displayItem.id] || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            disabled={(currentResult !== null && currentResult !== undefined) || isTeacherInClassroom}
            placeholder={isTeacherInClassroom ? "Esperando respuesta del estudiante..." : "Escribe tu respuesta..."}
            className={cn(
              "w-full px-4 py-3 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors",
              currentResult === true && "border-green-500 bg-green-50 text-green-700",
              currentResult === false && "border-red-500 bg-red-50 text-red-700",
              (currentResult === null || currentResult === undefined) && "border-gray-200",
              isTeacherInClassroom && "cursor-default"
            )}
          />

          {currentResult === false && displayItem && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
              <span className="font-medium">Respuesta correcta:</span> {displayItem.correctAnswer}
            </div>
          )}
        </div>
      )}

      {!isTeacherInClassroom && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleNav(currentStep - 1)} disabled={currentStep === 0} size="sm">
              Anterior
            </Button>
            <Button variant="outline" onClick={() => handleNav(currentStep + 1)} disabled={currentStep >= items.length - 1} size="sm">
              Siguiente
            </Button>
          </div>

          <div className="flex gap-2">
            {currentResult === null || currentResult === undefined ? (
              <Button onClick={checkAnswer} disabled={!answers[currentItem?.id || '']} size="sm">
                Verificar
              </Button>
            ) : currentStep < items.length - 1 ? (
              <Button onClick={() => handleNav(currentStep + 1)} size="sm">
                Siguiente Pregunta
              </Button>
            ) : (
              <Button variant="outline" onClick={reset} size="sm">
                Reintentar Todo
              </Button>
            )}
          </div>
        </div>
      )}

      {answeredCount === items.length && (
        <div className="bg-muted/30 p-3 rounded-lg text-center">
          <span className="font-medium">Resultado:</span> {correctCount} de {items.length} correctas
        </div>
      )}
    </div>
  )
}

function MultiSelectBlockPreview({ block }: { block: MultiSelectBlock }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showResult, setShowResult] = useState(false)

  // Get classroom sync
  const classroomSync = useClassroomSync()
  const remoteNav = classroomSync.getRemoteNavigation(block.id)
  const isTeacherInClassroom = classroomSync.isInClassroom && classroomSync.isTeacher
  
  // For teachers: use remote selections
  const displaySelectedIds = isTeacherInClassroom && remoteNav?.currentAnswers 
    ? new Set(Object.keys(remoteNav.currentAnswers).filter(k => remoteNav.currentAnswers![k] === 'true'))
    : selectedIds

  const allOptions = [
    ...(block.correctOptions || []).map(opt => ({ ...opt, isCorrect: true })),
    ...(block.incorrectOptions || []).map(opt => ({ ...opt, isCorrect: false })),
  ]

  const [shuffledOptions] = useState(() => 
    [...allOptions].sort(() => Math.random() - 0.5)
  )

  const toggleOption = (id: string) => {
    if (showResult || isTeacherInClassroom) return
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
    
    // Sync to teacher
    if (classroomSync.canInteract) {
      const answersForSync = Object.fromEntries([...newSelected].map(id => [id, 'true']))
      classroomSync.syncBlockNavigation(block.id, 0, 1, true, false, answersForSync)
    }
  }

  const checkAnswers = () => {
    if (isTeacherInClassroom) return
    setShowResult(true)
    
    // Sync result to teacher
    if (classroomSync.canInteract) {
      const correctIds = new Set((block.correctOptions || []).map(opt => opt.id))
      const selectedCorrectCount = [...selectedIds].filter(id => correctIds.has(id)).length
      const selectedIncorrectCount = [...selectedIds].filter(id => !correctIds.has(id)).length
      const totalCorrectCount = block.correctOptions?.length || 0
      const isAllCorrect = selectedCorrectCount === totalCorrectCount && selectedIncorrectCount === 0
      
      classroomSync.sendBlockResponse(block.id, 'multi_select', {
        selectedIds: [...selectedIds],
        correctCount: selectedCorrectCount,
        incorrectCount: selectedIncorrectCount,
      }, isAllCorrect, selectedCorrectCount)
    }
  }

  const reset = () => {
    if (isTeacherInClassroom) return
    setSelectedIds(new Set())
    setShowResult(false)
  }

  const correctIds = new Set((block.correctOptions || []).map(opt => opt.id))
  const selectedCorrect = [...displaySelectedIds].filter(id => correctIds.has(id)).length
  const selectedIncorrect = [...displaySelectedIds].filter(id => !correctIds.has(id)).length
  const totalCorrect = block.correctOptions?.length || 0

  if (!block.correctOptions?.length && !block.incorrectOptions?.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <CheckCircle2 className="h-5 w-5" />
          <span>Selección Múltiple</span>
        </div>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Sin opciones configuradas</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <CheckCircle2 className="h-5 w-5" />
        <span>Selección Múltiple</span>
      </div>

      {block.title && <h3 className="text-xl font-bold">{block.title}</h3>}
      
      {block.instruction && (
        <p className="text-muted-foreground text-sm">{block.instruction}</p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {shuffledOptions.map((option) => {
          const isSelected = displaySelectedIds.has(option.id)
          const isCorrectOption = option.isCorrect

          let optionClass = "border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5"
          
          if (showResult) {
            if (isCorrectOption && isSelected) {
              optionClass = "border-green-500 bg-green-50 text-green-700"
            } else if (isCorrectOption && !isSelected) {
              optionClass = "border-green-300 bg-green-50/50 text-green-600 border-dashed"
            } else if (!isCorrectOption && isSelected) {
              optionClass = "border-red-500 bg-red-50 text-red-700"
            } else {
              optionClass = "border-gray-200 bg-gray-50 text-gray-500"
            }
          } else if (isSelected) {
            optionClass = "border-primary bg-primary/10 ring-2 ring-primary/20"
          }

          return (
            <div
              key={option.id}
              onClick={() => toggleOption(option.id)}
              className={cn(
                "p-4 border-2 rounded-lg transition-all flex items-center gap-3",
                isTeacherInClassroom ? "cursor-default" : "cursor-pointer",
                optionClass
              )}
            >
              <div className={cn(
                "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                isSelected ? "border-current bg-current" : "border-gray-300"
              )}>
                {isSelected && (
                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                  </svg>
                )}
              </div>
              <span className="flex-1 font-medium">{option.text}</span>
              {showResult && (
                <span className="text-xs font-bold">
                  {isCorrectOption ? '✓' : '✗'}
                </span>
              )}
            </div>
          )
        })}
      </div>
      
      {isTeacherInClassroom && !showResult && (
        <p className="text-sm text-muted-foreground italic text-center">Esperando selección del estudiante...</p>
      )}

      {showResult && (
        <div className={cn(
          "p-4 rounded-lg text-center space-y-2",
          selectedIncorrect === 0 && selectedCorrect === totalCorrect
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700"
        )}>
          <p className="font-bold">
            {selectedIncorrect === 0 && selectedCorrect === totalCorrect
              ? "¡Perfecto! Seleccionaste todas las correctas"
              : `${selectedCorrect} de ${totalCorrect} correctas seleccionadas`}
          </p>
          {selectedIncorrect > 0 && (
            <p className="text-sm">
              {selectedIncorrect} opción(es) incorrecta(s) seleccionada(s)
            </p>
          )}
          {block.explanation && (
            <p className="text-sm mt-2 pt-2 border-t border-current/20">
              {block.explanation}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-center">
        {!showResult ? (
          <Button onClick={checkAnswers} disabled={selectedIds.size === 0} size="sm">
            Verificar Respuestas
          </Button>
        ) : (
          <Button variant="outline" onClick={reset} size="sm">
            Reintentar
          </Button>
        )}
      </div>
    </div>
  )
}

function MultipleChoiceBlockPreview({ block }: { block: MultipleChoiceBlock }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  const handleCheck = () => {
    setShowResult(true)
  }

  const handleReset = () => {
    setSelectedOption(null)
    setShowResult(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <CheckCircle2 className="h-5 w-5" />
        <span>Opción Múltiple</span>
      </div>

      {block.question && (
        <h3 className="font-bold text-lg">{block.question}</h3>
      )}

      <div className="space-y-2">
        {block.options?.map((option) => {
          const isSelected = selectedOption === option.id
          const isCorrect = option.id === block.correctOptionId

          let statusClass = "border-gray-200 bg-white hover:border-primary/50"
          if (showResult) {
            if (isCorrect) {
              statusClass = "border-green-500 bg-green-50"
            } else if (isSelected && !isCorrect) {
              statusClass = "border-red-500 bg-red-50"
            }
          } else if (isSelected) {
            statusClass = "border-primary bg-primary/5"
          }

          return (
            <div
              key={option.id}
              onClick={() => !showResult && setSelectedOption(option.id)}
              className={cn(
                "p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3",
                statusClass
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                isSelected ? "border-primary" : "border-gray-300",
                showResult && isCorrect && "border-green-500 bg-green-500",
                showResult && isSelected && !isCorrect && "border-red-500 bg-red-500"
              )}>
                {(isSelected || (showResult && isCorrect)) && (
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    showResult && isCorrect ? "bg-white" : showResult && isSelected ? "bg-white" : "bg-primary"
                  )} />
                )}
              </div>
              <span className="flex-1">{option.text}</span>
              {showResult && isCorrect && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        {!showResult ? (
          <Button onClick={handleCheck} disabled={!selectedOption} size="sm">
            Verificar
          </Button>
        ) : (
          <Button variant="outline" onClick={handleReset} size="sm">
            Reintentar
          </Button>
        )}
      </div>

      {showResult && block.explanation && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>Explicación:</strong> {block.explanation}
        </div>
      )}
    </div>
  )
}

function OrderingBlockPreview({ block }: { block: OrderingBlock }) {
  const [items, setItems] = useState(() => 
    block.items ? [...block.items].sort(() => Math.random() - 0.5) : []
  )
  const [showResult, setShowResult] = useState(false)

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (showResult) return
    const newItems = [...items]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return
    ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
    setItems(newItems)
  }

  const handleCheck = () => {
    setShowResult(true)
  }

  const handleReset = () => {
    setItems(block.items ? [...block.items].sort(() => Math.random() - 0.5) : [])
    setShowResult(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <LucideIcons.ArrowUpDown className="h-5 w-5" />
        <span>Ordenar</span>
      </div>

      {block.title && <h3 className="font-bold text-lg">{block.title}</h3>}
      {block.instruction && <p className="text-muted-foreground">{block.instruction}</p>}

      <div className="space-y-2">
        {items.map((item, index) => {
          const isCorrectPosition = showResult && item.correctPosition === index + 1

          return (
            <div
              key={item.id}
              className={cn(
                "p-3 border rounded-lg flex items-center gap-3 transition-all",
                showResult
                  ? isCorrectPosition
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
                  : "border-gray-200 bg-white"
              )}
            >
              <span className="font-bold text-muted-foreground w-6">{index + 1}.</span>
              <span className="flex-1">{item.text}</span>
              {!showResult && (
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                  >
                    <LucideIcons.ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === items.length - 1}
                  >
                    <LucideIcons.ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {showResult && (
                isCorrectPosition
                  ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                  : <LucideIcons.X className="h-5 w-5 text-red-500" />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        {!showResult ? (
          <Button onClick={handleCheck} size="sm">
            Verificar
          </Button>
        ) : (
          <Button variant="outline" onClick={handleReset} size="sm">
            Reintentar
          </Button>
        )}
      </div>
    </div>
  )
}

function DragDropBlockPreview({ block }: { block: DragDropBlock }) {
  const [assignments, setAssignments] = useState<Record<string, string>>({}) // itemId -> categoryId
  const [showResult, setShowResult] = useState(false)

  const handleAssign = (itemId: string, categoryId: string) => {
    if (showResult) return
    setAssignments(prev => ({ ...prev, [itemId]: categoryId }))
  }

  const handleCheck = () => {
    setShowResult(true)
  }

  const handleReset = () => {
    setAssignments({})
    setShowResult(false)
  }

  const unassignedItems = block.items?.filter(item => !assignments[item.id]) || []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <LucideIcons.MousePointerSquareDashed className="h-5 w-5" />
        <span>Arrastrar y Soltar</span>
      </div>

      {block.title && <h3 className="font-bold text-lg">{block.title}</h3>}
      {block.instruction && <p className="text-muted-foreground">{block.instruction}</p>}

      {/* Unassigned items */}
      {unassignedItems.length > 0 && (
        <div className="p-3 bg-muted/30 rounded-lg border-2 border-dashed">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Elementos por clasificar:</p>
          <div className="flex flex-wrap gap-2">
            {unassignedItems.map(item => (
              <Badge key={item.id} variant="secondary" className="cursor-pointer hover:bg-primary/20">
                {item.text}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="grid grid-cols-2 gap-4">
        {block.categories?.map(category => {
          const categoryItems = block.items?.filter(item => assignments[item.id] === category.id) || []

          return (
            <div
              key={category.id}
              className="p-3 border-2 border-dashed rounded-lg min-h-[100px]"
            >
              <h4 className="font-semibold text-sm mb-2 text-center">{category.name}</h4>
              <div className="space-y-1">
                {categoryItems.map(item => {
                  const isCorrect = item.correctCategoryId === category.id

                  return (
                    <div
                      key={item.id}
                      onClick={() => !showResult && handleAssign(item.id, '')}
                      className={cn(
                        "p-2 rounded text-sm cursor-pointer transition-all",
                        showResult
                          ? isCorrect
                            ? "bg-green-100 border border-green-300"
                            : "bg-red-100 border border-red-300"
                          : "bg-primary/10 border border-primary/20 hover:bg-primary/20"
                      )}
                    >
                      {item.text}
                      {showResult && (
                        isCorrect
                          ? <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-2" />
                          : <LucideIcons.X className="h-4 w-4 text-red-500 inline ml-2" />
                      )}
                    </div>
                  )
                })}
                {categoryItems.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Arrastra elementos aquí
                  </p>
                )}
              </div>
              {/* Click to assign buttons for unassigned items */}
              {!showResult && unassignedItems.length > 0 && (
                <div className="mt-2 pt-2 border-t border-dashed">
                  <p className="text-xs text-muted-foreground mb-1">Clic para agregar:</p>
                  <div className="flex flex-wrap gap-1">
                    {unassignedItems.map(item => (
                      <Badge
                        key={item.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 text-xs"
                        onClick={() => handleAssign(item.id, category.id)}
                      >
                        + {item.text}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        {!showResult ? (
          <Button onClick={handleCheck} disabled={unassignedItems.length > 0} size="sm">
            Verificar
          </Button>
        ) : (
          <Button variant="outline" onClick={handleReset} size="sm">
            Reintentar
          </Button>
        )}
      </div>
    </div>
  )
}

function TeacherNotesBlockPreview({ block }: { block: TeacherNotesBlock }) {
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      icon: 'text-yellow-600',
      title: 'text-yellow-800',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      icon: 'text-blue-600',
      title: 'text-blue-800',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      icon: 'text-green-600',
      title: 'text-green-800',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-300',
      icon: 'text-purple-600',
      title: 'text-purple-800',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      icon: 'text-orange-600',
      title: 'text-orange-800',
    },
  }

  const colors = colorClasses[block.highlightColor || 'yellow']

  return (
    <div className={cn(
      "rounded-xl border-2 border-dashed p-5 space-y-3",
      colors.bg,
      colors.border
    )}>
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg", colors.bg)}>
          <LucideIcons.StickyNote className={cn("h-5 w-5", colors.icon)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-bold uppercase tracking-wider", colors.icon)}>
              Solo para el profesor
            </span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", colors.border, colors.icon)}>
              No visible para estudiantes
            </Badge>
          </div>
          {block.title && (
            <h3 className={cn("font-semibold text-lg mt-1", colors.title)}>
              {block.title}
            </h3>
          )}
        </div>
      </div>

      {block.content ? (
        <div 
          className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      ) : (
        <p className="text-gray-500 italic text-sm">
          Sin contenido. Edita este bloque para agregar indicaciones.
        </p>
      )}
    </div>
  )
}
