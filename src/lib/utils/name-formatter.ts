/**
 * Utilidades para formatear nombres de usuarios con capitalización adecuada
 */

/**
 * Capitaliza la primera letra de cada palabra en un nombre
 * Maneja casos especiales como nombres compuestos
 */
export function formatFirstName(name: string): string {
  if (!name || typeof name !== 'string') return ''
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Manejar casos especiales como "McDonald", "O'Connor", etc.
      if (word.startsWith('mc') && word.length > 2) {
        return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3)
      }
      if (word.startsWith("o'") && word.length > 2) {
        return "O'" + word.charAt(2).toUpperCase() + word.slice(3)
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/**
 * Formatea el nombre completo del usuario
 */
export function formatFullName(name: string, lastName?: string | null): string {
  const formattedName = formatFirstName(name)
  
  if (!lastName) return formattedName
  
  const formattedLastName = formatFirstName(lastName)
  return `${formattedName} ${formattedLastName}`
}

/**
 * Obtiene el nombre para mostrar (prioriza nombre completo si hay apellido)
 */
export function getDisplayName(user: { name: string; lastName?: string | null }): string {
  return formatFullName(user.name, user.lastName)
}

/**
 * Formatea iniciales para avatares
 */
export function getInitials(name: string, lastName?: string | null): string {
  const nameInitial = name.charAt(0).toUpperCase()
  const lastNameInitial = lastName?.charAt(0).toUpperCase()
  
  return lastNameInitial ? `${nameInitial}${lastNameInitial}` : nameInitial
}
