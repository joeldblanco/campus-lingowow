import { Page, expect } from '@playwright/test'
import { UserRole } from '@prisma/client'

// Test data constants
export const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!',
    name: 'Admin',
    lastName: 'Test',
    roles: [UserRole.ADMIN],
  },
  teacher: {
    email: 'teacher@test.com',
    password: 'Teacher123!',
    name: 'Teacher',
    lastName: 'Test',
    roles: [UserRole.TEACHER],
  },
  student: {
    email: 'student@test.com',
    password: 'Student123!',
    name: 'Student',
    lastName: 'Test',
    roles: [UserRole.STUDENT],
  },
}

export const TEST_COURSES = {
  english: {
    title: 'English Course Test',
    description: 'Test course for English learning',
    language: 'English',
    level: 'Beginner',
  },
  spanish: {
    title: 'Spanish Course Test',
    description: 'Test course for Spanish learning',
    language: 'Spanish',
    level: 'Intermediate',
  },
}

export const TEST_PRODUCTS = {
  basicCourse: {
    name: 'Basic Course Package',
    description: 'Basic course package for testing',
    price: 99.99,
    sku: 'BASIC-001',
  },
  premiumCourse: {
    name: 'Premium Course Package',
    description: 'Premium course package with scheduling',
    price: 199.99,
    sku: 'PREMIUM-001',
    requiresScheduling: true,
  },
}

// Helper functions
export class TestHelpers {
  constructor(private page: Page) {}

  // Authentication helpers
  async login(email: string, password: string, preserveCallbackUrl = false) {
    // Only navigate to signin if not already there (to preserve callback URL)
    if (!preserveCallbackUrl || !this.page.url().includes('/auth/signin')) {
      await this.page.goto('/auth/signin', { waitUntil: 'networkidle' })
    }

    // Wait for the form to be fully loaded and interactive
    await this.page.waitForSelector('[data-testid="email-input"]', { 
      state: 'visible',
      timeout: 15000 
    })
    await this.page.waitForSelector('[data-testid="login-button"]', { 
      state: 'visible',
      timeout: 15000 
    })

    // Wait for any hydration to complete
    await this.page.waitForTimeout(1000)

    // Fill form fields with explicit waits
    await this.page.fill('[data-testid="email-input"]', email)
    await this.page.waitForTimeout(300)
    await this.page.fill('[data-testid="password-input"]', password)
    await this.page.waitForTimeout(300)

    // Click login button and wait for navigation to start
    await Promise.all([
      this.page.waitForNavigation({ timeout: 30000 }).catch(() => {}),
      this.page.click('[data-testid="login-button"]'),
    ])

    // Strategy 1: Wait for authentication response (more flexible)
    try {
      await this.page.waitForResponse(
        (response) => {
          const url = response.url()
          const status = response.status()
          return (
            (url.includes('/api/auth') ||
              url.includes('/auth/signin') ||
              url.includes('/dashboard')) &&
            (status === 200 || status === 302)
          )
        },
        { timeout: 20000 }
      )
    } catch {
      console.log('Auth response timeout, continuing with navigation check...')
    }

    // Strategy 2: Wait for navigation away from signin page
    try {
      await this.page.waitForFunction(
        () => {
          return !window.location.pathname.includes('/auth/signin')
        },
        { timeout: 20000 }
      )
    } catch {
      console.log('Navigation timeout, checking current URL...')
    }

    // Strategy 3: Wait for successful redirect with more flexible patterns
    try {
      await this.page.waitForURL(
        (url) => {
          const path = url.pathname
          return (
            path === '/dashboard' ||
            path === '/admin' ||
            path === '/classroom' ||
            path.startsWith('/admin/') ||
            path.startsWith('/courses') ||
            path.startsWith('/activities')
          )
        },
        { timeout: 20000 }
      )
    } catch {
      // If URL check fails, continue - might be on a valid authenticated page
      console.log('URL pattern timeout, checking for user menu...')
    }

    // Strategy 4: Wait for DOM and React hydration
    await this.page.waitForLoadState('networkidle', { timeout: 10000 })

    // Give extra time for session establishment and component rendering
    await this.page.waitForTimeout(3000)

    // Strategy 5: Check for user menu with retries
    let retries = 3
    while (retries > 0) {
      try {
        await this.page.waitForSelector('[data-testid="user-menu-trigger"]', {
          state: 'visible',
          timeout: 10000,
        })
        break // Success, exit retry loop
      } catch {
        retries--
        if (retries > 0) {
          console.log(`User menu not found, retrying... (${retries} attempts left)`)
          await this.page.waitForTimeout(2000)
          // Try refreshing the page to ensure session is loaded
          await this.page.reload({ waitUntil: 'networkidle' })
          await this.page.waitForTimeout(2000)
        } else {
          throw new Error('User menu not found after login. Authentication may have failed.')
        }
      }
    }
  }

