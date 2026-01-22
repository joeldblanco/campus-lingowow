'use server'

/**
 * Normaliza un email convirtiéndolo a minúsculas
 * @param email El email a normalizar
 * @returns El email normalizado (en minúsculas)
 */
export function normalizeEmail(email: string): string {
  if (!email) return email
  return email.toLowerCase()
}
