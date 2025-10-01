import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Debug - Course Edit Action Test', () => {
  test('should click edit action for first course', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    console.log('Starting course edit action test...');
    
    // Login as admin
    await helpers.loginAsAdmin();
    console.log('Logged in as admin');
    
    // Navigate to courses page
    await page.goto('/admin/courses');
    console.log('Navigated to courses page');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="courses-table"]', { timeout: 10000 });
    console.log('Courses table found');
    
    // Check how many courses are in the table
    const rowCount = await helpers.getTableRowCount('courses-table');
    console.log('Number of courses found:', rowCount);
    
    if (rowCount === 0) {
      console.log('No courses found, creating one first...');
      
      // Create a course first
      await page.click('[data-testid="create-course-button"]');
      await helpers.waitForDialog('create-course-dialog');
      
      await helpers.fillForm({
        title: 'Test Course for Edit',
        description: 'Test course description',
        language: 'Inglés',
        level: 'Principiante'
      });
      
      await helpers.submitForm('save-course-button');
      await page.waitForTimeout(3000); // Wait for course to be created
      console.log('Course created');
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
      await expect(editMenuItem).toBeVisible();
      console.log('Edit menu item found');
      
      // Click the edit menu item
      await editMenuItem.click();
      console.log('Clicked edit menu item');
      
      // Wait for edit dialog to open
      await helpers.waitForDialog('edit-course-dialog');
      console.log('Edit dialog opened successfully!');
    } else {
      throw new Error('No course action buttons found');
    }
  });
});
