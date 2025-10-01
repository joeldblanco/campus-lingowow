import { UserRole } from '@prisma/client'

/**
 * Interfaz para usuarios con roles
 */
export interface UserWithRoles {
  roles: UserRole[]
}

/**
 * Verifica si un usuario tiene un rol específico
 */
export function hasRole(user: UserWithRoles | null, role: UserRole): boolean {
  if (!user || !user.roles) return false
  return user.roles.includes(role)
}

/**
 * Verifica si un usuario tiene al menos uno de los roles especificados
 */
export function hasAnyRole(user: UserWithRoles | null, roles: UserRole[]): boolean {
  if (!user || !user.roles) return false
  return roles.some(role => user.roles.includes(role))
}

/**
 * Verifica si un usuario tiene todos los roles especificados
 */
export function hasAllRoles(user: UserWithRoles | null, roles: UserRole[]): boolean {
  if (!user || !user.roles) return false
  return roles.every(role => user.roles.includes(role))
}

/**
 * Obtiene el rol principal del usuario (el primero en orden de prioridad)
 */
export function getPrimaryRole(user: UserWithRoles | null): UserRole {
  if (!user || !user.roles || user.roles.length === 0) return 'GUEST'
  
  // Orden de prioridad: ADMIN > TEACHER > STUDENT > GUEST
  const priorityOrder: UserRole[] = ['ADMIN', 'TEACHER', 'STUDENT', 'GUEST']
  
  for (const role of priorityOrder) {
    if (user.roles.includes(role)) {
      return role
    }
  }
  
  return 'GUEST'
}

/**
 * Verifica si un usuario es estudiante
 */
export function isStudent(user: UserWithRoles | null): boolean {
  return hasRole(user, 'STUDENT')
}

/**
 * Verifica si un usuario es profesor
 */
export function isTeacher(user: UserWithRoles | null): boolean {
  return hasRole(user, 'TEACHER')
}

/**
 * Verifica si un usuario es administrador
 */
export function isAdmin(user: UserWithRoles | null): boolean {
  return hasRole(user, 'ADMIN')
}

/**
 * Verifica si un usuario es invitado (solo tiene rol GUEST)
 */
export function isGuest(user: UserWithRoles | null): boolean {
  if (!user || !user.roles || user.roles.length === 0) return true
  return user.roles.length === 1 && user.roles[0] === 'GUEST'
}

/**
 * Agrega un rol a un usuario (para uso en mutations)
 */
export function addRole(currentRoles: UserRole[], newRole: UserRole): UserRole[] {
  if (currentRoles.includes(newRole)) return currentRoles
  
  // Si era GUEST y se agrega otro rol, remover GUEST
  if (newRole !== 'GUEST' && currentRoles.includes('GUEST')) {
    return [...currentRoles.filter(role => role !== 'GUEST'), newRole]
  }
  
  return [...currentRoles, newRole]
}

/**
 * Remueve un rol de un usuario (para uso en mutations)
 */
export function removeRole(currentRoles: UserRole[], roleToRemove: UserRole): UserRole[] {
  const newRoles = currentRoles.filter(role => role !== roleToRemove)
  
  // Si no quedan roles, agregar GUEST
  if (newRoles.length === 0) {
    return ['GUEST']
  }
  
  return newRoles
}

/**
 * Obtiene una descripción legible de los roles del usuario
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    ADMIN: 'Administrador',
    TEACHER: 'Profesor',
    STUDENT: 'Estudiante',
    GUEST: 'Invitado'
  }
  
  return roleNames[role] || 'Desconocido'
}

/**
 * Obtiene todas las descripciones de roles del usuario
 */
export function getUserRoleDisplayNames(user: UserWithRoles | null): string[] {
  if (!user || !user.roles) return ['Invitado']
  return user.roles.map(role => getRoleDisplayName(role))
}
