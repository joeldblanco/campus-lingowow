import { test } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Debug - Find Dropdown Button', () => {
  test('should find dropdown button', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Login and navigate
    await helpers.loginAsAdmin();
    await page.goto('/admin/courses');
    await page.waitForTimeout(3000);
    
    // Create a course if needed
    const courseCount = await helpers.getTableRowCount('courses-table');
    console.log('Course count:', courseCount);
    
    if (courseCount === 0) {
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
    
    // Check the structure of the courses table
    const coursesTable = page.locator('[data-testid="courses-table"]');
    const coursesContent = await coursesTable.innerHTML();
    console.log('Courses table HTML structure (first 500 chars):', coursesContent.substring(0, 500));
    
    // Look for grid structure
    const gridDiv = page.locator('[data-testid="courses-table"] .grid');
    const gridExists = await gridDiv.count();
    console.log('Grid div count:', gridExists);
    
    if (gridExists > 0) {
      const gridContent = await gridDiv.innerHTML();
      console.log('Grid content (first 500 chars):', gridContent.substring(0, 500));
      
      // Look for course cards
      const courseCards = page.locator('[data-testid="courses-table"] .grid > div');
      const cardCount = await courseCards.count();
      console.log('Course cards count:', cardCount);
      
      if (cardCount > 0) {
        const firstCard = courseCards.first();
        const cardContent = await firstCard.innerHTML();
        console.log('First card content (first 500 chars):', cardContent.substring(0, 500));
        
        // Look for buttons in the first card
        const buttonsInCard = firstCard.locator('button');
        const buttonCount = await buttonsInCard.count();
        console.log('Buttons in first card:', buttonCount);
        
        // Check for our specific button
        const actionButton = firstCard.locator('[data-testid="course-actions-button"]');
        const actionButtonExists = await actionButton.count();
        console.log('Action button exists:', actionButtonExists > 0);
        
        if (actionButtonExists > 0) {
          console.log('Trying to click action button...');
          await actionButton.click();
          console.log('Action button clicked successfully!');
          
          // Wait and check for dropdown menu
          await page.waitForTimeout(1000);
          const menuItems = await page.locator('[role="menuitem"]').count();
          console.log('Menu items found:', menuItems);
        }
      }
    }
    
    console.log('Test completed');
  });
});
