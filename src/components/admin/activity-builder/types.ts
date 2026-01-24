// Tipos para el Activity Builder

export type QuestionType = 
  | 'multiple_choice' 
  | 'fill_blanks' 
  | 'matching_pairs'
  | 'sentence_unscramble'

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export interface ScrambledWord {
  id: string
  text: string
  originalIndex: number
}

export interface ActivityQuestion {
  id: string
  type: QuestionType
  order: number
  // Multiple Choice
  questionText?: string
  options?: { id: string; text: string; isCorrect: boolean }[]
  // Fill in the Blanks
  sentenceWithBlanks?: string
  blanks?: { id: string; answer: string }[]
  // Matching Pairs
  pairs?: { id: string; left: string; right: string }[]
  // Sentence Unscramble
  correctSentence?: string
  scrambledWords?: ScrambledWord[]
}

export interface ActivitySettings {
  difficulty: DifficultyLevel
  tags: string[]
  description: string
}

export const DEFAULT_ACTIVITY_SETTINGS: ActivitySettings = {
  difficulty: 'beginner',
  tags: [],
  description: '',
}

export const QUESTION_TYPES: { type: QuestionType; label: string; description: string }[] = [
  { type: 'multiple_choice', label: 'Opción Múltiple', description: 'Selecciona la respuesta correcta' },
  { type: 'fill_blanks', label: 'Completar Espacios', description: 'Completa las palabras faltantes' },
  { type: 'matching_pairs', label: 'Relacionar Pares', description: 'Conecta elementos relacionados' },
  { type: 'sentence_unscramble', label: 'Ordenar Oración', description: 'Reordena las palabras' },
]

export const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string; sublabel: string }[] = [
  { value: 'beginner', label: 'Principiante', sublabel: 'A1 - A2 Level' },
  { value: 'intermediate', label: 'Intermedio', sublabel: 'B1 - B2 Level' },
  { value: 'advanced', label: 'Avanzado', sublabel: 'C1 - C2 Level' },
]

export function createDefaultQuestion(type: QuestionType, order: number): ActivityQuestion {
  const id = `q-${Date.now()}-${order}`
  
  switch (type) {
    case 'multiple_choice':
      return {
        id,
        type,
        order,
        questionText: '',
        options: [
          { id: 'opt-1', text: '', isCorrect: true },
          { id: 'opt-2', text: '', isCorrect: false },
          { id: 'opt-3', text: '', isCorrect: false },
        ],
      }
    case 'fill_blanks':
      return {
        id,
        type,
        order,
        sentenceWithBlanks: '',
        blanks: [],
      }
    case 'matching_pairs':
      return {
        id,
        type,
        order,
        pairs: [
          { id: 'pair-1', left: '', right: '' },
          { id: 'pair-2', left: '', right: '' },
        ],
      }
    case 'sentence_unscramble':
      return {
        id,
        type,
        order,
        correctSentence: '',
        scrambledWords: [],
      }
    default:
      return {
        id,
        type: 'multiple_choice',
        order,
        questionText: '',
        options: [],
      }
  }
}

// Función para extraer blanks de una oración con formato [respuesta]
export function extractBlanksFromSentence(sentence: string): { id: string; answer: string }[] {
  const regex = /\[([^\]]+)\]/g
  const blanks: { id: string; answer: string }[] = []
  let match
  let index = 0
  
  while ((match = regex.exec(sentence)) !== null) {
    blanks.push({
      id: `blank-${index}`,
      answer: match[1],
    })
    index++
  }
  
  return blanks
}

// Función para renderizar preview de fill in blanks
export function renderFillBlanksPreview(sentence: string): string {
  return sentence.replace(/\[([^\]]+)\]/g, '___')
}
