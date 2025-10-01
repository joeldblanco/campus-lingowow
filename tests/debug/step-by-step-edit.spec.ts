import { test } from '@playwright/test';
import { TestHelpers, DataGenerators } from '../utils/test-helpers';

test.describe('Debug - Step by Step Edit', () => {
  test('should edit course step by step', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Step 1: Login
    console.log('Step 1: Login as admin');
    await helpers.loginAsAdmin();
    
    // Step 2: Navigate to courses
    console.log('Step 2: Navigate to courses page');
    await page.goto('/admin/courses');
    await page.waitForTimeout(2000);
    
    // Step 3: Check course count
    console.log('Step 3: Check course count');
    const courseCount = await helpers.getTableRowCount('courses-table');
    console.log('Course count:', courseCount);
    
    // Step 4: Create course if needed
    if (courseCount === 0) {
      console.log('Step 4: Creating a course first');
      await page.click('[data-testid="create-course-button"]');
      await helpers.waitForDialog('create-course-dialog');
      
      await helpers.fillForm({
        title: 'Course to Edit',
        description: 'Original description',
        language: 'Inglés',
        level: 'Principiante'
      });
      
      await helpers.submitForm('save-course-button');
      await page.waitForTimeout(3000);
      console.log('Course created');
    }
    
    // Step 5: Try to click edit
    console.log('Step 5: Attempting to click edit button');
    try {
      await helpers.clickTableAction(0, 'edit', 'courses-table');
      console.log('Edit button clicked successfully');
    } catch (error) {
      console.error('Failed to click edit button:', error);
      throw error;
    }
    
    // Step 6: Wait for edit dialog
    console.log('Step 6: Waiting for edit dialog');
    try {
      await helpers.waitForDialog('edit-course-dialog');
      console.log('Edit dialog opened successfully');
    } catch (error) {
      console.error('Edit dialog did not open:', error);
      throw error;
    }
    
    // Step 7: Update title
    console.log('Step 7: Updating course title');
    const updatedTitle = `Updated Course ${DataGenerators.randomString()}`;
    await page.fill('[data-testid="title-input"]', updatedTitle);
    console.log('Title updated to:', updatedTitle);
    
    // Step 8: Save changes
    console.log('Step 8: Saving changes');
    await helpers.submitForm('save-course-button');
    
    // Step 9: Wait for dialog to close
    console.log('Step 9: Waiting for dialog to close');
    await page.waitForTimeout(3000);
    const dialogClosed = await page.locator('[data-testid="edit-course-dialog"]').isHidden();
    console.log('Dialog closed:', dialogClosed);
    
    if (!dialogClosed) {
      console.log('Dialog is still open, checking for errors...');
      const dialogContent = await page.locator('[data-testid="edit-course-dialog"]').textContent();
      console.log('Dialog content:', dialogContent);
    }
    
    // Step 10: Check if title appears in courses
    console.log('Step 10: Checking if updated title appears in courses');
    try {
      await helpers.expectElementText('courses-table', updatedTitle);
      console.log('Updated title found in courses list');
    } catch (error) {
      console.error('Updated title not found:', error);
      
      // Let's see what's actually in the courses table
      const coursesContent = await page.locator('[data-testid="courses-table"]').textContent();
      console.log('Courses table content:', coursesContent);
    }
    
    console.log('Test completed');
  });
});
