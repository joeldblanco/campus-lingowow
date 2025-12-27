import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
  Edit3,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BlockPreviewProps {
  block: Block
}

export function BlockPreview({ block }: BlockPreviewProps) {
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
      case 'recording':
        return <RecordingBlockPreview block={block as RecordingBlock} />
      case 'structured-content':
        return <StructuredContentBlockPreview block={block as StructuredContentBlock} />
      case 'grammar-visualizer':
        return <GrammarVisualizerBlockPreview block={block as GrammarVisualizerBlock} />
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
    <Card className="overflow-hidden shadow-none">
      <CardContent className="p-6">{renderBlockContent()}</CardContent>
    </Card>
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

  const questionCount = block.questions?.length || 0
  const currentQuestion = block.questions?.[currentQuestionIndex]

  const handleStart = () => {
    setHasStarted(true)
    setCurrentQuestionIndex(0)
    setAnswers({})
    setShowResults(false)
  }

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion) return
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < (block.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      setShowResults(true)
    }
  }

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
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

  // Initial View
  if (!hasStarted) {
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
          <Button onClick={handleStart} disabled={questionCount === 0}>
            <Play className="h-4 w-4 mr-2" />
            Comenzar Quiz
          </Button>
        </div>
      </div>
    )
  }

  // Results View
  if (showResults) {
    const { score, totalPoints } = calculateScore()
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
    const passed = !block.passingScore || percentage >= block.passingScore

    return (
      <div className="space-y-6 text-center animate-in fade-in duration-500">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">Resumen del Quiz</h3>
          <p className="text-muted-foreground">Has completado el cuestionario</p>
        </div>

        <div className={cn(
          "p-8 rounded-full h-40 w-40 flex flex-col items-center justify-center mx-auto border-4",
          passed ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-500 text-red-700"
        )}>
          <span className="text-4xl font-bold">{percentage}%</span>
          <span className="text-xs font-semibold uppercase mt-1">{passed ? 'Aprobado' : 'Reprobado'}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-sm">
          <div className="bg-muted p-3 rounded">
            <p className="text-muted-foreground">Puntaje</p>
            <p className="font-bold text-lg">{score} / {totalPoints}</p>
          </div>
          <div className="bg-muted p-3 rounded">
            <p className="text-muted-foreground">Correctas</p>
            <p className="font-bold text-lg">
              {Object.keys(answers).filter(qid => {
                const q = block.questions?.find(que => que.id === qid)
                return q && answers[qid] === q.correctAnswer
              }).length} / {questionCount}
            </p>
          </div>
        </div>

        <Button onClick={handleStart} variant="outline">
          Intentar de nuevo
        </Button>
      </div>
    )
  }

  // Question View
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Pregunta {currentQuestionIndex + 1} de {questionCount}</span>
        <span>{Math.round(((currentQuestionIndex + 1) / questionCount) * 100)}% completado</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${((currentQuestionIndex + 1) / questionCount) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[300px] flex flex-col">
        <h3 className="text-xl font-bold mb-6">{currentQuestion?.question}</h3>

        <div className="flex-1 space-y-3">
          {currentQuestion?.type === 'multiple-choice' && currentQuestion.options?.map((opt, i) => (
            <div
              key={i}
              onClick={() => handleAnswerSelect(opt)}
              className={cn(
                "p-4 border rounded-lg cursor-pointer transition-all flex items-center gap-3 hover:bg-muted/50",
                answers[currentQuestion.id] === opt ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input"
              )}
            >
              <div className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                answers[currentQuestion.id] === opt ? "border-primary" : "border-muted-foreground"
              )}>
                {answers[currentQuestion.id] === opt && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </div>
              <span className="text-base">{opt}</span>
            </div>
          ))}

          {currentQuestion?.type === 'true-false' && (
            <div className="grid grid-cols-2 gap-4">
              {['Verdadero', 'Falso'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswerSelect(opt)}
                  className={cn(
                    "p-8 border-2 rounded-xl font-bold text-lg transition-all hover:scale-[1.02]",
                    answers[currentQuestion.id] === opt
                      ? (opt === 'Verdadero' ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700")
                      : "border-muted bg-card hover:bg-muted/50"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {currentQuestion?.type === 'short-answer' && (
            <Textarea
              placeholder="Escribe tu respuesta aquí..."
              className="min-h-[150px] text-lg p-4"
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerSelect(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={handlePrev} disabled={currentQuestionIndex === 0}>
          Anterior
        </Button>
        <Button onClick={handleNext} disabled={!answers[currentQuestion?.id || '']}>
          {currentQuestionIndex === questionCount - 1 ? 'Finalizar' : 'Siguiente'}
        </Button>
      </div>

      {/* Debug Info (Optional, can be removed) */}
      {/* <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(answers, null, 2)}</pre> */}
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
                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">
                          {grammarInfo.label}
                        </span>
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
  // Determine color/label based on type string used in editor
  // Ideally share this logic, but for preview we can duplicate or import
  const map: Record<string, { label: string, color: string, bg: string }> = {
    'subject': { label: 'Sujeto', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    'verb': { label: 'Verbo', color: 'text-green-700', bg: 'bg-green-100' },
    'object': { label: 'Objeto', color: 'text-blue-700', bg: 'bg-blue-100' },
    'adverb': { label: 'Adverbio', color: 'text-purple-700', bg: 'bg-purple-100' },
    'negation': { label: 'Negación', color: 'text-red-700', bg: 'bg-red-100' },
    'preposition': { label: 'Preposición', color: 'text-orange-700', bg: 'bg-orange-100' },
    'article': { label: 'Artículo', color: 'text-gray-700', bg: 'bg-gray-100' },
    'pronoun': { label: 'Pronombre', color: 'text-indigo-700', bg: 'bg-indigo-100' },
    'punctuation': { label: 'Puntuación', color: 'text-slate-700', bg: 'bg-slate-100' },
    'other': { label: 'Otro', color: 'text-zinc-700', bg: 'bg-zinc-100' }
  }
  return map[type || 'other'] || map['other']
}
function EmbedBlockPreview({ block }: { block: EmbedBlock }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <Link className="h-5 w-5" />
        <span>Embebido</span>
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
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div
            className="bg-muted flex items-center justify-center"
            style={{ height: block.height || 400 }}
          >
            <div className="text-center space-y-4">
              <Link className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <p className="text-sm text-muted-foreground">Contenido embebido</p>
                <p className="text-xs text-muted-foreground truncate max-w-xs">{block.url}</p>
              </div>
            </div>
          </div>
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
  const items = block.items || []
  const currentItem = items[index]

  // If no items but legacy content exists (migration fallback logic not strictly needed if we assume clean state, 
  // but good for dev). We'll assuming items are populated.

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Edit3 className="h-5 w-5" />
          <span>Rellenar Espacios</span>
        </div>
        {items.length > 1 && (
          <span className="text-xs text-muted-foreground">
            Ejercicio {index + 1} de {items.length}
          </span>
        )}
      </div>

      {block.title && <h3 className="text-xl font-bold">{block.title}</h3>}

      <div className="relative">
        <FillBlanksExercise item={currentItem} key={currentItem.id} />

        {items.length > 1 && (
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIndex(prev => Math.max(0, prev - 1))}
              disabled={index === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIndex(prev => Math.min(items.length - 1, prev + 1))}
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

function FillBlanksExercise({ item }: { item: { id: string, content: string } }) {
  const parts = item.content ? item.content.split(/(\[[^\]]+\])/g) : []
  const [inputs, setInputs] = useState<Record<number, string>>({})
  const [showResult, setShowResult] = useState(false)

  const checkAnswers = () => setShowResult(true)
  const reset = () => {
    setInputs({})
    setShowResult(false)
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-6 bg-white rounded-xl border shadow-sm leading-loose text-lg">
        {parts.map((part, i) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const answer = part.slice(1, -1)
            const userAnswer = inputs[i] || ''
            const isCorrect = userAnswer.toLowerCase().trim() === answer.toLowerCase().trim()

            return (
              <span key={i} className="mx-1 inline-block relative">
                <input
                  value={userAnswer}
                  onChange={(e) => setInputs(prev => ({ ...prev, [i]: e.target.value }))}
                  disabled={showResult}
                  className={cn(
                    "border-b-2 px-2 py-0.5 text-center min-w-[80px] font-medium focus:outline-none rounded-t transition-colors",
                    showResult
                      ? (isCorrect ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700")
                      : "border-primary/50 bg-primary/5 text-primary"
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
        {(!item.content) && (
          <div className="text-muted-foreground italic text-sm">Contenido no configurado</div>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={checkAnswers} disabled={showResult} size="sm">
          Verificar
        </Button>
        <Button variant="outline" onClick={reset} disabled={!showResult} size="sm">
          Reintentar
        </Button>
      </div>
    </div>
  )
}

function MatchBlockPreview({ block }: { block: MatchBlock }) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [matches, setMatches] = useState<Record<string, string>>({}) // leftId -> rightId
  const [shuffledRight, setShuffledRight] = useState<Array<{ id: string, text: string }>>([])
  const [showResult, setShowResult] = useState(false)

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
  useState(() => {
    init()
  })

  // Re-shuffle when block pairs change effectively (or manual reset)
  const handleReset = () => {
    init()
  }

  const handleLeftClick = (id: string) => {
    if (showResult) return
    if (matches[id]) {
      // Unselect if already matched? Or just reselect to change?
      // Simple: Allow re-selection
      const newMatches = { ...matches }
      delete newMatches[id]
      setMatches(newMatches)
    }
    setSelectedLeft(id)
  }

  const handleRightClick = (rightId: string) => {
    if (showResult) return
    if (selectedLeft) {
      setMatches(prev => ({ ...prev, [selectedLeft]: rightId }))
      setSelectedLeft(null)
    }
  }

  const checkAnswers = () => {
    setShowResult(true)
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
            const isMatched = !!matches[pair.id]
            const isSelected = selectedLeft === pair.id
            const matchedRightId = matches[pair.id]

            // Check correctness if showing result
            let statusClass = "border-gray-200 bg-white"
            if (showResult && isMatched) {
              // The correct right ID for this left ID is... pair.id (assuming ids match in pair object source) 
              // Wait, pair structure is {id, left, right}. So if I matched pair.id(Left) with pair.id(Right from shuffled), it is correct.
              // But wait, shuffledRight has same IDs? Yes, created from block.pairs.
              statusClass = matchedRightId === pair.id
                ? "border-green-500 bg-green-50"
                : "border-red-500 bg-red-50"
            } else if (isSelected) {
              statusClass = "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
            } else if (isMatched) {
              statusClass = "border-blue-200 bg-blue-50/50"
            }

            return (
              <div
                key={`l-${pair.id}`}
                onClick={() => handleLeftClick(pair.id)}
                className={cn(
                  "p-4 border rounded-lg shadow-sm font-medium flex items-center justify-between cursor-pointer transition-all hover:shadow-md",
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
            const connectedLeftId = Object.keys(matches).find(key => matches[key] === item.id)
            const isConnected = !!connectedLeftId

            let statusClass = "border-2 border-dashed border-gray-200 bg-muted/30"
            if (showResult && isConnected) {
              // Correct logic: The left side 'connectedLeftId' should match this item.id
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
  const items = block.items || []
  const currentItem = items[index]

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <CheckCircle2 className="h-5 w-5" />
          <span>Verdadero o Falso</span>
        </div>
        {items.length > 1 && (
          <span className="text-xs text-muted-foreground">
            Pregunta {index + 1} de {items.length}
          </span>
        )}
      </div>

      {block.title && <h3 className="text-xl font-bold">{block.title}</h3>}

      <div className="relative">
        <TrueFalseExercise item={currentItem} key={currentItem.id} />

        {items.length > 1 && (
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIndex(prev => Math.max(0, prev - 1))}
              disabled={index === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIndex(prev => Math.min(items.length - 1, prev + 1))}
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

function TrueFalseExercise({ item }: { item: { id: string, statement: string, correctAnswer: boolean } }) {
  const [selected, setSelected] = useState<boolean | null>(null)
  const [showResult, setShowResult] = useState(false)

  const checkAnswer = () => {
    setShowResult(true)
  }

  return (
    <div className="p-6 bg-white border rounded-xl shadow-sm text-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <h3 className="text-xl font-medium leading-relaxed">
        {item.statement || "Afirmación..."}
      </h3>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => setSelected(true)}
          disabled={showResult}
          className={cn(
            "px-8 py-3 rounded-lg border-2 font-bold transition-all flex items-center gap-2",
            selected === true
              ? "bg-green-600 text-white border-green-600"
              : "bg-green-50 text-green-700 border-green-100 hover:bg-green-100"
          )}
        >
          Verdadero
        </button>
        <button
          onClick={() => setSelected(false)}
          disabled={showResult}
          className={cn(
            "px-8 py-3 rounded-lg border-2 font-bold transition-all flex items-center gap-2",
            selected === false
              ? "bg-red-600 text-white border-red-600"
              : "bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
          )}
        >
          Falso
        </button>
      </div>

      {showResult && (
        <div className={cn("p-2 rounded font-bold", selected === item.correctAnswer ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100")}>
          {selected === item.correctAnswer ? "¡Correcto!" : "Incorrecto"}
        </div>
      )}

      {!showResult && (
        <Button onClick={checkAnswer} disabled={selected === null} size="sm">
          Enviar Respuesta
        </Button>
      )}
    </div>
  )
}

function EssayBlockPreview({ block }: { block: EssayBlock }) {
  const [text, setText] = useState('')
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <FileSignature className="h-5 w-5" />
        <span>Ensayo</span>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold text-lg">{block.prompt || 'Escribe tu respuesta aquí...'}</h3>
        {block.minWords && <p className="text-xs text-muted-foreground">Mínimo {block.minWords} palabras</p>}
      </div>

      <textarea
        className="w-full p-4 rounded-lg border bg-background min-h-[150px] focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="Escribe tu respuesta..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className={cn(block.minWords && wordCount < block.minWords ? "text-red-500" : "text-green-600")}>
          {wordCount} palabras
        </span>
        {block.maxWords && <span>Máx {block.maxWords}</span>}
      </div>
      <div className="flex justify-end">
        <Button size="sm">Enviar Ensayo</Button>
      </div>
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
  useState(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <Mic className="h-5 w-5" />
        <span>Grabación</span>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl space-y-6 text-center">
        <div className="space-y-2">
          <h3 className="font-medium text-lg text-blue-900">
            {block.instruction || 'Graba tu respuesta...'}
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
