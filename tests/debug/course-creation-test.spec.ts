import { test, expect } from '@playwright/test';
import { TestHelpers, DataGenerators } from '../utils/test-helpers';

test.describe('Debug - Course Creation Test', () => {
  test('should create a new course successfully', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Login as admin
    await helpers.loginAsAdmin();
    
    // Navigate to courses page
    await page.goto('/admin/courses');
    
    // Check if create course button exists
    await expect(page.locator('[data-testid="create-course-button"]')).toBeVisible();
    
    // Click create course button
    await page.click('[data-testid="create-course-button"]');
    
    // Wait for dialog to open
    await expect(page.locator('[data-testid="create-course-dialog"]')).toBeVisible();
    
    // Check if form elements exist
    await expect(page.locator('[data-testid="title-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="description-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="language-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="level-input"]')).toBeVisible();
    
    const courseData = {
      title: `Test Course ${DataGenerators.randomString()}`,
      description: 'Test course description',
      language: 'Inglés',
      level: 'Principiante'
    };

    // Fill the form using our updated fillForm method
    await helpers.fillForm(courseData);
    
    // Submit form
    await page.click('[data-testid="save-course-button"]');
    
    // Wait a bit to see what happens
    await page.waitForTimeout(3000);
    
    // Check if there are any error messages or if dialog is still open
    const dialogStillOpen = await page.locator('[data-testid="create-course-dialog"]').isVisible();
    console.log('Dialog still open after submit:', dialogStillOpen);
    
    // Check for any toast messages (success or error)
    const toastElements = await page.locator('[data-testid="toast"]').count();
    console.log('Number of toast elements found:', toastElements);
    
    if (toastElements > 0) {
      const toastText = await page.locator('[data-testid="toast"]').first().textContent();
      console.log('Toast message:', toastText);
    }
    
    // Check if we're still on the same page or redirected
    console.log('Current URL after form submission:', page.url());
    
    // If no toast appeared, let's check for form validation errors
    const titleError = await page.locator('[data-testid="title-error"]').isVisible().catch(() => false);
    const descError = await page.locator('[data-testid="description-error"]').isVisible().catch(() => false);
    const langError = await page.locator('[data-testid="language-error"]').isVisible().catch(() => false);
    const levelError = await page.locator('[data-testid="level-error"]').isVisible().catch(() => false);
    
    console.log('Form validation errors:', {
      title: titleError,
      description: descError,
      language: langError,
      level: levelError
    });
  });
});
