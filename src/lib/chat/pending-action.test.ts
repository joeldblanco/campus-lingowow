import { describe, expect, it } from 'vitest'
import { looksLikePendingAction } from './pending-action'

describe('looksLikePendingAction', () => {
  it('detects a scheduling promise the model never fulfils', () => {
    // Regression: this exact phrasing previously stalled the chat — the model
    // announced it would schedule but never called admin_schedule_class.
    expect(
      looksLikePendingAction('Entendido, Joel. Agendaré la clase de las 8:00 pm con Álvaro los miércoles.')
    ).toBe(true)
  })

  it('detects other future-tense action announcements', () => {
    expect(looksLikePendingAction('Voy a verificar la disponibilidad del profesor.')).toBe(true)
    expect(looksLikePendingAction('Procederé a inscribir a la estudiante.')).toBe(true)
    expect(looksLikePendingAction('Agregaré las clases que faltan.')).toBe(true)
    expect(looksLikePendingAction('Déjame consultar eso.')).toBe(true)
    expect(looksLikePendingAction('Let me check that for you.')).toBe(true)
  })

  it('does NOT match past-tense confirmations of completed work', () => {
    // "Agendé" / "Agregué" mean it is already done — re-nudging would loop.
    expect(looksLikePendingAction('¡Listo! Agendé 4 clases para Elizabeth.')).toBe(false)
    expect(looksLikePendingAction('Ya agregué las clases solicitadas.')).toBe(false)
  })

  it('does NOT match plain answers with no pending action', () => {
    expect(looksLikePendingAction('¡Hola! ¿Qué necesitas?')).toBe(false)
    expect(looksLikePendingAction('La estudiante tiene 8 clases este período.')).toBe(false)
  })
})
