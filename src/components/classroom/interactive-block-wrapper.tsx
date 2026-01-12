'use client'

import { useCallback } from 'react'
import { useCollaboration, InteractiveBlockResponse } from './collaboration-context'
import { Block } from '@/types/course-builder'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Clock, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface InteractiveBlockWrapperProps {
  block: Block
  children: React.ReactNode
  onResponseChange?: (response: unknown, isCorrect?: boolean, score?: number) => void
}

const INTERACTIVE_BLOCK_TYPES = [
  'quiz',
  'fill_blanks',
  'match',
  'true_false',
  'essay',
  'short_answer',
  'multiple_choice',
  'ordering',
  'drag_drop',
  'multi_select',
  'recording',
]

export function InteractiveBlockWrapper({
  block,
  children,
  onResponseChange,
}: InteractiveBlockWrapperProps) {
  const { 
    sendBlockResponse, 
    remoteBlockResponses, 
    isTeacher 
  } = useCollaboration()

  const isInteractive = INTERACTIVE_BLOCK_TYPES.includes(block.type)
  const remoteResponse = remoteBlockResponses.get(block.id)

  // Function to send response to the other participant
  const handleResponseSubmit = useCallback((
    response: unknown,
    isCorrect?: boolean,
    score?: number
  ) => {
    sendBlockResponse(block.id, block.type, response, isCorrect, score)
    onResponseChange?.(response, isCorrect, score)
  }, [block.id, block.type, sendBlockResponse, onResponseChange])

  // If not an interactive block, just render children
  if (!isInteractive) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      {/* Remote response indicator for teachers */}
      {isTeacher && remoteResponse && (
        <StudentResponseIndicator response={remoteResponse} />
      )}

      {/* The actual block content */}
      <InteractiveBlockContext.Provider value={{ onSubmitResponse: handleResponseSubmit }}>
        {children}
      </InteractiveBlockContext.Provider>
    </div>
  )
}

// Context for passing the submit handler to child blocks
import { createContext, useContext } from 'react'

interface InteractiveBlockContextType {
  onSubmitResponse: (response: unknown, isCorrect?: boolean, score?: number) => void
}

const InteractiveBlockContext = createContext<InteractiveBlockContextType | null>(null)

export function useInteractiveBlock() {
  return useContext(InteractiveBlockContext)
}

// Component to show student's response to the teacher
function StudentResponseIndicator({ response }: { response: InteractiveBlockResponse }) {
  const getStatusIcon = () => {
    if (response.isCorrect === true) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
    if (response.isCorrect === false) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    return <Clock className="h-4 w-4 text-blue-500" />
  }

  const getStatusText = () => {
    if (response.isCorrect === true) return 'Correcto'
    if (response.isCorrect === false) return 'Incorrecto'
    return 'Respondido'
  }

  const getStatusColor = () => {
    if (response.isCorrect === true) return 'bg-green-100 border-green-300 text-green-800'
    if (response.isCorrect === false) return 'bg-red-100 border-red-300 text-red-800'
    return 'bg-blue-100 border-blue-300 text-blue-800'
  }

  return (
    <div className={cn(
      "absolute -top-2 -right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium shadow-sm",
      getStatusColor()
    )}>
      <User className="h-3 w-3" />
      <span>{response.participantName}</span>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {response.score !== undefined && (
        <Badge variant="secondary" className="ml-1 text-[10px] px-1">
          {response.score}pts
        </Badge>
      )}
    </div>
  )
}

// Panel component for teachers to see all student responses
export function StudentResponsesPanel() {
  const { remoteBlockResponses, isTeacher } = useCollaboration()

  if (!isTeacher || remoteBlockResponses.size === 0) {
    return null
  }

  const responses = Array.from(remoteBlockResponses.values())

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-xl border overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-3">
        <h3 className="font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          Respuestas del Estudiante
        </h3>
        <p className="text-xs text-blue-100 mt-0.5">
          {responses.length} respuesta(s) recibida(s)
        </p>
      </div>
      
      <div className="max-h-64 overflow-y-auto divide-y">
        {responses.map((response) => (
          <ResponseItem key={response.blockId} response={response} />
        ))}
      </div>
    </div>
  )
}

function ResponseItem({ response }: { response: InteractiveBlockResponse }) {
  const getBlockTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      quiz: 'Quiz',
      fill_blanks: 'Rellenar espacios',
      match: 'Emparejar',
      true_false: 'Verdadero/Falso',
      essay: 'Ensayo',
      short_answer: 'Respuesta corta',
      multiple_choice: 'Opción múltiple',
      ordering: 'Ordenar',
      drag_drop: 'Arrastrar y soltar',
      multi_select: 'Selección múltiple',
      recording: 'Grabación',
    }
    return labels[type] || type
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">
          {getBlockTypeLabel(response.blockType)}
        </span>
        <span className="text-xs text-gray-400">
          {formatTime(response.timestamp)}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        {response.isCorrect === true && (
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        )}
        {response.isCorrect === false && (
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
        )}
        {response.isCorrect === undefined && (
          <Clock className="h-4 w-4 text-blue-500 shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {response.participantName}
          </p>
          {response.score !== undefined && (
            <p className="text-xs text-gray-500">
              Puntaje: {response.score}
            </p>
          )}
        </div>
        
        <div className={cn(
          "px-2 py-0.5 rounded text-xs font-medium",
          response.isCorrect === true && "bg-green-100 text-green-700",
          response.isCorrect === false && "bg-red-100 text-red-700",
          response.isCorrect === undefined && "bg-blue-100 text-blue-700"
        )}>
          {response.isCorrect === true ? '✓' : response.isCorrect === false ? '✗' : '•'}
        </div>
      </div>
    </div>
  )
}
