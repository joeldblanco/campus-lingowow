'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  ChevronDown,
  Lightbulb,
  Mic,
  Square,
} from 'lucide-react'
import type { EssayGradingResult } from '@/lib/services/essay-grading'
import type { Block, EssayBlock, RecordingBlock } from '@/types/course-builder'
import { Button } from '@/components/ui/button'
import { EssayAIGrading } from './essay-ai-grading'
import { RecordingAIGrading } from './recording-ai-grading'
import { cn } from '@/lib/utils'
import { useClassroomSync } from '@/components/classroom/use-classroom-sync'
import recordingControlStyles from './unit1-production.module.css'

import { getUnit1ProductionRole } from '@/lib/unit1-production-role'
export { getUnit1ProductionRole, isUnit1ProductionBlock } from '@/lib/unit1-production-role'

export interface Unit1ProductionProps {
  block: Block
  guidedActionTarget?: HTMLElement | null
  onGuidedCompletionChange?: (done: boolean) => void
  onRecordingStateChange?: (active: boolean) => void
  isTeacher?: boolean
  isClassroom?: boolean
}

type Unit1Data = Record<string, unknown>

interface SentenceLine {
  id: string
  text: string
  correction?: string
}

interface ConversationTurn {
  id: string
  question: string
  audioUrl?: string
  answerPrompt?: string
}

const ACTION_CLASS =
  'min-h-12 rounded-full bg-[#245CFF] px-6 text-base leading-6 text-white shadow-sm hover:bg-[#10245C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10245C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

const DEFAULT_CONVERSATION_TURNS: ConversationTurn[] = [
  { id: 'name', question: 'What is your name?' },
  { id: 'age', question: 'How old are you?' },
  { id: 'origin', question: 'Where are you from?' },
  { id: 'occupation', question: 'What do you do?' },
  { id: 'address', question: 'Where do you live?' },
]

const DEFAULT_SENTENCE_IDEAS = [
  'I am a student.',
  'My sister is a teacher.',
  'We are from Mexico.',
]

function getUnit1Data(block: Block): Unit1Data {
  return block.data && typeof block.data === 'object' ? block.data : {}
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readArray(data: Unit1Data, keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key]
  }
  return []
}

function normalizeSentenceLines(block: EssayBlock): SentenceLine[] {
  const data = getUnit1Data(block)
  const rawLines = readArray(data, ['sentences', 'sentenceLines', 'lines', 'items'])
  const lines = rawLines.slice(0, 8).map((item, index): SentenceLine => {
    if (typeof item === 'string') {
      return { id: `sentence-${index + 1}`, text: item }
    }

    if (item && typeof item === 'object') {
      const line = item as Record<string, unknown>
      return {
        id: asString(line.id) || `sentence-${index + 1}`,
        text: asString(line.answer) || asString(line.value) || asString(line.text) || '',
        correction: asString(line.correction) || asString(line.corrected),
      }
    }

    return { id: `sentence-${index + 1}`, text: '' }
  })

  return Array.from({ length: 8 }, (_, index) => lines[index] || { id: `sentence-${index + 1}`, text: '' })
}

function normalizeIdeas(block: EssayBlock): string[] {
  const data = getUnit1Data(block)
  const ideas = readArray(data, ['ideas', 'sentenceIdeas', 'examples'])
    .map(asString)
    .filter((value): value is string => Boolean(value))
  return ideas.length > 0 ? ideas : DEFAULT_SENTENCE_IDEAS
}

