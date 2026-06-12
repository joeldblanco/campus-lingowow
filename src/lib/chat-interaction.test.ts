import { describe, it, expect } from 'vitest'
import { buildInteractionFromToolResult } from './chat-interaction'
import type { ToolResult } from '@/types/ai-chat'

describe('buildInteractionFromToolResult', () => {
  it('returns undefined for undefined input', () => {
    expect(buildInteractionFromToolResult(undefined)).toBeUndefined()
  })

  it('returns undefined when there is no data', () => {
    const result: ToolResult = { success: false, message: 'oops' }
    expect(buildInteractionFromToolResult(result)).toBeUndefined()
  })

  it('returns undefined when data has no recognised code', () => {
    const result: ToolResult = {
      success: true,
      message: 'ok',
      data: { code: 'SOMETHING_ELSE', students: [{ name: 'A', email: 'a@x.com' }] },
    }
    expect(buildInteractionFromToolResult(result)).toBeUndefined()
  })

  it('returns undefined when MULTIPLE_STUDENTS but list is empty', () => {
    const result: ToolResult = {
      success: true,
      message: 'no matches',
      data: { code: 'MULTIPLE_STUDENTS', students: [] },
    }
    expect(buildInteractionFromToolResult(result)).toBeUndefined()
  })

  it('builds a single-select interaction for MULTIPLE_STUDENTS', () => {
    const result: ToolResult = {
      success: true,
      message: 'choose one',
      data: {
        code: 'MULTIPLE_STUDENTS',
        students: [
          { name: 'Ada Lovelace', email: 'ada@example.com' },
          { name: 'Grace Hopper', email: 'grace@example.com' },
        ],
      },
    }
    const interaction = buildInteractionFromToolResult(result)
    expect(interaction).toEqual({
      kind: 'single-select',
      prompt: 'Selecciona el estudiante:',
      allowFreeText: false,
      options: [
        { id: 'ada@example.com', label: 'Ada Lovelace (ada@example.com)' },
        { id: 'grace@example.com', label: 'Grace Hopper (grace@example.com)' },
      ],
    })
  })

  it('builds a single-select interaction for MULTIPLE_TEACHERS', () => {
    const result: ToolResult = {
      success: true,
      message: 'choose teacher',
      data: {
        code: 'MULTIPLE_TEACHERS',
        teachers: [{ name: 'John', email: 'john@example.com' }],
      },
    }
    const interaction = buildInteractionFromToolResult(result)
    expect(interaction?.prompt).toBe('Selecciona el profesor:')
    expect(interaction?.options).toHaveLength(1)
    expect(interaction?.options[0]).toEqual({
      id: 'john@example.com',
      label: 'John (john@example.com)',
    })
  })

  it('builds a single-select interaction for MULTIPLE_INVOICES with payload', () => {
    const result: ToolResult = {
      success: true,
      message: 'choose invoice',
      data: {
        code: 'MULTIPLE_INVOICES',
        invoices: [
          {
            id: 'inv_1',
            invoiceNumber: 'INV-001',
            planName: 'Wow',
            total: 199,
            currency: 'USD',
          },
          {
            id: 'inv_2',
            invoiceNumber: 'INV-002',
            total: 99,
            currency: 'PEN',
          },
        ],
      },
    }
    const interaction = buildInteractionFromToolResult(result)
    expect(interaction?.prompt).toBe('Selecciona la factura:')
    expect(interaction?.options).toEqual([
      {
        id: 'inv_1',
        label: 'INV-001: Wow ($199 USD)',
        payload: { invoiceId: 'inv_1' },
      },
      {
        id: 'inv_2',
        label: 'INV-002: Sin plan ($99 PEN)',
        payload: { invoiceId: 'inv_2' },
      },
    ])
  })

  it('builds a single-select interaction for MULTIPLE_USERS', () => {
    const result: ToolResult = {
      success: true,
      message: 'choose user',
      data: {
        code: 'MULTIPLE_USERS',
        users: [{ name: 'Alice', email: 'alice@example.com' }],
      },
    }
    const interaction = buildInteractionFromToolResult(result)
    expect(interaction?.prompt).toBe('Selecciona el usuario:')
    expect(interaction?.options[0]).toEqual({
      id: 'alice@example.com',
      label: 'Alice (alice@example.com)',
    })
  })

  it('builds a forced-choice confirmation for CONFIRM_PAYMENT showing the exact price', () => {
    const result: ToolResult = {
      success: true,
      message: 'confirm?',
      data: { code: 'CONFIRM_PAYMENT', planName: 'Exclusivo wow', price: '120.00', currency: 'USD' },
    }
    const interaction = buildInteractionFromToolResult(result)
    expect(interaction?.kind).toBe('single-select')
    // No free-text escape hatch on a money action.
    expect(interaction?.allowFreeText).toBe(false)
    expect(interaction?.prompt).toContain('Exclusivo wow')
    expect(interaction?.prompt).toContain('120.00')
    expect(interaction?.options).toEqual([
      { id: 'confirm', label: 'Sí, generar el link de pago — Exclusivo wow ($120.00 USD)' },
      { id: 'cancel', label: 'Cancelar' },
    ])
  })
})
