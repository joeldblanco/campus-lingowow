import { describe, expect, it } from 'vitest'
import {
  checkForSpam,
  isDisposableEmail,
  isHoneypotFilled,
  isSpamContent,
  isSuspiciousName,
} from './spam-protection'

describe('spam-protection', () => {
  describe('isHoneypotFilled', () => {
    it('returns true when honeypot field has a value', () => {
      expect(isHoneypotFilled('http://spam-link.com')).toBe(true)
      expect(isHoneypotFilled('bot-filled')).toBe(true)
    })

    it('returns false when honeypot field is empty or undefined', () => {
      expect(isHoneypotFilled('')).toBe(false)
      expect(isHoneypotFilled('  ')).toBe(false)
      expect(isHoneypotFilled(undefined)).toBe(false)
      expect(isHoneypotFilled(null)).toBe(false)
    })
  })

  describe('isSuspiciousName', () => {
    it('detects bot-generated random names', () => {
      expect(isSuspiciousName('aBcDeFgHiJkLmNoP')).toBe(true)
      expect(isSuspiciousName('xwrztpqlkhfdscvb')).toBe(true)
    })

    it('allows normal human names', () => {
      expect(isSuspiciousName('Juan Pérez')).toBe(false)
      expect(isSuspiciousName('María García')).toBe(false)
      expect(isSuspiciousName('John Doe')).toBe(false)
    })
  })

  describe('isDisposableEmail', () => {
    it('detects disposable email providers', () => {
      expect(isDisposableEmail('test@mailinator.com')).toBe(true)
      expect(isDisposableEmail('spammer@tempmail.com')).toBe(true)
    })

    it('allows standard email providers', () => {
      expect(isDisposableEmail('user@gmail.com')).toBe(false)
      expect(isDisposableEmail('student@outlook.com')).toBe(false)
    })
  })

  describe('isSpamContent', () => {
    it('detects text containing multiple URLs', () => {
      const text = 'Check out http://spam1.com and https://spam2.com for cheap offers'
      expect(isSpamContent(text)).toBe(true)
    })

    it('detects Cyrillic spam content', () => {
      const text = 'Привет, buy cheap SEO ranking for your website'
      expect(isSpamContent(text)).toBe(true)
    })

    it('detects spam keywords', () => {
      expect(isSpamContent('We offer rank #1 SEO services')).toBe(true)
      expect(isSpamContent('Join our crypto trading group')).toBe(true)
    })

    it('allows legitimate messages', () => {
      expect(isSpamContent('Hola, quisiera información sobre los cursos de inglés para adultos.')).toBe(false)
      expect(isSpamContent('Tengo una duda sobre los horarios de la clase de prueba.')).toBe(false)
    })
  })

  describe('checkForSpam', () => {
    it('blocks spam when honeypot is filled', () => {
      const result = checkForSpam({
        name: 'Carlos',
        email: 'carlos@gmail.com',
        honeypot: 'filled-by-bot',
      })
      expect(result.isSpam).toBe(true)
      expect(result.reason).toBe('honeypot')
    })

    it('blocks spam when message contains spam links or keywords', () => {
      const result = checkForSpam({
        name: 'Carlos',
        email: 'carlos@gmail.com',
        message: 'Boost your Google rank #1 with our casino backlinks',
      })
      expect(result.isSpam).toBe(true)
      expect(result.reason).toBe('spam_message')
    })

    it('passes clean user submissions', () => {
      const result = checkForSpam({
        name: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@gmail.com',
        honeypot: '',
        message: 'Hola, me gustaría información sobre las clases particulares de inglés.',
        subject: 'informacion',
      })
      expect(result.isSpam).toBe(false)
    })
  })
})