function normalizeTurns(block: RecordingBlock): ConversationTurn[] {
  const data = getUnit1Data(block)
  const rawTurns = readArray(data, ['turns', 'guidedTurns', 'conversationTurns', 'questions'])
  const turns = rawTurns
    .map((item, index): ConversationTurn | null => {
      if (typeof item === 'string') {
        return { id: `turn-${index + 1}`, question: item }
      }

      if (!item || typeof item !== 'object') return null
      const turn = item as Record<string, unknown>
      const question =
        asString(turn.question) || asString(turn.prompt) || asString(turn.text) || asString(turn.instruction)
      if (!question) return null

      const audio = turn.audio
      const audioUrl =
        asString(turn.audioUrl) ||
        asString(turn.audioURL) ||
        asString(audio) ||
        (audio && typeof audio === 'object' ? asString((audio as Record<string, unknown>).url) : undefined)

      return {
        id: asString(turn.id) || `turn-${index + 1}`,
        question,
        audioUrl,
        answerPrompt: asString(turn.answerPrompt) || asString(turn.followUp),
      }
    })
    .filter((turn): turn is ConversationTurn => Boolean(turn))

  return turns.length === 5 ? turns : DEFAULT_CONVERSATION_TURNS
}

function renderAction(action: ReactNode, target?: HTMLElement | null) {
  return target ? createPortal(action, target) : <div className="flex justify-end">{action}</div>
}

function useCompletionReport(done: boolean, onChange?: (done: boolean) => void) {
  const callbackRef = useRef(onChange)
  const lastReportedRef = useRef<boolean | null>(null)

  useEffect(() => {
    callbackRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (lastReportedRef.current === done) return
    lastReportedRef.current = done
    callbackRef.current?.(done)
  }, [done])

  useEffect(() => {
    return () => {
      if (lastReportedRef.current !== null) callbackRef.current?.(false)
    }
  }, [])
}

function useRecordingReport(active: boolean, onChange?: (active: boolean) => void) {
  const callbackRef = useRef(onChange)

  useEffect(() => {
    callbackRef.current = onChange
  }, [onChange])

  useEffect(() => {
    callbackRef.current?.(active)
    return () => {
      if (active) callbackRef.current?.(false)
    }
  }, [active])

  useEffect(() => {
    return () => callbackRef.current?.(false)
  }, [])
}

