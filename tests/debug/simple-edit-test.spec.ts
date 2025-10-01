import { test } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Debug - Simple Edit Test', () => {
  test('should open edit dialog', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Login as admin
    await helpers.loginAsAdmin();
    
    // Navigate to courses page
    await page.goto('/admin/courses');
    
    // Create a course first if none exist
    const rowCount = await helpers.getTableRowCount('courses-table');
    console.log('Current row count:', rowCount);
    
    if (rowCount === 0) {
      console.log('Creating a course first...');
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
      await page.waitForTimeout(3000); // Wait for course to be created
    }

    // Now try to click the edit action
    console.log('Attempting to click edit action...');
    
    // First, let's see what course action buttons are available
    const actionButtons = await page.locator('[data-testid="course-actions-button"]').count();
    console.log('Number of course action buttons found:', actionButtons);
    
    if (actionButtons > 0) {
      // Click the first course action button
      await page.locator('[data-testid="course-actions-button"]').first().click();
      console.log('Clicked course action button');
      
      // Wait for dropdown menu to appear
      await page.waitForSelector('[role="menuitem"]', { timeout: 5000 });
      console.log('Dropdown menu appeared');
      
      // Look for the edit menu item
      const editMenuItem = page.locator('[role="menuitem"]:has-text("Editar")');
      await editMenuItem.waitFor({ state: 'visible' });
      console.log('Edit menu item found');
      
      // Click the edit menu item
      await editMenuItem.click();
      console.log('Clicked edit menu item');
    } else {
      throw new Error('No course action buttons found');
    }

    // Wait for edit dialog to open
    await helpers.waitForDialog('edit-course-dialog');
    
    console.log('Edit dialog opened successfully!');
  });
});
