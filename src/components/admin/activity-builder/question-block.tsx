'use client'

import { Trash2, Copy, Plus, X, HelpCircle, Info, Check, GripVertical } from 'lucide-react'
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
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
      )}
    >
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            {/* Drag Handle */}
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-slate-600 transition-colors"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="flex items-center justify-center size-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold">
              {index + 1}
            </span>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              {questionTypeLabel}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Select
              value={question.type}
              onValueChange={(value) => onTypeChange(value as QuestionType)}
            >
              <SelectTrigger className="text-xs h-8 pl-3 pr-7 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary focus:border-primary w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((type) => (
                  <SelectItem key={type.type} value={type.type} className="text-xs">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              className="p-1.5 text-slate-400 hover:text-primary transition-colors rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="Duplicate"
            >
              <Copy className="h-4 w-4" />
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
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
          Question Text
        </label>
        <div className="relative">
          <Input
            value={question.questionText || ''}
            onChange={(e) => handleQuestionTextChange(e.target.value)}
            placeholder="Which phrase is correct for greeting someone in the morning?"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary focus:border-primary text-sm"
          />
          <HelpCircle className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Answers */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">
          Answers
        </label>
        <div className="space-y-2.5">
          {options.map((option) => (
            <div key={option.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleCorrectChange(option.id)}
                className={cn(
                  'size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  option.isCorrect
                    ? 'border-primary bg-primary'
                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                )}
              >
                {option.isCorrect && (
                  <div className="size-2 rounded-full bg-white" />
                )}
              </button>
              <div className="flex-1 relative">
                <Input
                  value={option.text}
                  onChange={(e) => handleOptionChange(option.id, e.target.value)}
                  placeholder="Enter an option..."
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg text-sm transition-colors',
                    option.isCorrect
                      ? 'border-primary/50 bg-primary/5 dark:bg-primary/10 focus:ring-primary focus:border-primary pr-10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-primary focus:border-primary'
                  )}
                />
                {option.isCorrect && (
                  <Check className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveOption(option.id)}
                className="text-slate-300 hover:text-red-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddOption}
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline pl-8 pt-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add another option
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
            className="inline-flex items-center justify-center px-3 py-0.5 mx-1 min-w-[50px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-primary font-medium"
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
      <div className="bg-blue-50 dark:bg-blue-900/10 px-4 py-3 rounded-lg border border-blue-100 dark:border-blue-800/50">
        <p className="text-xs text-blue-600 dark:text-blue-300 flex items-center gap-2">
          <Info className="h-4 w-4 flex-shrink-0" />
          Type your sentence below. Use square brackets <strong className="text-blue-700 dark:text-blue-200">[answer]</strong> to create a blank.
        </p>
      </div>

      {/* Sentence Editor */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Sentence Editor
        </label>
        <Textarea
          value={question.sentenceWithBlanks || ''}
          onChange={(e) => handleSentenceChange(e.target.value)}
          placeholder="Hello, my name [is] John and I [am] from London."
          className="w-full p-4 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary focus:border-primary min-h-[100px] font-mono text-sm leading-relaxed"
        />
      </div>

      {/* Preview */}
      {question.sentenceWithBlanks && (
        <div className="pt-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Preview
          </h4>
          <div className="text-base text-slate-800 dark:text-slate-200 leading-relaxed">
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
        Pairs
      </label>

      {/* Headers */}
      <div className="grid grid-cols-2 gap-4 pr-8">
        <div className="text-xs font-semibold text-slate-500">
          Left Item
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Right Item (Match)
        </div>
      </div>

      {/* Pairs */}
      {pairs.map((pair) => (
        <div
          key={pair.id}
          className="flex items-center gap-2"
        >
          <div className="flex-1">
            <Input
              value={pair.left}
              onChange={(e) => handlePairChange(pair.id, 'left', e.target.value)}
              placeholder="Apple"
              className="w-full px-4 py-2.5 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <div className="flex-shrink-0 text-slate-300 dark:text-slate-600">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4" />
            </svg>
          </div>
          <div className="flex-1">
            <Input
              value={pair.right}
              onChange={(e) =>
                handlePairChange(pair.id, 'right', e.target.value)
              }
              placeholder="Manzana"
              className="w-full px-4 py-2.5 rounded-lg border-slate-200 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-800 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemovePair(pair.id)}
            className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddPair}
        className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline pt-1"
      >
        <Plus className="h-3.5 w-3.5" /> Add another pair
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
      <div className="bg-blue-50 dark:bg-blue-900/10 px-4 py-3 rounded-lg border border-blue-100 dark:border-blue-800/50">
        <p className="text-xs text-blue-600 dark:text-blue-300 flex items-center gap-2">
          <Info className="h-4 w-4 flex-shrink-0" />
          Write the correct sentence. Words will be automatically scrambled for the student.
        </p>
      </div>

      {/* Correct Sentence */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Correct Sentence
        </label>
        <Textarea
          value={question.correctSentence || ''}
          onChange={(e) => handleSentenceChange(e.target.value)}
          placeholder="Write the sentence in the correct order..."
          className="w-full p-4 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary focus:border-primary min-h-[80px] text-sm"
        />
      </div>

      {/* Scrambled Preview */}
      {question.scrambledWords && question.scrambledWords.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Preview (Scrambled)
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReshuffle}
              className="text-xs h-7 px-2"
            >
              Reshuffle
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {question.scrambledWords.map((word, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
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
