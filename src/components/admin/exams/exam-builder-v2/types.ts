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
  // Placement test fields
  isPlacementTest: boolean
  targetLanguage: string
  slug: string
  isPublicAccess: boolean
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
  // Placement test defaults
  isPlacementTest: false,
  targetLanguage: 'en',
  slug: '',
  isPublicAccess: false,
}
