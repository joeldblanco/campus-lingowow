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
  await page.goto(`${baseURL}/auth/signin`, { waitUntil: 'domcontentloaded' })

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

  // El dashboard mantiene conexiones persistentes, por lo que networkidle no es
  // una señal fiable de que la autenticación haya terminado.
  await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), { timeout: 30000 })

  // Verificar la sesión directamente: el menú depende de la ruta renderizada y
  // no forma parte del estado que se guarda para los tests.
  const sessionResponse = await page.request.get(`${baseURL}/api/auth/session`)
  const session = (await sessionResponse.json()) as { user?: { email?: string } }

  if (!sessionResponse.ok() || session.user?.email !== email) {
    throw new Error(`Login falló para ${userType}: sesión no encontrada`)
  }

  console.log(`    ✓ Login exitoso para ${userType}`)
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
