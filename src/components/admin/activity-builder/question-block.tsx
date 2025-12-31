'use client'

import { Trash2, Copy, Plus, X, GripVertical, HelpCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ActivityQuestion,
  QuestionType,
  QUESTION_TYPES,
  extractBlanksFromSentence,
} from './types'

interface QuestionBlockProps {
  question: ActivityQuestion
  index: number
  onUpdate: (question: ActivityQuestion) => void
  onDelete: () => void
  onDuplicate: () => void
  onTypeChange: (type: QuestionType) => void
}

export function QuestionBlock({
  question,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  onTypeChange,
}: QuestionBlockProps) {
  const questionTypeLabel = QUESTION_TYPES.find((t) => t.type === question.type)?.label || ''

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
      {/* Drag Handle */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-200 dark:bg-slate-800 rounded-l-xl cursor-move group-hover:bg-primary/50 transition-colors flex items-center justify-center">
        <GripVertical className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="p-6 pl-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center size-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">
              {index + 1}
            </span>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">
              {questionTypeLabel}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={question.type}
              onValueChange={(value) => onTypeChange(value as QuestionType)}
            >
              <SelectTrigger className="text-sm py-1.5 pl-3 pr-8 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary focus:border-primary w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((type) => (
                  <SelectItem key={type.type} value={type.type}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Eliminar"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              className="p-1.5 text-slate-400 hover:text-primary transition-colors rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="Duplicar"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content based on type */}
        {question.type === 'multiple_choice' && (
          <MultipleChoiceEditor question={question} onUpdate={onUpdate} />
        )}
        {question.type === 'fill_blanks' && (
          <FillBlanksEditor question={question} onUpdate={onUpdate} />
        )}
        {question.type === 'matching_pairs' && (
          <MatchingPairsEditor question={question} onUpdate={onUpdate} />
        )}
        {question.type === 'sentence_unscramble' && (
          <SentenceUnscrambleEditor question={question} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  )
}

// Multiple Choice Editor
function MultipleChoiceEditor({
  question,
  onUpdate,
}: {
  question: ActivityQuestion
  onUpdate: (q: ActivityQuestion) => void
}) {
  const options = question.options || []

  const handleQuestionTextChange = (text: string) => {
    onUpdate({ ...question, questionText: text })
  }

  const handleOptionChange = (optionId: string, text: string) => {
    onUpdate({
      ...question,
      options: options.map((opt) =>
        opt.id === optionId ? { ...opt, text } : opt
      ),
    })
  }

  const handleCorrectChange = (optionId: string) => {
    onUpdate({
      ...question,
      options: options.map((opt) => ({
        ...opt,
        isCorrect: opt.id === optionId,
      })),
    })
  }

  const handleAddOption = () => {
    onUpdate({
      ...question,
      options: [
        ...options,
        { id: `opt-${Date.now()}`, text: '', isCorrect: false },
      ],
    })
  }

  const handleRemoveOption = (optionId: string) => {
    onUpdate({
      ...question,
      options: options.filter((opt) => opt.id !== optionId),
    })
  }

  return (
    <div className="space-y-4">
      {/* Question Text */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Texto de la Pregunta
        </label>
        <div className="relative">
          <Input
            value={question.questionText || ''}
            onChange={(e) => handleQuestionTextChange(e.target.value)}
            placeholder="¿Cuál es la respuesta correcta?"
            className="w-full pl-10 pr-4 py-3 rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary focus:border-primary"
          />
          <HelpCircle className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
        </div>
      </div>

      {/* Options */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Respuestas
        </label>
        <div className="space-y-3">
          {options.map((option) => (
            <div key={option.id} className="flex items-center gap-3">
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={option.isCorrect}
                onChange={() => handleCorrectChange(option.id)}
                className="size-5 text-primary border-slate-300 focus:ring-primary cursor-pointer"
              />
              <div className="flex-1 relative">
                <Input
                  value={option.text}
                  onChange={(e) => handleOptionChange(option.id, e.target.value)}
                  placeholder="Escribe una opción..."
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg text-sm',
                    option.isCorrect
                      ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10 focus:ring-primary focus:border-primary font-medium pr-10'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-primary focus:border-primary'
                  )}
                />
                {option.isCorrect && (
                  <span className="absolute right-3 top-3 text-green-500">
                    ✓
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveOption(option.id)}
                className="text-slate-300 hover:text-red-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddOption}
            className="flex items-center gap-2 text-sm text-primary font-medium hover:underline pl-8 mt-2"
          >
            <Plus className="h-4 w-4" /> Agregar otra opción
          </button>
        </div>
      </div>
    </div>
  )
}

// Fill in the Blanks Editor
function FillBlanksEditor({
  question,
  onUpdate,
}: {
  question: ActivityQuestion
  onUpdate: (q: ActivityQuestion) => void
}) {
  const handleSentenceChange = (sentence: string) => {
    const blanks = extractBlanksFromSentence(sentence)
    onUpdate({
      ...question,
      sentenceWithBlanks: sentence,
      blanks,
    })
  }

  // Render preview with blanks
  const renderPreview = () => {
    const sentence = question.sentenceWithBlanks || ''
    const parts = sentence.split(/\[([^\]]+)\]/g)

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a blank
        return (
          <span
            key={index}
            className="inline-block px-3 py-1 bg-white border border-slate-300 rounded text-base text-slate-400 min-w-[60px] text-center shadow-inner mx-1"
          >
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  return (
    <div className="space-y-4">
      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
        <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Info className="h-4 w-4" />
          Escribe tu oración abajo. Usa corchetes <strong>[respuesta]</strong>{' '}
          para crear un espacio en blanco.
        </p>
      </div>

      {/* Sentence Editor */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Editor de Oración
        </label>
        <Textarea
          value={question.sentenceWithBlanks || ''}
          onChange={(e) => handleSentenceChange(e.target.value)}
          placeholder="Ej: El gato [está] durmiendo en el [sofá]."
          className="w-full p-4 rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary focus:border-primary min-h-[120px] font-mono text-sm leading-relaxed"
        />
      </div>

      {/* Preview */}
      {question.sentenceWithBlanks && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">
            Vista Previa
          </h4>
          <div className="text-lg text-slate-800 dark:text-slate-200 leading-loose">
            {renderPreview()}
          </div>
        </div>
      )}
    </div>
  )
}

// Matching Pairs Editor
function MatchingPairsEditor({
  question,
  onUpdate,
}: {
  question: ActivityQuestion
  onUpdate: (q: ActivityQuestion) => void
}) {
  const pairs = question.pairs || []

  const handlePairChange = (
    pairId: string,
    field: 'left' | 'right',
    value: string
  ) => {
    onUpdate({
      ...question,
      pairs: pairs.map((pair) =>
        pair.id === pairId ? { ...pair, [field]: value } : pair
      ),
    })
  }

  const handleAddPair = () => {
    onUpdate({
      ...question,
      pairs: [...pairs, { id: `pair-${Date.now()}`, left: '', right: '' }],
    })
  }

  const handleRemovePair = (pairId: string) => {
    onUpdate({
      ...question,
      pairs: pairs.filter((pair) => pair.id !== pairId),
    })
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Pares
      </label>

      {/* Headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="text-xs font-semibold text-slate-500">
          Elemento Izquierdo
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Elemento Derecho (Coincidencia)
        </div>
      </div>

      {/* Pairs */}
      {pairs.map((pair) => (
        <div
          key={pair.id}
          className="flex flex-col md:flex-row gap-2 md:items-center"
        >
          <div className="flex-1">
            <Input
              value={pair.left}
              onChange={(e) => handlePairChange(pair.id, 'left', e.target.value)}
              placeholder="Elemento izquierdo"
              className="w-full px-4 py-2.5 rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <span className="hidden md:block text-slate-300">⇄</span>
          <div className="flex-1">
            <Input
              value={pair.right}
              onChange={(e) =>
                handlePairChange(pair.id, 'right', e.target.value)
              }
              placeholder="Elemento derecho"
              className="w-full px-4 py-2.5 rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemovePair(pair.id)}
            className="self-end md:self-center text-slate-300 hover:text-red-400 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddPair}
        className="flex items-center gap-2 text-sm text-primary font-medium hover:underline mt-2"
      >
        <Plus className="h-4 w-4" /> Agregar otro par
      </button>
    </div>
  )
}

// Sentence Unscramble Editor
function SentenceUnscrambleEditor({
  question,
  onUpdate,
}: {
  question: ActivityQuestion
  onUpdate: (q: ActivityQuestion) => void
}) {
  const handleSentenceChange = (sentence: string) => {
    // Auto-generate scrambled words from the sentence
    const words = sentence.trim().split(/\s+/).filter(Boolean)
    const scrambled = [...words].sort(() => Math.random() - 0.5)

    onUpdate({
      ...question,
      correctSentence: sentence,
      scrambledWords: scrambled,
    })
  }

  const handleReshuffle = () => {
    const words = (question.correctSentence || '').trim().split(/\s+/).filter(Boolean)
    const scrambled = [...words].sort(() => Math.random() - 0.5)
    onUpdate({
      ...question,
      scrambledWords: scrambled,
    })
  }

  return (
    <div className="space-y-4">
      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
        <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Info className="h-4 w-4" />
          Escribe la oración correcta. Las palabras se desordenarán
          automáticamente para el estudiante.
        </p>
      </div>

      {/* Correct Sentence */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Oración Correcta
        </label>
        <Textarea
          value={question.correctSentence || ''}
          onChange={(e) => handleSentenceChange(e.target.value)}
          placeholder="Escribe la oración en el orden correcto..."
          className="w-full p-4 rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary focus:border-primary min-h-[80px] text-sm"
        />
      </div>

      {/* Scrambled Preview */}
      {question.scrambledWords && question.scrambledWords.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase text-slate-400">
              Vista Previa (Desordenado)
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReshuffle}
              className="text-xs"
            >
              Reordenar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {question.scrambledWords.map((word, idx) => (
              <span
                key={idx}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