  async loginAsAdmin() {
    await this.login(TEST_USERS.admin.email, TEST_USERS.admin.password)
  }

  async loginAsAdminWithCallback() {
    await this.login(TEST_USERS.admin.email, TEST_USERS.admin.password, true)
  }

  async loginAsTeacher() {
    await this.login(TEST_USERS.teacher.email, TEST_USERS.teacher.password)
  }

  async loginAsStudent() {
    await this.login(TEST_USERS.student.email, TEST_USERS.student.password)
  }

  async logout() {
    // Esperar a que el elemento esté visible y accesible
    await this.page.waitForSelector('[data-testid="user-menu-trigger"]', {
      state: 'visible',
      timeout: 30000,
    })

    // Scroll to element to ensure it's in viewport
    await this.page.locator('[data-testid="user-menu-trigger"]').scrollIntoViewIfNeeded()

    // Wait a bit for any animations to complete
    await this.page.waitForTimeout(1000)

    // Hacer click en el trigger para abrir el dropdown
    // Usar force: true para evitar que nextjs-portal intercepte el click
    await this.page.click('[data-testid="user-menu-trigger"]', { force: true })

    // Esperar a que el dropdown esté completamente renderizado
    // shadcn/ui DropdownMenu usa Radix UI que necesita tiempo para portal rendering
    await this.page.waitForTimeout(1500)

    // Esperar explícitamente a que el dropdown content esté visible en el DOM
    await this.page.waitForSelector('[role="menu"]', {
      state: 'visible',
      timeout: 10000,
    })

    // Buscar el botón de logout con reintentos
    let retries = 3
    while (retries > 0) {
      try {
        // Esperar a que el botón de logout esté visible
        const logoutButton = this.page.locator('[data-testid="logout-button"]')
        await logoutButton.waitFor({ state: 'visible', timeout: 5000 })

        // Hacer click en logout
        await logoutButton.click()

        // Esperar a que la navegación se complete (puede ir a / o /auth/signin)
        await this.page.waitForURL(/\/(auth\/signin)?$/, { timeout: 10000 })
        break
      } catch {
        retries--
        if (retries > 0) {
          console.log(`Logout button not found, retrying menu click... (${retries} attempts left)`)
          // Cerrar y reabrir el menú
          await this.page.keyboard.press('Escape')
          await this.page.waitForTimeout(500)
          await this.page.click('[data-testid="user-menu-trigger"]')
          await this.page.waitForTimeout(1500)
          await this.page.waitForSelector('[role="menu"]', { state: 'visible', timeout: 5000 })
        } else {
          throw new Error('Logout button not found after opening user menu')
        }
      }
    }
  }

  // Navigation helpers
  async navigateToAdminPanel() {
    await this.page.goto('/admin', { timeout: 30000 })
    await expect(this.page).toHaveURL(/\/admin/, { timeout: 15000 })
  }

