import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Debug - Courses Page Test', () => {
  test('should navigate to courses page and see courses table', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    console.log('Starting courses page test...');
    
    // Login as admin
    await helpers.loginAsAdmin();
    console.log('Logged in as admin');
    
    // Navigate to courses page
    await page.goto('/admin/courses');
    console.log('Navigated to courses page');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="courses-table"]', { timeout: 10000 });
    console.log('Courses table found');
    
    // Check if we can see the courses table
    await expect(page.locator('[data-testid="courses-table"]')).toBeVisible();
    
    // Check how many courses are in the table
    const rowCount = await helpers.getTableRowCount('courses-table');
    console.log('Number of courses found:', rowCount);
    
    console.log('Courses page test completed successfully!');
  });
});
