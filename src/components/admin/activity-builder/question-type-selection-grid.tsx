'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { QUESTION_TYPES, QuestionType } from './types'
import { 
  CheckCircle, 
  Type, 
  ArrowRightLeft,
  ArrowUpDown
} from 'lucide-react'

interface QuestionTypeSelectionGridProps {
  onSelect: (type: QuestionType) => void
}

const QUESTION_TYPE_ICONS = {
  multiple_choice: CheckCircle,
  fill_blanks: Type,
  matching_pairs: ArrowRightLeft,
  sentence_unscramble: ArrowUpDown,
}

export function QuestionTypeSelectionGrid({ onSelect }: QuestionTypeSelectionGridProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wide">
          Tipos de Preguntas
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {QUESTION_TYPES.map((questionType) => {
            const IconComponent = QUESTION_TYPE_ICONS[questionType.type]
            
            return (
              <Card
                key={questionType.type}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-md hover:scale-105 border-2 hover:border-primary/50",
                  "group hover:bg-primary/5"
                )}
                onClick={() => onSelect(questionType.type)}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={cn(
                    "size-12 rounded-full flex items-center justify-center transition-colors",
                    "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                  )}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm group-hover:text-primary">
                      {questionType.label}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {questionType.description}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
