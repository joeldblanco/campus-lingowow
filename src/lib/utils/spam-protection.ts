/**
 * Utilidades para protección contra spam en formularios de registro
 */

/**
 * Detecta si un nombre parece generado por un bot (caracteres aleatorios)
 * Patrones sospechosos:
 * - Mezcla excesiva de mayúsculas y minúsculas sin patrón
 * - Secuencias largas sin espacios ni vocales
 * - Nombres muy largos sin estructura normal
 */
export function isSuspiciousName(name: string): boolean {
  if (!name || name.length < 2) return false

  // Nombre demasiado largo sin espacios (más de 20 caracteres seguidos)
  if (name.length > 20 && !name.includes(' ')) {
    return true
  }

  // Contar cambios entre mayúsculas y minúsculas
  let caseChanges = 0
  for (let i = 1; i < name.length; i++) {
    const prevIsUpper = name[i - 1] === name[i - 1].toUpperCase() && name[i - 1] !== name[i - 1].toLowerCase()
    const currIsUpper = name[i] === name[i].toUpperCase() && name[i] !== name[i].toLowerCase()
    if (prevIsUpper !== currIsUpper) {
      caseChanges++
    }
  }

  // Si hay demasiados cambios de caso (más del 40% de la longitud), es sospechoso
  if (caseChanges > name.length * 0.4 && name.length > 8) {
    return true
  }

  // Verificar proporción de vocales (nombres reales suelen tener ~30-50% vocales)
  const vowels = name.toLowerCase().match(/[aeiouáéíóúü]/g)?.length || 0
  const letters = name.match(/[a-záéíóúüñ]/gi)?.length || 1
  const vowelRatio = vowels / letters

  // Si tiene menos del 15% de vocales y más de 10 caracteres, es sospechoso
  if (vowelRatio < 0.15 && name.length > 10) {
    return true
  }

  // Detectar patrones de caracteres repetitivos o secuenciales
  const hasRandomPattern = /([A-Z]{4,}[a-z]{4,}|[a-z]{4,}[A-Z]{4,})/.test(name)
  if (hasRandomPattern) {
    return true
  }

  return false
}

/**
 * Verifica si el campo honeypot fue llenado (indica un bot)
 */
export function isHoneypotFilled(honeypotValue: string | undefined | null): boolean {
  return !!honeypotValue && honeypotValue.trim().length > 0
}

/**
 * Lista de dominios de email temporales/desechables conocidos
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'trashmail.com',
  'getnada.com',
  'mohmal.com',
  'dispostable.com',
  'maildrop.cc',
  'yopmail.com',
]

/**
 * Verifica si el email es de un dominio desechable conocido
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1]
  return DISPOSABLE_EMAIL_DOMAINS.some((d) => domain?.includes(d))
}

/**
 * Lista de palabras clave típicas de spam comercial, SEO o bots
 */
const SPAM_KEYWORDS = [
  'casino',
  'poker',
  'slot machine',
  'crypto',
  'bitcoin',
  'seo ranking',
  'backlink',
  'guest post',
  'viagra',
  'cialis',
  'rank #1',
  'ranking #1',
  'traffic booster',
  'whatsapp group',
  'telegram group',
  'passive income',
]

/**
 * Detecta si el texto del mensaje tiene patrones de spam
 */
export function isSpamContent(text: string | undefined | null): boolean {
  if (!text || text.trim().length === 0) return false

  const lowerText = text.toLowerCase()

  // 1. Detección de múltiples enlaces (más de 1 URL suele ser bot spam)
  const urlMatches = text.match(/(https?:\/\/|www\.)[^\s]+/gi) || []
  if (urlMatches.length > 1) {
    return true
  }

  // 2. Detección de caracteres cirílicos (spam de bots rusos comunes en formularios)
  const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) || []).length
  if (cyrillicCount > 3) {
    return true
  }

  // 3. Palabras clave de spam SEO/phishing
  for (const keyword of SPAM_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return true
    }
  }

  return false
}

/**
 * Resultado de la validación anti-spam
 */
export interface SpamCheckResult {
  isSpam: boolean
  reason?: string
}

/**
 * Realiza todas las verificaciones anti-spam
 */
export function checkForSpam(data: {
  name: string
  lastName?: string
  email: string
  honeypot?: string | null
  message?: string | null
  subject?: string | null
}): SpamCheckResult {
  // 1. Verificar honeypot
  if (isHoneypotFilled(data.honeypot)) {
    return { isSpam: true, reason: 'honeypot' }
  }

  // 2. Verificar nombre sospechoso
  if (isSuspiciousName(data.name)) {
    return { isSpam: true, reason: 'suspicious_name' }
  }

  // 3. Verificar apellido sospechoso
  if (data.lastName && isSuspiciousName(data.lastName)) {
    return { isSpam: true, reason: 'suspicious_lastname' }
  }

  // 4. Verificar email desechable
  if (isDisposableEmail(data.email)) {
    return { isSpam: true, reason: 'disposable_email' }
  }

  // 5. Verificar contenido de mensaje sospechoso
  if (data.message && isSpamContent(data.message)) {
    return { isSpam: true, reason: 'spam_message' }
  }

  // 6. Verificar asunto sospechoso
  if (data.subject && isSpamContent(data.subject)) {
    return { isSpam: true, reason: 'spam_subject' }
  }

  return { isSpam: false }
}

