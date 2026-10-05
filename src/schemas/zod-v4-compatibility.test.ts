import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { ChatMessageSchema } from './chat'
import { ExamQuestionSchema } from './exams'

describe('Zod 4 compatibility', () => {
  it('uses issues as the validation error collection', () => {
    const result = ChatMessageSchema.safeParse({})

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
      expect(result.error).not.toHaveProperty('errors')
    }
  })

  it('preserves custom required messages with Zod 4 error callbacks', () => {
    const result = ChatMessageSchema.safeParse({ role: 'user' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ['content'], message: 'content es requerido' })
      )
    }
  })

  it('accepts arbitrary string-keyed metadata records', () => {
    const result = ExamQuestionSchema.safeParse({
      type: 'ESSAY',
      question: 'Write a short answer',
      options: { rubric: 'grammar', maxWords: 100 },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.options).toEqual({ rubric: 'grammar', maxWords: 100 })
    }
  })

  it('uses the Zod 4 flattenError helper for API-shaped details', () => {
    const result = ChatMessageSchema.safeParse({ role: 'admin', content: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(z.flattenError(result.error)).toEqual(
        expect.objectContaining({ fieldErrors: expect.any(Object) })
      )
    }
  })
})
