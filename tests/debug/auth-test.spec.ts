import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Debug - Authentication Test', () => {
  test('should login as admin successfully', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    console.log('Starting authentication test...');
    
    // Try to login as admin
    await helpers.loginAsAdmin();
    
    console.log('Login completed, checking URL...');
    
    // Check that we're redirected away from signin page
    await expect(page).not.toHaveURL(/\/auth\/signin/);
    
    console.log('Authentication test completed successfully!');
  });
});
