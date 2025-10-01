import { test } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Debug - Dropdown Test', () => {
  test('should open dropdown menu', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Login as admin
    await helpers.loginAsAdmin();
    
    // Navigate to courses page
    await page.goto('/admin/courses');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check how many course cards exist
    const cardCount = await page.locator('[data-testid="courses-table"] .grid > div').count();
    console.log('Number of course cards found:', cardCount);
    
    if (cardCount === 0) {
      console.log('No courses found, creating one...');
      // Create a course first
      await page.click('[data-testid="create-course-button"]');
      await helpers.waitForDialog('create-course-dialog');
      
      await helpers.fillForm({
        title: 'Test Course for Dropdown',
        description: 'Test description',
        language: 'Inglés',
        level: 'Principiante'
      });
      
      await helpers.submitForm('save-course-button');
      await page.waitForTimeout(3000);
    }
    
    // Try to find and click the dropdown button
    const dropdownButtons = await page.locator('[data-testid="courses-table"] button[data-state]').count();
    console.log('Number of dropdown buttons found:', dropdownButtons);
    
    if (dropdownButtons > 0) {
      console.log('Clicking first dropdown button...');
      await page.locator('[data-testid="courses-table"] button[data-state]').first().click();
      
      // Wait for dropdown to open
      await page.waitForTimeout(1000);
      
      // Check if menu items are visible
      const menuItems = await page.locator('[role="menuitem"]').count();
      console.log('Number of menu items found:', menuItems);
      
      // List all menu items
      const menuTexts = await page.locator('[role="menuitem"]').allTextContents();
      console.log('Menu items:', menuTexts);
    }
    
    console.log('Dropdown test completed!');
  });
});
