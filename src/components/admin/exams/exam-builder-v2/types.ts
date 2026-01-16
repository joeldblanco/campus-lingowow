import { ExamTypeValue } from '@/types/exam'

export interface ExamSettings {
  timeLimit: number
  passingScore: number
  maxAttempts: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  showResults: boolean
  allowReview: boolean
  isBlocking: boolean
  isOptional: boolean
  proctoringEnabled: boolean
  requireFullscreen: boolean
  blockCopyPaste: boolean
  blockRightClick: boolean
  maxWarnings: number
  examType: ExamTypeValue
  isGuestAccessible: boolean
  targetLanguage: string
}

export const DEFAULT_EXAM_SETTINGS: ExamSettings = {
  timeLimit: 60,
  passingScore: 70,
  maxAttempts: 3,
  shuffleQuestions: false,
  shuffleOptions: false,
  showResults: true,
  allowReview: true,
  isBlocking: false,
  isOptional: false,
  proctoringEnabled: false,
  requireFullscreen: false,
  blockCopyPaste: false,
  blockRightClick: false,
  maxWarnings: 3,
  examType: 'COURSE_EXAM',
  isGuestAccessible: false,
  targetLanguage: 'en',
}
