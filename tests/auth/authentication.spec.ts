import { test } from '@playwright/test'
import { TestHelpers, TEST_USERS, DataGenerators } from '../utils/test-helpers'

test.describe('Authentication', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test.describe('Login', () => {
    test('should login successfully with valid credentials', async () => {
      await helpers.login(TEST_USERS.student.email, TEST_USERS.student.password)

      // Should redirect to dashboard
      await helpers.expectUrl(/\/dashboard/)

      // Should show user menu
      await helpers.expectElementVisible('user-menu-trigger')
    })

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto('/auth/signin')

      await helpers.fillForm({
        email: 'invalid@test.com',
        password: 'wrongpassword',
      })

      await helpers.submitForm('login-button')

      // Should show error message
      await helpers.waitForToast('Credenciales inválidas')

      // Should stay on login page
      await helpers.expectUrl(/\/auth\/signin/)
    })

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/auth/signin')

      await helpers.submitForm('login-button')

      // Should show validation errors
      await helpers.expectElementVisible('email-error')
      await helpers.expectElementVisible('password-error')
    })

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto('/auth/signin')

      // Esperar a que el formulario esté cargado
      await page.waitForSelector('[data-testid="email-input"]', { state: 'visible' })
      
      // Desactivar validación HTML5 del formulario para poder probar validación de Zod
      await page.evaluate(() => {
        const form = document.querySelector('form')
        if (form) {
          form.setAttribute('novalidate', 'true')
        }
      })
      
      // Ahora llenar con email inválido (sin @)
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      
      // Llenar password para hacer el formulario parcialmente válido
      await page.fill('[data-testid="password-input"]', 'Test1234!@#')
      
      // Intentar enviar el formulario para disparar validación de Zod
      await page.click('[data-testid="login-button"]')
      
      // Esperar a que la validación se dispare
      await page.waitForTimeout(1000)

      // Debe mostrar error de formato de email
      await helpers.expectElementVisible('email-error')
      await helpers.expectElementText('email-error', 'Formato de correo electrónico inválido')
    })

    test('should redirect to intended page after login', async ({ page }) => {
      // Try to access protected page
      await page.goto('/admin/courses')

      // Should redirect to login
      await helpers.expectUrl(/\/auth\/signin/)

      // Login as admin (preserving callback URL)
      await helpers.loginAsAdminWithCallback()

      // Should redirect back to intended page
      await helpers.expectUrl(/\/admin\/courses/)
    })
  })

  test.describe('Registration', () => {
    test('should register successfully with valid data', async ({ page }) => {
      const testUser = {
        name: 'Test',
        lastName: 'User',
        email: DataGenerators.randomEmail(),
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
      }

      await page.goto('/auth/signup')

      // Esperar a que el formulario esté completamente cargado
      await page.waitForSelector('[data-testid="name-input"]', { state: 'visible' })
      await page.waitForTimeout(500)

      // Llenar campos directamente con esperas
      await page.fill('[data-testid="name-input"]', testUser.name)
      await page.waitForTimeout(200)
      
      await page.fill('[data-testid="last-name-input"]', testUser.lastName)
      await page.waitForTimeout(200)
      
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.waitForTimeout(200)
      
      await page.fill('[data-testid="password-input"]', testUser.password)
      await page.waitForTimeout(200)
      
      await page.fill('[data-testid="confirm-password-input"]', testUser.confirmPassword)
      await page.waitForTimeout(200)

      // Hacer clic en el botón de registro
      await page.click('[data-testid="register-button"]')

      // Should show success message
      await helpers.waitForToast('Registro exitoso')

      // Should redirect to verification page
      await helpers.expectUrl(/\/auth\/verification/)
    })

    test('should show error when passwords do not match', async ({ page }) => {
      await page.goto('/auth/signup')

      await helpers.fillForm({
        name: 'Test',
        'last-name': 'User',
        email: DataGenerators.randomEmail(),
        password: 'TestPassword123!',
        'confirm-password': 'DifferentPassword123!',
      })

      await helpers.submitForm('register-button')

      // Should show password mismatch error
      await helpers.expectElementVisible('confirm-password-error')
      await helpers.expectElementText('confirm-password-error', 'Las contraseñas no coinciden')
    })

    test('should show error for weak password', async ({ page }) => {
      await page.goto('/auth/signup')

      await helpers.fillForm({
        name: 'Test',
        'last-name': 'User',
        email: DataGenerators.randomEmail(),
        password: '123',
        'confirm-password': '123',
      })

      await helpers.submitForm('register-button')

      // Should show password strength error
      await helpers.expectElementVisible('password-error')
      await helpers.expectElementText('password-error', 'La contraseña debe tener al menos 8 caracteres')
    })

    test('should show error for existing email', async ({ page }) => {
      await page.goto('/auth/signup')

      await helpers.fillForm({
        name: 'Test',
        'last-name': 'User',
        email: TEST_USERS.student.email, // Existing email
        password: 'TestPassword123!',
        'confirm-password': 'TestPassword123!',
      })

      await helpers.submitForm('register-button')

      // Should show email exists error
      await helpers.waitForToast('El correo ya está en uso')
    })
  })

  test.describe('Password Reset', () => {
    test('should send reset email for valid email', async ({ page }) => {
      await page.goto('/auth/reset')

      // Esperar a que el formulario esté completamente cargado
      await page.waitForSelector('[data-testid="email-input"]', { state: 'visible' })
      await page.waitForTimeout(500)

      // Llenar el campo de email directamente
      await page.fill('[data-testid="email-input"]', TEST_USERS.student.email)
      
      // Verificar que el valor se mantuvo
      await page.waitForTimeout(300)
      const emailValue = await page.inputValue('[data-testid="email-input"]')
      if (emailValue !== TEST_USERS.student.email) {
        // Si se borró, intentar de nuevo
        await page.fill('[data-testid="email-input"]', TEST_USERS.student.email)
        await page.waitForTimeout(300)
      }

      // Hacer clic en el botón de reset
      await page.click('[data-testid="reset-button"]')

      // Should show success message
      await helpers.waitForToast('Correo de recuperación enviado')

      // Should redirect to signin
      await helpers.expectUrl(/\/auth\/signin/)
    })

    test('should show error for non-existent email', async ({ page }) => {
      await page.goto('/auth/reset')

      await helpers.fillForm({
        email: 'nonexistent@test.com',
      })

      await helpers.submitForm('reset-button')

      // Should show error message
      await helpers.waitForToast('Correo electrónico no encontrado')
    })
  })

  test.describe('Email Verification', () => {
    test('should show verification page after registration', async ({ page }) => {
      // This test would require a valid verification token
      // For now, just test the page loads
      await page.goto('/auth/verification')

      await helpers.expectElementVisible('verification-form')
      await helpers.expectElementText('verification-title', 'Verifica tu correo electrónico')
    })

    test('should resend verification email', async ({ page }) => {
      await page.goto('/auth/verification')

      await page.click('[data-testid="resend-button"]')

      // Should show success message
      await helpers.waitForToast('Correo de verificación enviado')
    })
  })

  test.describe('Guest Access', () => {
    test('guest should not access protected pages', async ({ page }) => {
      await page.goto('/dashboard')

      // Should redirect to login
      await helpers.expectUrl(/\/auth\/signin/)
    })

    test('guest should not access admin panel', async ({ page }) => {
      await page.goto('/admin')

      // Should redirect to login
      await helpers.expectUrl(/\/auth\/signin/)
    })
  })

  // NOTA: Los tests de Session Management, Logout y Role-based Access
  // se han movido a authentication-with-storage.spec.ts para usar storage state
  // Esto hace los tests más rápidos y confiables, especialmente en WebKit
})
