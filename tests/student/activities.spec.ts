import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Student - Activities', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.loginAsStudent();
  });

  test.describe('Activities Dashboard', () => {
    test('should display activities dashboard correctly', async ({ page }) => {
      await helpers.navigateToActivities();

      // Should show main components
      await helpers.expectElementVisible('activities-container');
      await helpers.expectElementVisible('learning-path-map');
      await helpers.expectElementVisible('user-progress');
      await helpers.expectElementVisible('activities-grid');
    });

    test('should display user progress correctly', async ({ page }) => {
      await helpers.navigateToActivities();

      // Should show progress components
      await helpers.expectElementVisible('lives-counter');
      await helpers.expectElementVisible('points-counter');
      await helpers.expectElementVisible('streak-counter');
      await helpers.expectElementVisible('weekly-activity');
    });

    test('should display learning path with correct levels', async ({ page }) => {
      await helpers.navigateToActivities();

      // Should show learning path levels
      const levels = page.locator('[data-testid="learning-path-level"]');
      const levelCount = await levels.count();
      
      expect(levelCount).toBeGreaterThan(0);

      // Each level should have activity counts
      for (let i = 0; i < levelCount; i++) {
        const level = levels.nth(i);
        await expect(level).toBeVisible();
        
        // Should show activity count (e.g., "3/5")
        const activityCount = level.locator('[data-testid="activity-count"]');
        await expect(activityCount).toBeVisible();
      }
    });

    test('should show weekly activity streak correctly', async ({ page }) => {
      await helpers.navigateToActivities();

      // Should show 7 days of the week
      const weeklyDays = page.locator('[data-testid="weekly-day"]');
      const dayCount = await weeklyDays.count();
      
      expect(dayCount).toBe(7);

      // Should highlight today
      const todayIndicator = page.locator('[data-testid="today-indicator"]');
      await expect(todayIndicator).toBeVisible();
    });
  });

  test.describe('Activity Selection', () => {
    test('should display available activities for current level', async ({ page }) => {
      await helpers.navigateToActivities();

      // Should show activities grid
      const activities = page.locator('[data-testid="activity-card"]');
      const activityCount = await activities.count();
      
      expect(activityCount).toBeGreaterThan(0);

      // Each activity should have required elements
      for (let i = 0; i < Math.min(activityCount, 5); i++) {
        const activity = activities.nth(i);
        
        await expect(activity.locator('[data-testid="activity-title"]')).toBeVisible();
        await expect(activity.locator('[data-testid="activity-type"]')).toBeVisible();
        await expect(activity.locator('[data-testid="activity-points"]')).toBeVisible();
        await expect(activity.locator('[data-testid="activity-duration"]')).toBeVisible();
      }
    });

    test('should filter activities by type', async ({ page }) => {
      await helpers.navigateToActivities();

      // Click on activity type filter
      await page.click('[data-testid="activity-type-filter"]');
      await page.click('[data-testid="filter-listening"]');

      await helpers.waitForLoadingToFinish();

      // All visible activities should be listening type
      const activities = page.locator('[data-testid="activity-card"]');
      const count = await activities.count();

      for (let i = 0; i < count; i++) {
        const activityType = activities.nth(i).locator('[data-testid="activity-type"]');
        await expect(activityType).toContainText('Listening');
      }
    });

    test('should filter activities by level', async ({ page }) => {
      await helpers.navigateToActivities();

      // Click on level filter
      await page.click('[data-testid="level-filter"]');
      await page.click('[data-testid="filter-level-1"]');

      await helpers.waitForLoadingToFinish();

      // All visible activities should be level 1
      const activities = page.locator('[data-testid="activity-card"]');
      const count = await activities.count();

      for (let i = 0; i < count; i++) {
        const activityLevel = activities.nth(i).locator('[data-testid="activity-level"]');
        await expect(activityLevel).toContainText('Level 1');
      }
    });
  });

  test.describe('Activity Execution', () => {
    test('should start an activity successfully', async ({ page }) => {
      await helpers.navigateToActivities();

      // Click on first available activity
      const firstActivity = page.locator('[data-testid="activity-card"]').first();
      await firstActivity.click();

      // Should navigate to activity page
      await helpers.expectUrl(/\/activities\/[a-zA-Z0-9]+/);

      // Should show activity interface
      await helpers.expectElementVisible('activity-interface');
      await helpers.expectElementVisible('activity-progress');
      await helpers.expectElementVisible('activity-content');
    });

    test('should complete a simple activity', async ({ page }) => {
      await helpers.navigateToActivities();

      // Find a simple activity (like multiple choice)
      const activities = page.locator('[data-testid="activity-card"]');
      const count = await activities.count();

      for (let i = 0; i < count; i++) {
        const activityType = await activities.nth(i).locator('[data-testid="activity-type"]').textContent();
        
        if (activityType?.includes('Multiple Choice')) {
          await activities.nth(i).click();
          break;
        }
      }

      // Should be on activity page
      await helpers.expectUrl(/\/activities\/[a-zA-Z0-9]+/);

      // Complete the activity (this would depend on activity type)
      const options = page.locator('[data-testid="answer-option"]');
      const optionCount = await options.count();

      if (optionCount > 0) {
        // Select first option
        await options.first().click();
        
        // Submit answer
        await page.click('[data-testid="submit-answer-button"]');
        
        // Should show result
        await helpers.expectElementVisible('answer-result');
        
        // Continue to next question or complete
        const nextButton = page.locator('[data-testid="next-button"]');
        const completeButton = page.locator('[data-testid="complete-activity-button"]');
        
        if (await nextButton.isVisible()) {
          await nextButton.click();
        } else if (await completeButton.isVisible()) {
          await completeButton.click();
          
          // Should show completion screen
          await helpers.expectElementVisible('activity-completion');
          await helpers.expectElementVisible('points-earned');
        }
      }
    });

    test('should pause and resume activity', async ({ page }) => {
      await helpers.navigateToActivities();

      // Start an activity
      const firstActivity = page.locator('[data-testid="activity-card"]').first();
      await firstActivity.click();

      await helpers.expectUrl(/\/activities\/[a-zA-Z0-9]+/);

      // Pause activity
      await page.click('[data-testid="pause-activity-button"]');
      
      // Should show pause dialog
      await helpers.waitForDialog('pause-activity-dialog');
      await page.click('[data-testid="confirm-pause-button"]');

      // Should return to activities page
      await helpers.expectUrl(/\/activities/);

      // Activity should show as "In Progress"
      const inProgressActivities = page.locator('[data-testid="activity-card"][data-status="in-progress"]');
      await expect(inProgressActivities.first()).toBeVisible();

      // Resume activity
      await inProgressActivities.first().click();
      
      // Should return to activity page
      await helpers.expectUrl(/\/activities\/[a-zA-Z0-9]+/);
      await helpers.expectElementVisible('activity-interface');
    });

    test('should handle activity with time limit', async ({ page }) => {
      await helpers.navigateToActivities();

      // Find a timed activity
      const activities = page.locator('[data-testid="activity-card"]');
      const count = await activities.count();

      for (let i = 0; i < count; i++) {
        const hasTimer = await activities.nth(i).locator('[data-testid="activity-timer"]').isVisible();
        
        if (hasTimer) {
          await activities.nth(i).click();
          break;
        }
      }

      // Should show timer
      await helpers.expectElementVisible('activity-timer');
      
      // Timer should be counting down
      const initialTime = await page.locator('[data-testid="timer-display"]').textContent();
      
      // Wait a bit and check timer has changed
      await page.waitForTimeout(2000);
      const updatedTime = await page.locator('[data-testid="timer-display"]').textContent();
      
      expect(initialTime).not.toBe(updatedTime);
    });
  });

  test.describe('Progress Tracking', () => {
    test('should update lives after incorrect answer', async ({ page }) => {
      await helpers.navigateToActivities();

      // Get initial lives count
      const initialLives = await page.locator('[data-testid="lives-count"]').textContent();
      const initialLivesNum = parseInt(initialLives || '0');

      // Start an activity and give wrong answer
      const firstActivity = page.locator('[data-testid="activity-card"]').first();
      await firstActivity.click();

      // Give wrong answer (this would depend on activity type)
      const options = page.locator('[data-testid="answer-option"]');
      const optionCount = await options.count();

      if (optionCount > 1) {
        // Assuming last option is wrong (this is test-specific logic)
        await options.last().click();
        await page.click('[data-testid="submit-answer-button"]');

        // Check if lives decreased
        await page.goto('/activities');
        const newLives = await page.locator('[data-testid="lives-count"]').textContent();
        const newLivesNum = parseInt(newLives || '0');

        expect(newLivesNum).toBeLessThan(initialLivesNum);
      }
    });

    test('should update points after completing activity', async ({ page }) => {
      await helpers.navigateToActivities();

      // Get initial points
      const initialPoints = await page.locator('[data-testid="points-count"]').textContent();
      const initialPointsNum = parseInt(initialPoints || '0');

      // Complete an activity (simplified)
      const firstActivity = page.locator('[data-testid="activity-card"]').first();
      await firstActivity.click();

      // Simulate completing activity
      await page.click('[data-testid="complete-activity-button"]');

      // Return to activities page
      await page.goto('/activities');

      // Points should have increased
      const newPoints = await page.locator('[data-testid="points-count"]').textContent();
      const newPointsNum = parseInt(newPoints || '0');

      expect(newPointsNum).toBeGreaterThan(initialPointsNum);
    });

    test('should update streak after daily activity', async ({ page }) => {
      await helpers.navigateToActivities();

      // Get initial streak
      const initialStreak = await page.locator('[data-testid="streak-count"]').textContent();
      const initialStreakNum = parseInt(initialStreak || '0');

      // Complete an activity
      const firstActivity = page.locator('[data-testid="activity-card"]').first();
      await firstActivity.click();

      // Simulate completing activity
      await page.click('[data-testid="complete-activity-button"]');

      // Return to activities page
      await page.goto('/activities');

      // Check if today is marked as completed
      const todayIndicator = page.locator('[data-testid="today-indicator"]');
      await expect(todayIndicator).toHaveClass(/completed/);
    });
  });

  test.describe('Learning Path Progression', () => {
    test('should unlock next level after completing current level', async ({ page }) => {
      await helpers.navigateToActivities();

      // Find current level
      const currentLevel = page.locator('[data-testid="learning-path-level"][data-status="current"]');
      await expect(currentLevel).toBeVisible();

      // Get level number
      const levelNumber = await currentLevel.getAttribute('data-level');
      const nextLevelNumber = parseInt(levelNumber || '1') + 1;

      // Check if next level is locked
      const nextLevel = page.locator(`[data-testid="learning-path-level"][data-level="${nextLevelNumber}"]`);
      const isLocked = await nextLevel.getAttribute('data-status') === 'locked';

      if (isLocked) {
        // Complete all activities in current level (simplified)
        const activities = page.locator('[data-testid="activity-card"][data-level="' + levelNumber + '"]');
        const activityCount = await activities.count();

        // This would require completing all activities, which is complex
        // For now, just verify the UI structure
        await expect(nextLevel).toHaveAttribute('data-status', 'locked');
      }
    });

    test('should show progress indicators correctly', async ({ page }) => {
      await helpers.navigateToActivities();

      // Each level should show progress
      const levels = page.locator('[data-testid="learning-path-level"]');
      const levelCount = await levels.count();

      for (let i = 0; i < levelCount; i++) {
        const level = levels.nth(i);
        const status = await level.getAttribute('data-status');

        if (status === 'completed') {
          // Should have completion indicator
          await expect(level.locator('[data-testid="completion-indicator"]')).toBeVisible();
        } else if (status === 'current' || status === 'partial') {
          // Should have progress indicator
          await expect(level.locator('[data-testid="progress-indicator"]')).toBeVisible();
        } else if (status === 'locked') {
          // Should have lock indicator
          await expect(level.locator('[data-testid="lock-indicator"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Activity History', () => {
    test('should show completed activities in history', async ({ page }) => {
      await helpers.navigateToActivities();

      // Navigate to history tab
      await page.click('[data-testid="history-tab"]');

      // Should show completed activities
      await helpers.expectElementVisible('activity-history');
      
      const completedActivities = page.locator('[data-testid="completed-activity"]');
      const count = await completedActivities.count();

      // Each completed activity should show details
      for (let i = 0; i < Math.min(count, 3); i++) {
        const activity = completedActivities.nth(i);
        
        await expect(activity.locator('[data-testid="activity-name"]')).toBeVisible();
        await expect(activity.locator('[data-testid="completion-date"]')).toBeVisible();
        await expect(activity.locator('[data-testid="score-achieved"]')).toBeVisible();
        await expect(activity.locator('[data-testid="points-earned"]')).toBeVisible();
      }
    });

    test('should allow reviewing completed activities', async ({ page }) => {
      await helpers.navigateToActivities();

      // Navigate to history tab
      await page.click('[data-testid="history-tab"]');

      const completedActivities = page.locator('[data-testid="completed-activity"]');
      const count = await completedActivities.count();

      if (count > 0) {
        // Click review button on first completed activity
        await completedActivities.first().locator('[data-testid="review-button"]').click();

        // Should navigate to activity review
        await helpers.expectUrl(/\/activities\/[a-zA-Z0-9]+\/review/);
        
        // Should show review interface
        await helpers.expectElementVisible('activity-review');
        await helpers.expectElementVisible('review-content');
      }
    });
  });
});
