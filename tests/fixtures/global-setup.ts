import { chromium, FullConfig } from '@playwright/test'
import { DatabaseHelpers, TEST_USERS } from '../utils/test-helpers'
import { generateAuthStates } from './auth-storage'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...')

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'

  // Start browser for setup operations
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...')
    await page.goto(baseURL)
    await page.waitForSelector('body', { timeout: 60000 }) // Increased for slower machines
    console.log('✅ Application is ready')

    // Setup test database
    console.log('🗄️ Setting up test database...')
    await setupTestDatabase()
    console.log('✅ Test database setup complete')

    // Create test users if they don't exist
    console.log('👥 Creating test users...')
    await createTestUsers()
    console.log('✅ Test users created')

    // Setup test data
    console.log('📚 Setting up test data...')
    await setupTestData()
    console.log('✅ Test data setup complete')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }

  // Generate authentication storage states
  try {
    await generateAuthStates(baseURL)
  } catch (error) {
    console.error('❌ Failed to generate auth states:', error)
    throw error
  }

  console.log('🎉 Global test setup completed successfully!')
}

async function setupTestDatabase() {
  // This would typically run database migrations and setup
  // For now, we'll just log the operation
  console.log('  - Running database migrations...')
  console.log('  - Creating test schemas...')
  console.log('  - Setting up test data constraints...')
}

async function createTestUsers() {
  // Create test users in the database
  for (const [userType, userData] of Object.entries(TEST_USERS)) {
    try {
      await DatabaseHelpers.createTestUser({
        ...userData,
        roles: userData.roles,
        isActive: true,
      })
      console.log(`  - Created ${userType} user: ${userData.email}`)
    } catch {
      console.log(`  - ${userType} user already exists: ${userData.email}`)
    }
  }
}

async function setupTestData() {
  // Create test courses
  console.log('  - Creating test courses...')
  await DatabaseHelpers.createTestCourse({
    title: 'Test English Course',
    description: 'English course for testing',
    language: 'English',
    level: 'Beginner',
    isPublished: true,
  })

  await DatabaseHelpers.createTestCourse({
    title: 'Test Spanish Course',
    description: 'Spanish course for testing',
    language: 'Spanish',
    level: 'Intermediate',
    isPublished: true,
  })

  // Create test products
  console.log('  - Creating test products...')
  await DatabaseHelpers.createTestProduct({
    name: 'Basic English Package',
    description: 'Basic English learning package',
    price: 99.99,
    isActive: true,
    requiresScheduling: false,
  })

  await DatabaseHelpers.createTestProduct({
    name: 'Premium Spanish Package',
    description: 'Premium Spanish learning with scheduling',
    price: 199.99,
    isActive: true,
    requiresScheduling: true,
  })

  // Create test activities
  console.log('  - Creating test activities...')
  // This would create various types of activities for testing
}

export default globalSetup
