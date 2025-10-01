import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Debug - Login Test', () => {
  test('should login as admin successfully', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Go to login page
    await page.goto('/auth/signin');
    
    // Check if login form elements exist
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Try to login
    await helpers.loginAsAdmin();
    
    // Check if login was successful (should redirect away from signin page)
    await page.waitForURL(url => !url.pathname.includes('/auth/signin'), { timeout: 10000 });
    
    console.log('Current URL after login:', page.url());
  });
});
