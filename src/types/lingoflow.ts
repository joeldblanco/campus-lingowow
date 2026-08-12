export type LingoFlowMode = 'growth-analysis' | 'whatsapp-referral-draft' | 'instagram-draft'

export interface LingoFlowReadModel {
  activeStudents: number
  targetStudents: number
  gap: number
  progressPercent: number
}

export interface LingoFlowDraft {
  isDraft: true
  title: string
  content: string
  safetyNote: string
}