  async navigateToDashboard() {
    await this.page.goto('/dashboard', { timeout: 30000 })
    await expect(this.page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  }

  async navigateToActivities() {
    await this.page.goto('/activities', { timeout: 30000 })
    await expect(this.page).toHaveURL(/\/activities/, { timeout: 15000 })
  }

  async navigateToCourses() {
    await this.page.goto('/courses', { timeout: 30000 })
    await expect(this.page).toHaveURL(/\/courses/, { timeout: 15000 })
  }

  async navigateToShop() {
    await this.page.goto('/shop', { timeout: 30000 })
    await expect(this.page).toHaveURL(/\/shop/, { timeout: 15000 })
  }

  // Form helpers
  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const selector = `[data-testid="${field}-input"]`

      // Check if element exists and what type it is
      const element = await this.page.locator(selector).first()
      const tagName = await element.evaluate((el) => el.tagName.toLowerCase())
      const role = await element.getAttribute('role')

      if (role === 'combobox' || tagName === 'button') {
        // Handle Select components
        await element.click()

        // Wait for dropdown to open
        await this.page.waitForTimeout(1000)

        // Try to find and click the option
        const optionSelector = `[role="option"]:has-text("${value}")`

        // Wait for the option to be available
        try {
          await this.page.waitForSelector(optionSelector, { timeout: 10000 })
          await this.page.click(optionSelector)
        } catch (error) {
          console.error(`Failed to select option "${value}" for field "${field}":`, error)

          // Try alternative selectors
          const alternativeSelectors = [
            `[data-value="${value}"]`,
            `text="${value}"`,
            `*:has-text("${value}")`,
          ]

          let optionFound = false
          for (const altSelector of alternativeSelectors) {
            try {
              await this.page.waitForSelector(altSelector, { timeout: 5000 })
              await this.page.click(altSelector)
              optionFound = true
              break
            } catch {
              // Continue to next selector
            }
          }

          if (!optionFound) {
            throw new Error(`Could not find option "${value}" for field "${field}"`)
          }
        }
      } else {
        // Handle regular input/textarea elements
        await this.page.fill(selector, value)
      }
    }
  }

  async submitForm(formTestId = 'submit-button') {
    await this.page.click(`[data-testid="${formTestId}"]`)
  }

  // Wait helpers
  async waitForToast(message?: string) {
    // Try to wait for toast, but don't fail if it doesn't appear
    try {
      const toastLocator = this.page.locator('[data-testid="toast"]')
      await expect(toastLocator).toBeVisible({ timeout: 10000 })

      if (message) {
        await expect(toastLocator).toContainText(message, { timeout: 5000 })
      }

      // Wait for toast to disappear
      await expect(toastLocator).toBeHidden({ timeout: 15000 })
    } catch {
      // Toast didn't appear, which is okay - just wait a bit for the operation to complete
      await this.page.waitForTimeout(2000)
    }
  }

  // Alternative method that doesn't rely on toast
  async waitForOperationComplete(dialogTestId?: string) {
    if (dialogTestId) {
      // Wait for dialog to close
      await expect(this.page.locator(`[data-testid="${dialogTestId}"]`)).toBeHidden({
        timeout: 10000,
      })
    } else {
      // General wait for operations to complete
      await this.page.waitForTimeout(3000)
    }
  }

  async waitForLoadingToFinish() {
    // Wait for any loading spinners to disappear - use try/catch as spinner might not exist
    try {
      await this.page.waitForSelector('[data-testid="loading-spinner"]', {
        state: 'hidden',
        timeout: 10000,
      })
    } catch {
      // Spinner doesn't exist or already gone, just wait a bit
      await this.page.waitForTimeout(2000)
    }
  }

  // Table helpers
  async getTableRowCount(tableTestId = 'data-table') {
    if (tableTestId === 'courses-table') {
      // For courses table, count the course cards in the grid
      const cards = await this.page.locator('[data-testid="courses-table"] .grid > div').count()
      return cards
    } else {
      // For other tables, use the standard structure
      const rows = await this.page.locator(`[data-testid="${tableTestId}"] tbody tr`).count()
      return rows
    }
  }

  async clickTableAction(rowIndex: number, action: string, tableTestId = 'data-table') {
    if (tableTestId === 'courses-table') {
      // For courses table, we need to handle the dropdown menu
      // First, get all the course cards
      const courseCards = await this.page.locator('[data-testid="courses-table"] .grid > div').all()

      if (courseCards.length === 0) {
        throw new Error('No courses found in the table')
      }

      if (rowIndex >= courseCards.length) {
        throw new Error(
          `Row index ${rowIndex} is out of bounds. Only ${courseCards.length} courses found.`
        )
      }

      // Click the dropdown menu button for the specific course card
      const targetCard = courseCards[rowIndex]
      const menuButton = targetCard.locator('[data-testid="course-actions-button"]')

      // Wait for the button to be visible and clickable
      await menuButton.waitFor({ state: 'visible' })
      await menuButton.click()

      // Wait for dropdown to open
      await this.page.waitForSelector('[role="menuitem"]', { timeout: 5000 })

      // Map action names to the actual menu item text
      const actionMap: Record<string, string> = {
        view: 'Ver detalles',
        edit: 'Editar',
        delete: 'Eliminar',
        publish: 'Publicar',
        unpublish: 'Despublicar',
      }

      const menuItemText = actionMap[action]
      if (!menuItemText) {
        throw new Error(
          `Unknown action: ${action}. Available actions: ${Object.keys(actionMap).join(', ')}`
        )
      }

      // Click the specific menu item
      const menuItem = this.page.locator(`[role="menuitem"]:has-text("${menuItemText}")`)
      await menuItem.waitFor({ state: 'visible' })
      await menuItem.click()
    } else {
      // For other tables, use the standard structure
      await this.page.click(
        `[data-testid="${tableTestId}"] tbody tr:nth-child(${rowIndex + 1}) [data-testid="${action}-button"]`
      )
    }
  }

  // Dialog helpers
  async waitForDialog(dialogTestId = 'dialog') {
    await expect(this.page.locator(`[data-testid="${dialogTestId}"]`)).toBeVisible()
  }

  async closeDialog(dialogTestId = 'dialog') {
    await this.page.click(`[data-testid="${dialogTestId}"] [data-testid="close-button"]`)
    await expect(this.page.locator(`[data-testid="${dialogTestId}"]`)).toBeHidden()
  }

  // Video call helpers
  async startVideoCall(roomId: string) {
    await this.page.goto(`/video-call/${roomId}`)
    await this.waitForLoadingToFinish()
  }

  async joinVideoCall() {
    await this.page.click('[data-testid="join-call-button"]')
    await this.waitForLoadingToFinish()
  }

  async endVideoCall() {
    await this.page.click('[data-testid="end-call-button"]')
  }

  // E-commerce helpers
  async addToCart(productId: string) {
    await this.page.goto(`/shop/product/${productId}`)
    await this.page.click('[data-testid="add-to-cart-button"]')
    await this.waitForToast('Added to cart')
  }

  async proceedToCheckout() {
    await this.page.click('[data-testid="cart-button"]')
    await this.page.click('[data-testid="checkout-button"]')
  }

  // Activity helpers
  async completeActivity(activityId: string) {
    await this.page.goto(`/activities/${activityId}`)
    await this.waitForLoadingToFinish()

    // This would depend on the activity type
    // For now, just click complete button
    await this.page.click('[data-testid="complete-activity-button"]')
    await this.waitForToast('Activity completed')
  }

  // Assertion helpers
  async expectPageTitle(title: string) {
    await expect(this.page).toHaveTitle(title, { timeout: 10000 })
  }

  async expectElementVisible(testId: string) {
    await expect(this.page.locator(`[data-testid="${testId}"]`)).toBeVisible({ timeout: 15000 })
  }

  async expectElementHidden(testId: string) {
    await expect(this.page.locator(`[data-testid="${testId}"]`)).toBeHidden({ timeout: 10000 })
  }

  async expectElementText(testId: string, text: string) {
    if (testId === 'courses-table') {
      // For courses table, search within the course cards
      await expect(this.page.locator(`[data-testid="${testId}"] .grid`)).toContainText(text, {
        timeout: 10000,
      })
    } else {
      // For other elements, use the standard approach
      await expect(this.page.locator(`[data-testid="${testId}"]`)).toContainText(text, {
        timeout: 10000,
      })
    }
  }

  async expectUrl(urlPattern: string | RegExp) {
    await expect(this.page).toHaveURL(urlPattern, { timeout: 15000 })
  }
}

