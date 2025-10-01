import { test as base } from '@playwright/test'
import { AUTH_STORAGE_PATHS } from './auth-storage'

/**
 * Fixtures de autenticación que cargan storage states pre-autenticados
 * Esto evita tener que hacer login en cada test
 */

// Fixture para tests que requieren usuario admin
export const testAsAdmin = base.extend({
  storageState: AUTH_STORAGE_PATHS.admin,
})

// Fixture para tests que requieren usuario teacher
export const testAsTeacher = base.extend({
  storageState: AUTH_STORAGE_PATHS.teacher,
})

// Fixture para tests que requieren usuario student
export const testAsStudent = base.extend({
  storageState: AUTH_STORAGE_PATHS.student,
})

/**
 * Exportar también el test base para casos sin autenticación
 */
export const test = base
