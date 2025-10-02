import { UserRole } from '@prisma/client'

/**
 * Función auxiliar para verificar si un usuario tiene un rol específico
 * @param roles - Array de roles del usuario
 * @param targetRole - Rol a verificar
 * @returns true si el usuario tiene el rol especificado
 */
export function hasRole(roles: UserRole[], targetRole: UserRole): boolean {
  return roles.includes(targetRole)
}

/**
 * Función auxiliar para obtener el rol de mayor prioridad
 * @param roles - Array de roles del usuario
 * @returns El rol de mayor prioridad
 */
export function getHighestPriorityRole(roles: UserRole[]): UserRole {
  // Orden de prioridad: ADMIN > EDITOR > TEACHER > STUDENT > GUEST
  const rolePriority = {
    [UserRole.ADMIN]: 5,
    [UserRole.EDITOR]: 4,
    [UserRole.TEACHER]: 3,
    [UserRole.STUDENT]: 2,
    [UserRole.GUEST]: 1,
  }

  return roles.reduce((highest, current) => {
    return rolePriority[current] > rolePriority[highest] ? current : highest
  }, roles[0] || UserRole.GUEST)
}

/**
 * Función auxiliar para verificar permisos basada en múltiples roles
 * @param userRoles - Array de roles del usuario
 * @param requiredRoles - Array de roles requeridos (cualquiera de ellos es suficiente)
 * @returns true si el usuario tiene al menos uno de los roles requeridos
 */
export function hasPermission(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  return requiredRoles.some(role => hasRole(userRoles, role))
}

/**
 * Función auxiliar para verificar si el usuario puede acceder a rutas de administración
 * @param roles - Array de roles del usuario
 * @returns true si el usuario tiene rol ADMIN
 */
export function canAccessAdmin(roles: UserRole[]): boolean {
  return hasRole(roles, UserRole.ADMIN)
}

/**
 * Función auxiliar para verificar si el usuario puede acceder a rutas de profesor
 * @param roles - Array de roles del usuario
 * @returns true si el usuario tiene rol TEACHER o ADMIN
 */
export function canAccessTeacher(roles: UserRole[]): boolean {
  return hasRole(roles, UserRole.TEACHER) || hasRole(roles, UserRole.ADMIN)
}

/**
 * Función auxiliar para verificar si el usuario puede acceder a rutas de estudiante
 * @param roles - Array de roles del usuario
 * @returns true si el usuario tiene rol STUDENT, TEACHER o ADMIN
 */
export function canAccessStudent(roles: UserRole[]): boolean {
  return hasRole(roles, UserRole.STUDENT) || hasRole(roles, UserRole.TEACHER) || hasRole(roles, UserRole.ADMIN)
}

/**
 * Función auxiliar para verificar si el usuario puede acceder a rutas de editor
 * @param roles - Array de roles del usuario
 * @returns true si el usuario tiene rol EDITOR o ADMIN
 */
export function canAccessEditor(roles: UserRole[]): boolean {
  return hasRole(roles, UserRole.EDITOR) || hasRole(roles, UserRole.ADMIN)
}

/**
 * Función auxiliar para obtener una descripción legible de los roles
 * @param roles - Array de roles del usuario
 * @returns String con los nombres de los roles separados por comas
 */
export function getRoleNames(roles: UserRole[]): string {
  const roleNames = {
    [UserRole.ADMIN]: 'Administrador',
    [UserRole.EDITOR]: 'Editor',
    [UserRole.TEACHER]: 'Profesor',
    [UserRole.STUDENT]: 'Estudiante',
    [UserRole.GUEST]: 'Invitado',
  }

  return roles.map(role => roleNames[role]).join(', ')
}
