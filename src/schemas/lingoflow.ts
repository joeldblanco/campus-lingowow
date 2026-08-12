import { z } from 'zod'

export const lingoFlowModeSchema = z.enum([
  'growth-analysis',
  'whatsapp-referral-draft',
  'instagram-draft',
])

export const lingoFlowGenerateSchema = z
  .object({ mode: lingoFlowModeSchema })
  .strict()

export const lingoFlowDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    content: z.string().trim().min(1).max(1_500),
    safetyNote: z.string().trim().min(1).max(240),
  })
  .strict()