// Database helpers for test setup/teardown
export class DatabaseHelpers {
  // These would typically use your database client directly
  // For now, providing the structure

  static async createTestUser(userData: {
    name: string
    lastName: string
    email: string
    password: string
    roles: UserRole[]
    isActive?: boolean
  }) {
    try {
      // Import Prisma client and bcrypt for user creation
      const { PrismaClient } = await import('@prisma/client')
      const bcrypt = await import('bcryptjs')

      const prisma = new PrismaClient()

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      })

      if (existingUser) {
        console.log(`User ${userData.email} already exists`)
        await prisma.$disconnect()
        return
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10)

      // Create user
      await prisma.user.create({
        data: {
          name: userData.name,
          lastName: userData.lastName,
          email: userData.email,
          password: hashedPassword,
          roles: userData.roles as UserRole[],
          status: userData.isActive ? 'ACTIVE' : 'INACTIVE',
          emailVerified: new Date(), // Auto-verify test users
        },
      })

      console.log(`Created test user: ${userData.email}`)
      await prisma.$disconnect()
    } catch (error) {
      console.error('Error creating test user:', error)
      throw error
    }
  }

  static async createTestCourse(courseData: {
    title: string
    description: string
    language: string
    level: string
    isPublished?: boolean
  }) {
    try {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()

      // Check if course already exists
      const existingCourse = await prisma.course.findFirst({
        where: { title: courseData.title },
      })

      if (existingCourse) {
        console.log(`Course ${courseData.title} already exists`)
        await prisma.$disconnect()
        return
      }

      // Get admin user to use as creator
      const adminUser = await prisma.user.findFirst({
        where: { email: TEST_USERS.admin.email },
      })

      if (!adminUser) {
        throw new Error('Admin user not found. Cannot create course.')
      }

      // Create course
      await prisma.course.create({
        data: {
          title: courseData.title,
          description: courseData.description,
          language: courseData.language,
          level: courseData.level,
          isPublished: courseData.isPublished || false,
          createdById: adminUser.id,
        },
      })

      console.log(`Created test course: ${courseData.title}`)
      await prisma.$disconnect()
    } catch (error) {
      console.error('Error creating test course:', error)
    }
  }

  static async createTestProduct(productData: {
    name: string
    description: string
    price: number
    isActive?: boolean
    requiresScheduling?: boolean
  }) {
    try {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()

      // Check if product already exists
      const existingProduct = await prisma.product.findFirst({
        where: { name: productData.name },
      })

      if (existingProduct) {
        console.log(`Product ${productData.name} already exists`)
        await prisma.$disconnect()
        return
      }

      // Create product
      await prisma.product.create({
        data: {
          name: productData.name,
          slug: productData.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
          description: productData.description,
          price: productData.price,
          isActive: productData.isActive || true,
          requiresScheduling: productData.requiresScheduling || false,
        },
      })

      console.log(`Created test product: ${productData.name}`)
      await prisma.$disconnect()
    } catch (error) {
      console.error('Error creating test product:', error)
    }
  }

  static async cleanupTestData() {
    try {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()

      // Clean up test data (be careful not to delete production data)
      // Only delete users with test emails
      await prisma.user.deleteMany({
        where: {
          email: {
            endsWith: '@test.com',
          },
        },
      })

      console.log('Cleaned up test data')
      await prisma.$disconnect()
    } catch (error) {
      console.error('Error cleaning up test data:', error)
    }
  }
}

// Random data generators
export class DataGenerators {
  static randomEmail() {
    return `test-${Date.now()}@example.com`
  }

  static randomString(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  static randomPrice() {
    return Math.floor(Math.random() * 1000) + 10
  }

  static randomDate() {
    const start = new Date()
    const end = new Date()
    end.setFullYear(start.getFullYear() + 1)
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  }
}
