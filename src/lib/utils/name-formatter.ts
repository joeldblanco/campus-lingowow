/**
 * Utilidades para formatear nombres de usuarios con capitalización adecuada
 */

function capitalizeWord(word: string): string {
  if (!word) return ''

  const normalizedWord = word.toLowerCase()

  if (normalizedWord.includes('-')) {
    return normalizedWord
      .split('-')
      .map(part => capitalizeWord(part))
      .join('-')
  }

  if (normalizedWord.includes("'")) {
    return normalizedWord
      .split("'")
      .map(part => capitalizeWord(part))
      .join("'")
  }

  if (normalizedWord.startsWith('mc') && normalizedWord.length > 2) {
    return `Mc${normalizedWord.charAt(2).toUpperCase()}${normalizedWord.slice(3)}`
  }

  return normalizedWord.charAt(0).toUpperCase() + normalizedWord.slice(1)
}

/**
 * Capitaliza la primera letra de cada palabra en un nombre
 * Maneja casos especiales como nombres compuestos
 */
export function formatFirstName(name?: string | null): string {
  if (!name || typeof name !== 'string') return ''

  return name
    .trim()
    .split(/\s+/)
    .map(word => capitalizeWord(word))
    .filter(Boolean)
    .join(' ')
}

/**
 * Formatea el nombre completo del usuario
 */
export function formatFullName(name?: string | null, lastName?: string | null): string {
  return [formatFirstName(name), formatFirstName(lastName)].filter(Boolean).join(' ')
}

/**
 * Formatea el nombre de un usuario a partir de su objeto.
 */
export function formatUserName(user: { name?: string | null; lastName?: string | null }): string {
  return formatFullName(user.name, user.lastName)
}

/**
 * Obtiene el nombre para mostrar (prioriza nombre completo si hay apellido)
 */
export function getDisplayName(user: { name?: string | null; lastName?: string | null }): string {
  return formatUserName(user)
}

/**
 * Formatea iniciales para avatares
 */
export function getInitials(name: string, lastName?: string | null): string {
  const nameInitial = name.charAt(0).toUpperCase()
  const lastNameInitial = lastName?.charAt(0).toUpperCase()
  
  return lastNameInitial ? `${nameInitial}${lastNameInitial}` : nameInitial
}
