import { test, expect } from '@playwright/test';
import { TestHelpers, DataGenerators } from '../utils/test-helpers';

test.describe('Debug - Course Edit Test', () => {
  test('should edit course successfully', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Login as admin
    await helpers.loginAsAdmin();
    
    // Navigate to courses page
    await page.goto('/admin/courses');
    
    // Create a course first if none exist
    const rowCount = await helpers.getTableRowCount('courses-table');
    
    if (rowCount === 0) {
      // Create a course first
      await page.click('[data-testid="create-course-button"]');
      await helpers.waitForDialog('create-course-dialog');
      
      await helpers.fillForm({
        title: 'Course to Edit',
        description: 'Original description',
        language: 'Inglés',
        level: 'Principiante'
      });
      
      await helpers.submitForm('save-course-button');
      await page.waitForTimeout(2000); // Wait for course to be created
    }

    // Click edit button on first course
    await helpers.clickTableAction(0, 'edit', 'courses-table');
    await helpers.waitForDialog('edit-course-dialog');

    // Update course data
    const updatedTitle = `Updated Course ${DataGenerators.randomString()}`;
    await page.fill('[data-testid="title-input"]', updatedTitle);
    await page.fill('[data-testid="description-input"]', 'Updated description');

    // Save changes
    await helpers.submitForm('save-course-button');

    // Wait for dialog to close
    await page.waitForTimeout(2000);
    
    // Check if dialog closed (indicating success)
    const dialogStillOpen = await page.locator('[data-testid="edit-course-dialog"]').isVisible();
    console.log('Edit dialog still open after submit:', dialogStillOpen);
    
    expect(dialogStillOpen).toBe(false);
    
    console.log('Course edited successfully!');
  });
});
