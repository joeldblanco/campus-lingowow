import { chromium, Page } from '@playwright/test'
import { TEST_USERS } from '../utils/test-helpers'
import * as path from 'path'

const STORAGE_STATE_DIR = path.join(__dirname, '.auth')

export const AUTH_STORAGE_PATHS = {
  admin: path.join(STORAGE_STATE_DIR, 'admin.json'),
  teacher: path.join(STORAGE_STATE_DIR, 'teacher.json'),
  student: path.join(STORAGE_STATE_DIR, 'student.json'),
}

/**
 * Genera estados de autenticación para todos los tipos de usuarios
 * Esto se ejecuta en el global-setup antes de los tests
 */
export async function generateAuthStates(baseURL: string) {
  console.log('🔐 Generando estados de autenticación...')

  const browser = await chromium.launch()

  try {
    // Generar estado para cada tipo de usuario
    for (const [userType, userData] of Object.entries(TEST_USERS)) {
      console.log(`  - Generando estado para ${userType}...`)
      
      const context = await browser.newContext()
      const page = await context.newPage()

      try {
        // Hacer login
        await loginAndSaveState(page, baseURL, userData.email, userData.password, userType)
        
        // Guardar el storage state
        await context.storageState({ path: AUTH_STORAGE_PATHS[userType as keyof typeof AUTH_STORAGE_PATHS] })
        
        console.log(`  ✅ Estado guardado para ${userType}`)
      } catch (error) {
        console.error(`  ❌ Error generando estado para ${userType}:`, error)
        throw error
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  console.log('✅ Estados de autenticación generados exitosamente')
}

/**
 * Realiza el login y espera a que la sesión esté establecida
 */
async function loginAndSaveState(
  page: Page,
  baseURL: string,
  email: string,
  password: string,
  userType: string
) {
  // Ir a la página de login
  await page.goto(`${baseURL}/auth/signin`, { waitUntil: 'networkidle' })

  // Esperar a que el formulario esté listo
  await page.waitForSelector('[data-testid="email-input"]', { 
    state: 'visible',
    timeout: 15000 
  })

  // Esperar hydration
  await page.waitForTimeout(1000)

  // Llenar el formulario
  await page.fill('[data-testid="email-input"]', email)
  await page.waitForTimeout(300)
  await page.fill('[data-testid="password-input"]', password)
  await page.waitForTimeout(300)

  // Hacer clic en login y esperar navegación
  await Promise.all([
    page.waitForNavigation({ timeout: 30000 }).catch(() => {}),
    page.click('[data-testid="login-button"]'),
  ])

  // Esperar a que la navegación se complete
  await page.waitForLoadState('networkidle', { timeout: 30000 })

  // Verificar que el login fue exitoso esperando el user menu
  let retries = 5
  while (retries > 0) {
    try {
      await page.waitForSelector('[data-testid="user-menu-trigger"]', {
        state: 'visible',
        timeout: 5000,
      })
      console.log(`    ✓ Login exitoso para ${userType}`)
      break
    } catch {
      retries--
      if (retries > 0) {
        console.log(`    ⟳ Reintentando verificación de login (${retries} intentos restantes)...`)
        await page.waitForTimeout(2000)
        await page.reload({ waitUntil: 'networkidle' })
      } else {
        throw new Error(`Login falló para ${userType}: user menu no encontrado`)
      }
    }
  }

  // Esperar un poco más para asegurar que las cookies estén guardadas
  await page.waitForTimeout(2000)
}

/**
 * Limpia los archivos de storage state
 */
export async function cleanAuthStates() {
  const fs = await import('fs/promises')
  
  try {
    await fs.rm(STORAGE_STATE_DIR, { recursive: true, force: true })
    console.log('🧹 Estados de autenticación limpiados')
  } catch {
    // Ignorar si el directorio no existe
  }
}