function SentenceProduction({
  block,
  guidedActionTarget,
  onGuidedCompletionChange,
  isTeacher = false,
}: Unit1ProductionProps & { block: EssayBlock }) {
  const initialLines = useMemo(() => normalizeSentenceLines(block), [block])
  const [lines, setLines] = useState<SentenceLine[]>(initialLines)
  const [showIdeas, setShowIdeas] = useState(false)
  const [gradingState, setGradingState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [corrections, setCorrections] = useState<EssayGradingResult['feedback']['grammar']['corrections']>([])
  const classroomSync = useClassroomSync()

  useEffect(() => {
    setLines(initialLines)
    setGradingState('idle')
    setCorrections([])
  }, [initialLines])

  const filledCount = lines.filter((line) => line.text.trim()).length
  const essayText = lines.map((line) => line.text.trim()).filter(Boolean).join('\n')
  const ideas = normalizeIdeas(block)
  const prompt =
    asString(getUnit1Data(block).productionPrompt) ||
    block.prompt ||
    'Escribe 8 frases con am, is o are.'
  const canReview = filledCount === 8 && Boolean(essayText) && !isTeacher && gradingState !== 'loading'
  const completed = gradingState === 'success' && !isTeacher

  useCompletionReport(completed, onGuidedCompletionChange)

  const updateLine = (index: number, text: string) => {
    if (isTeacher) return
    setGradingState('idle')
    setCorrections([])
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, text } : line)))
  }

  const reviewAction = block.aiGrading === false ? (
    <Button type="button" className={ACTION_CLASS} disabled={!canReview}>
      Revisar mis frases
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Button>
  ) : (
    <EssayAIGrading
      essayText={essayText}
      prompt={prompt}
      blockId={block.id}
      language={block.aiGradingConfig?.language || 'english'}
      targetLevel={block.aiGradingConfig?.targetLevel || 'A1'}
      disabled={!canReview}
      className={ACTION_CLASS}
      label="Revisar mis frases"
      onGradingStateChange={setGradingState}
      onSyncResponse={
        classroomSync.canInteract ? classroomSync.sendBlockResponse : undefined
      }
      onGraded={(result) => {
        setCorrections(result.detailedResult.feedback.grammar.corrections)
        setGradingState('success')
      }}
    />
  )

  return (
    <section
      data-unit1-role="sentences"
      aria-labelledby={`unit1-sentences-${block.id}`}
      className="space-y-6 text-[#10245C]"
    >
      <p id={`unit1-sentences-${block.id}`} className="text-base leading-6 text-[#10245C]">
        {prompt}
      </p>

      <div className="space-y-3" aria-label="Frases para completar">
        {lines.map((line, index) => (
          <div key={line.id} className="flex items-start gap-3">
            <span
              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEE8FA] text-base font-semibold text-[#10245C]"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <label htmlFor={`${block.id}-sentence-${index + 1}`} className="sr-only">
                Frase {index + 1}
              </label>
              <input
                id={`${block.id}-sentence-${index + 1}`}
                type="text"
                value={line.text}
                onChange={(event) => updateLine(index, event.target.value)}
                disabled={isTeacher || gradingState === 'loading'}
                className="min-h-11 w-full border-0 border-b border-[#506187]/40 bg-transparent px-1 py-1 text-base leading-6 text-[#10245C] outline-none transition-[border-color,box-shadow] placeholder:text-[#506187] focus:border-[#245CFF] focus:shadow-[0_2px_0_0_#245CFF,0_0_0_4px_rgba(36,92,255,0.12)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Escribe tu frase"
              />
              {line.correction && (
                <p className="mt-1 text-sm leading-5 text-[#08775E]">Corrección: {line.correction}</p>
              )}
              {corrections
                .filter((correction) => correction.original && line.text.includes(correction.original))
                .map((correction) => (
                  <p key={`${line.id}-${correction.original}`} className="mt-1 text-sm leading-5 text-[#08775E]">
                    Corrección: {correction.corrected}
                  </p>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 text-base leading-6 text-[#506187]">
        <span aria-live="polite">{filledCount}/8 frases</span>
        <button
          type="button"
          aria-expanded={showIdeas}
          onClick={() => setShowIdeas((open) => !open)}
          className="inline-flex min-h-11 items-center gap-2 text-[#245CFF] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10245C]"
        >
          <Lightbulb className="h-5 w-5" aria-hidden="true" />
          Ver ideas
          <ChevronDown className={cn('h-4 w-4 transition-transform', showIdeas && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>

      {showIdeas && (
        <ul
          aria-label="Ideas para tus frases"
          className="space-y-2 rounded-2xl border border-[#EEE8FA] bg-white/80 p-4 text-base leading-6 text-[#10245C]"
        >
          {ideas.map((idea) => (
            <li key={idea}>{idea}</li>
          ))}
        </ul>
      )}

      {renderAction(reviewAction, guidedActionTarget)}
    </section>
  )
}

function TeacherConversationMode({
  turns,
  guidedActionTarget,
  onGuidedCompletionChange,
}: {
  turns: ConversationTurn[]
  guidedActionTarget?: HTMLElement | null
  onGuidedCompletionChange?: (done: boolean) => void
}) {
  const [completed, setCompleted] = useState(false)

  const finishAction = (
    <Button
      type="button"
      className={ACTION_CLASS}
      onClick={() => {
        setCompleted(true)
        onGuidedCompletionChange?.(true)
      }}
      disabled={completed}
    >
      He practicado
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Button>
  )

  return (
    <div className="space-y-6" data-unit1-conversation-mode="teacher">
        <p className="text-base leading-6 text-[#506187]">Pregunten y respondan por turnos.</p>
      <ol className="space-y-3" aria-label="Preguntas para practicar con tu profesora">
        {turns.map((turn, index) => (
          <li
            key={turn.id}
            className="rounded-2xl border border-[#EEE8FA] bg-white/80 px-4 py-3 text-base leading-6 text-[#10245C]"
          >
            <span className="mr-2 font-semibold text-[#506187]">{index + 1}.</span>
            <span>{turn.question}</span>
          </li>
        ))}
      </ol>
      {renderAction(finishAction, guidedActionTarget)}
    </div>
  )
}

function ConversationProduction({
  block,
  guidedActionTarget,
  onGuidedCompletionChange,
  onRecordingStateChange,
  isTeacher = false,
}: Unit1ProductionProps & { block: RecordingBlock }) {
  const turns = useMemo(() => normalizeTurns(block), [block])
  const [mode, setMode] = useState<'self' | 'teacher'>(isTeacher ? 'teacher' : 'self')
  const [turnIndex, setTurnIndex] = useState(0)
  const [recordings, setRecordings] = useState<Record<number, string>>({})
  const [isRecording, setIsRecording] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [allTurnsGraded, setAllTurnsGraded] = useState(false)
  const [completed, setCompleted] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingsRef = useRef<Record<number, string>>({})
  const classroomSync = useClassroomSync()

  const currentTurn = turns[turnIndex] || turns[0]
  const currentAudioUrl = recordings[turnIndex]
  const selfMode = mode === 'self' && !isTeacher

  useRecordingReport(isRecording, onRecordingStateChange)
  useCompletionReport(completed && !isTeacher, onGuidedCompletionChange)

  useEffect(() => {
    const recordingsAtUnmount = recordingsRef.current
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      Object.values(recordingsAtUnmount).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const replaceRecording = (index: number, url: string | null) => {
    const previous = recordingsRef.current[index]
    if (previous && previous !== url) URL.revokeObjectURL(previous)
    if (url) {
      recordingsRef.current[index] = url
      setRecordings((current) => ({ ...current, [index]: url }))
    } else {
      delete recordingsRef.current[index]
      setRecordings((current) => {
        const next = { ...current }
        delete next[index]
        return next
      })
    }
  }

  const startRecording = async () => {
    if (!selfMode || isRecording) return
    setRecordingError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('Tu navegador no permite grabar audio.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      streamRef.current = stream
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        replaceRecording(turnIndex, URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setIsRecording(false)
      }
      recorder.start()
      setIsRecording(true)
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setIsRecording(false)
      setRecordingError('No se pudo acceder al micrófono. Permite el acceso e inténtalo de nuevo.')
      console.error('Error accessing microphone:', error)
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    if (!recorder) setIsRecording(false)
  }

  const handleModeChange = (nextMode: 'self' | 'teacher') => {
    if (isRecording) stopRecording()
    setMode(nextMode)
    setRecordingError(null)
    setCompleted(false)
    if (nextMode === 'teacher') setAllTurnsGraded(false)
  }

  const handleGraded = () => {
    replaceRecording(turnIndex, null)
    if (turnIndex >= turns.length - 1) {
      setAllTurnsGraded(true)
      return
    }
    setTurnIndex((current) => current + 1)
  }

  const action = allTurnsGraded && selfMode ? (
    <Button
      type="button"
      className={ACTION_CLASS}
      onClick={() => setCompleted(true)}
      disabled={completed}
    >
      He practicado
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Button>
  ) : currentAudioUrl && selfMode ? (
    <RecordingAIGrading
      audioUrl={currentAudioUrl}
      instruction={currentTurn.question}
      blockId={block.id}
      language={block.aiGradingConfig?.language || 'english'}
      targetLevel={block.aiGradingConfig?.targetLevel || 'A1'}
      buttonText="Enviar respuesta"
      className={ACTION_CLASS}
      onGraded={handleGraded}
      onSyncResponse={
        classroomSync.canInteract ? classroomSync.sendBlockResponse : undefined
      }
      onGradingStateChange={(state) => {
        if (state === 'error') setRecordingError('No se pudo evaluar esta respuesta. Inténtalo de nuevo.')
      }}
    />
  ) : (
    <Button type="button" className={ACTION_CLASS} disabled>
      Enviar respuesta
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Button>
  )

  if (!currentTurn) return null

  return (
    <section
      data-unit1-role="conversation"
      aria-labelledby={`unit1-conversation-${block.id}`}
      className="space-y-6 text-[#10245C]"
    >
      <div className="inline-flex w-full max-w-[28rem] rounded-full border border-[#506187]/30 bg-white p-1" role="group" aria-label="Modo de conversación">
        <button
          type="button"
          aria-pressed={mode === 'self'}
          onClick={() => handleModeChange('self')}
          disabled={isTeacher}
          className={cn(
            'min-h-11 flex-1 rounded-full px-4 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10245C]',
            mode === 'self' ? 'bg-[#245CFF] text-white' : 'text-[#10245C] hover:bg-[#EEE8FA]',
            isTeacher && 'cursor-not-allowed opacity-60'
          )}
        >
          Por mi cuenta
        </button>
        <button
          type="button"
          aria-pressed={mode === 'teacher'}
          onClick={() => handleModeChange('teacher')}
          className={cn(
            'min-h-11 flex-1 rounded-full px-4 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10245C]',
            mode === 'teacher' ? 'bg-[#245CFF] text-white' : 'text-[#10245C] hover:bg-[#EEE8FA]'
          )}
        >
          Con mi profesora
        </button>
      </div>

      {mode === 'teacher' ? (
        <TeacherConversationMode
          turns={turns}
          guidedActionTarget={guidedActionTarget}
          onGuidedCompletionChange={onGuidedCompletionChange}
        />
      ) : (
        <div className="space-y-6" data-unit1-conversation-mode="self">
          <div className="space-y-3">
            <p id={`unit1-conversation-${block.id}`} className="max-w-[36rem] rounded-[24px] bg-[#EEE8FA] px-5 py-4 text-xl leading-8 text-[#10245C]">
              {currentTurn.question}
            </p>
            {currentTurn.audioUrl && (
              <div className="flex max-w-[36rem] items-center gap-3 rounded-2xl border border-[#506187]/30 bg-white px-4 py-3">
                <audio controls src={currentTurn.audioUrl} className="w-full" aria-label="Audio de la pregunta" />
              </div>
            )}
          </div>

          <p className="text-base leading-6 text-[#506187]">
            {currentTurn.answerPrompt || asString(getUnit1Data(block).answerPrompt) || 'Responde y pregunta lo mismo.'}
          </p>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              aria-label={isRecording ? 'Detener grabación' : 'Grabar respuesta'}
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                recordingControlStyles.recordButton,
                'relative flex shrink-0 flex-col items-center justify-center gap-1 rounded-full border-2 text-base font-semibold shadow-[0_0_0_12px_rgba(238,232,250,0.8)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10245C]',
                isRecording
                  ? 'border-[#C13E50] bg-white text-[#C13E50]'
                  : 'border-[#245CFF] bg-[#245CFF] text-white hover:bg-[#10245C]'
              )}
              data-unit1-recording-control="circle"
            >
              {isRecording ? <Square className="h-8 w-8" aria-hidden="true" /> : <Mic className="h-8 w-8" aria-hidden="true" />}
              <span className={recordingControlStyles.recordingLabel}>{isRecording ? 'Detener' : 'Grabar respuesta'}</span>
              {isRecording && <span className="sr-only">Grabando</span>}
            </button>
            <span className="text-base leading-6 text-[#506187]">Turno {turnIndex + 1} de {turns.length}</span>
            {recordingError && <p role="alert" className="text-base leading-6 text-[#C13E50]">{recordingError}</p>}
            {currentAudioUrl && !isRecording && <p className="text-sm leading-5 text-[#08775E]">Grabación lista para enviar.</p>}
          </div>
        </div>
      )}

      {mode === 'self' && !isTeacher && renderAction(action, guidedActionTarget)}
    </section>
  )
}

export function Unit1Production(props: Unit1ProductionProps) {
  const role = getUnit1ProductionRole(props.block)

  if (role === 'sentences' && props.block.type === 'essay') {
    return <SentenceProduction {...props} block={props.block} />
  }

  if (role === 'conversation' && props.block.type === 'recording') {
    return <ConversationProduction {...props} block={props.block} />
  }

  // Profile and presentation retain the shared BlockPreview renderer so the
  // viewer owns their scene and the existing grading controls remain the source of truth.
  return null
}
