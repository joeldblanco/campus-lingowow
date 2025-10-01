import { test, expect } from '@playwright/test';
import { TestHelpers, DataGenerators } from '../utils/test-helpers';

test.describe('Admin - Courses Management', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.loginAsAdmin();
    await page.goto('/admin/courses');
  });

  test.describe('Course Creation', () => {
    test('should create a new course successfully', async ({ page }) => {
      const courseData = {
        title: `Test Course ${DataGenerators.randomString()}`,
        description: 'Test course description',
        language: 'Inglés',
        level: 'Principiante'
      };

      // Click create course button
      await page.click('[data-testid="create-course-button"]');
      await helpers.waitForDialog('create-course-dialog');

      // Fill course form
      await helpers.fillForm({
        title: courseData.title,
        description: courseData.description,
        language: courseData.language,
        level: courseData.level
      });

      // Submit form
      await helpers.submitForm('save-course-button');

      // Wait for dialog to close (indicates success)
      await page.waitForTimeout(2000);
      const dialogClosed = await page.locator('[data-testid="create-course-dialog"]').isHidden();
      expect(dialogClosed).toBe(true);

      // Should close dialog
      await helpers.expectElementHidden('create-course-dialog');

      // Should appear in courses list
      await helpers.expectElementText('courses-table', courseData.title);
    });

    test('should show validation errors for empty required fields', async ({ page }) => {
      await page.click('[data-testid="create-course-button"]');
      await helpers.waitForDialog('create-course-dialog');

      // Try to submit without filling required fields
      await helpers.submitForm('save-course-button');

      // Should show validation errors
      await helpers.expectElementVisible('title-error');
      await helpers.expectElementVisible('description-error');
      await helpers.expectElementVisible('language-error');
      await helpers.expectElementVisible('level-error');
    });

    test('should not create course with duplicate title', async ({ page }) => {
      const courseTitle = 'Duplicate Course Title';

      // Create first course
      await page.click('[data-testid="create-course-button"]');
      await helpers.waitForDialog('create-course-dialog');

      await helpers.fillForm({
        title: courseTitle,
        description: 'First course',
        language: 'Inglés',
        level: 'Principiante'
      });

      await helpers.submitForm('save-course-button');
      await helpers.waitForToast('Course created successfully');

      // Try to create second course with same title
      await page.click('[data-testid="create-course-button"]');
      await helpers.waitForDialog('create-course-dialog');

      await helpers.fillForm({
        title: courseTitle,
        description: 'Second course',
        language: 'Spanish',
        level: 'Intermediate'
      });

      await helpers.submitForm('save-course-button');

      // Should show error
      await helpers.waitForToast('Course title already exists');
    });
  });

  test.describe('Course Editing', () => {
    test('should edit course successfully', async ({ page }) => {
      // Assume there's at least one course in the table
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
        await page.waitForTimeout(2000); // Wait for course creation
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

      // Wait for dialog to close (indicates success)
      await page.waitForTimeout(2000);
      const dialogClosed = await page.locator('[data-testid="edit-course-dialog"]').isHidden();
      expect(dialogClosed).toBe(true);

      // Should show updated data in table
      await helpers.expectElementText('courses-table', updatedTitle);
    });

    test('should cancel course editing', async ({ page }) => {
      const rowCount = await helpers.getTableRowCount('courses-table');
      
      if (rowCount > 0) {
        // Click edit button
        await helpers.clickTableAction(0, 'edit', 'courses-table');
        await helpers.waitForDialog('edit-course-dialog');

        // Make changes
        await page.fill('[data-testid="title-input"]', 'Changed Title');

        // Cancel
        await page.click('[data-testid="cancel-button"]');

        // Dialog should close without saving
        await helpers.expectElementHidden('edit-course-dialog');

        // Changes should not be saved
        await expect(page.locator('[data-testid="courses-table"]')).not.toContainText('Changed Title');
      }
    });
  });

  test.describe('Course Publishing', () => {
    test('should publish course successfully', async ({ page }) => {
      // Create unpublished course first
      await page.click('[data-testid="create-course-button"]');
      await helpers.waitForDialog('create-course-dialog');

      await helpers.fillForm({
        title: `Course to Publish ${DataGenerators.randomString()}`,
        description: 'Course description',
        language: 'Inglés',
        level: 'Principiante'
      });

      await helpers.submitForm('save-course-button');
      await helpers.waitForToast('Course created successfully');

      // Find the unpublished course and publish it
      const rowCount = await helpers.getTableRowCount('courses-table');
      
      for (let i = 0; i < rowCount; i++) {
        const statusCell = page.locator(`[data-testid="courses-table"] tbody tr:nth-child(${i + 1}) [data-testid="status-cell"]`);
        const status = await statusCell.textContent();
        
        if (status?.includes('Draft')) {
          await helpers.clickTableAction(i, 'publish', 'courses-table');
          await helpers.waitForToast('Course published successfully');
          
          // Status should change to Published
          await expect(statusCell).toContainText('Published');
          break;
        }
      }
    });

    test('should unpublish course successfully', async ({ page }) => {
      // Find a published course and unpublish it
      const rowCount = await helpers.getTableRowCount('courses-table');
      
      for (let i = 0; i < rowCount; i++) {
        const statusCell = page.locator(`[data-testid="courses-table"] tbody tr:nth-child(${i + 1}) [data-testid="status-cell"]`);
        const status = await statusCell.textContent();
        
        if (status?.includes('Published')) {
          await helpers.clickTableAction(i, 'unpublish', 'courses-table');
          await helpers.waitForToast('Course unpublished successfully');
          
          // Status should change to Draft
          await expect(statusCell).toContainText('Draft');
          break;
        }
      }
    });
  });

  test.describe('Course Deletion', () => {
    test('should delete course successfully', async ({ page }) => {
      // Create course to delete
      const courseTitle = `Course to Delete ${DataGenerators.randomString()}`;
      
      await page.click('[data-testid="create-course-button"]');
      await helpers.waitForDialog('create-course-dialog');

      await helpers.fillForm({
        title: courseTitle,
        description: 'Course to be deleted',
        language: 'Inglés',
        level: 'Principiante'
      });

      await helpers.submitForm('save-course-button');
      await helpers.waitForToast('Course created successfully');

      // Find and delete the course
      const initialRowCount = await helpers.getTableRowCount('courses-table');
      
      // Find the course row and click delete
      const courseRow = page.locator(`[data-testid="courses-table"] tbody tr`).filter({ hasText: courseTitle });
      await courseRow.locator('[data-testid="delete-button"]').click();

      // Confirm deletion
      await helpers.waitForDialog('confirm-delete-dialog');
      await page.click('[data-testid="confirm-delete-button"]');

      // Should show success message
      await helpers.waitForToast('Course deleted successfully');

      // Course should be removed from table
      await expect(page.locator('[data-testid="courses-table"]')).not.toContainText(courseTitle);

      // Row count should decrease
      const finalRowCount = await helpers.getTableRowCount('courses-table');
      expect(finalRowCount).toBe(initialRowCount - 1);
    });

    test('should cancel course deletion', async ({ page }) => {
      const rowCount = await helpers.getTableRowCount('courses-table');
      
      if (rowCount > 0) {
        // Click delete button
        await helpers.clickTableAction(0, 'delete', 'courses-table');
        await helpers.waitForDialog('confirm-delete-dialog');

        // Cancel deletion
        await page.click('[data-testid="cancel-delete-button"]');

        // Dialog should close
        await helpers.expectElementHidden('confirm-delete-dialog');

        // Course should still be in table
        const newRowCount = await helpers.getTableRowCount('courses-table');
        expect(newRowCount).toBe(rowCount);
      }
    });
  });

  test.describe('Course Search and Filtering', () => {
    test('should search courses by title', async ({ page }) => {
      const searchTerm = 'Inglés';
      
      // Enter search term
      await page.fill('[data-testid="search-input"]', searchTerm);
      await page.press('[data-testid="search-input"]', 'Enter');

      // Wait for results
      await helpers.waitForLoadingToFinish();

      // All visible courses should contain search term
      const courseRows = page.locator('[data-testid="courses-table"] tbody tr');
      const count = await courseRows.count();

      for (let i = 0; i < count; i++) {
        const rowText = await courseRows.nth(i).textContent();
        expect(rowText?.toLowerCase()).toContain(searchTerm.toLowerCase());
      }
    });

    test('should filter courses by language', async ({ page }) => {
      // Select language filter
      await page.click('[data-testid="language-filter"]');
      await page.click('[data-testid="language-option-english"]');

      // Wait for results
      await helpers.waitForLoadingToFinish();

      // All visible courses should be Inglés
      const languageCells = page.locator('[data-testid="courses-table"] tbody tr [data-testid="language-cell"]');
      const count = await languageCells.count();

      for (let i = 0; i < count; i++) {
        const language = await languageCells.nth(i).textContent();
        expect(language).toBe('Inglés');
      }
    });

    test('should filter courses by level', async ({ page }) => {
      // Select level filter
      await page.click('[data-testid="level-filter"]');
      await page.click('[data-testid="level-option-beginner"]');

      // Wait for results
      await helpers.waitForLoadingToFinish();

      // All visible courses should be Beginner level
      const levelCells = page.locator('[data-testid="courses-table"] tbody tr [data-testid="level-cell"]');
      const count = await levelCells.count();

      for (let i = 0; i < count; i++) {
        const level = await levelCells.nth(i).textContent();
        expect(level).toBe('Beginner');
      }
    });

    test('should clear all filters', async ({ page }) => {
      // Apply some filters
      await page.fill('[data-testid="search-input"]', 'test');
      await page.click('[data-testid="language-filter"]');
      await page.click('[data-testid="language-option-english"]');

      // Clear filters
      await page.click('[data-testid="clear-filters-button"]');

      // Search input should be empty
      await expect(page.locator('[data-testid="search-input"]')).toHaveValue('');

      // All courses should be visible again
      await helpers.waitForLoadingToFinish();
    });
  });

  test.describe('Course Details View', () => {
    test('should view course details', async () => {
      const rowCount = await helpers.getTableRowCount('courses-table');
      
      if (rowCount > 0) {
        // Click view button on first course
        await helpers.clickTableAction(0, 'view', 'courses-table');

        // Should navigate to course details page
        await helpers.expectUrl(/\/admin\/courses\/[a-zA-Z0-9]+/);

        // Should show course details
        await helpers.expectElementVisible('course-details');
        await helpers.expectElementVisible('modules-section');
        await helpers.expectElementVisible('enrollments-section');
      }
    });
  });

  test.describe('Bulk Operations', () => {
    test('should select multiple courses', async ({ page }) => {
      const rowCount = await helpers.getTableRowCount('courses-table');
      
      if (rowCount >= 2) {
        // Select first two courses
        await page.check('[data-testid="courses-table"] tbody tr:nth-child(1) [data-testid="row-checkbox"]');
        await page.check('[data-testid="courses-table"] tbody tr:nth-child(2) [data-testid="row-checkbox"]');

        // Bulk actions should be visible
        await helpers.expectElementVisible('bulk-actions');
        await helpers.expectElementText('selected-count', '2 selected');
      }
    });

    test('should bulk publish courses', async ({ page }) => {
      const rowCount = await helpers.getTableRowCount('courses-table');
      
      if (rowCount >= 1) {
        // Select first course
        await page.check('[data-testid="courses-table"] tbody tr:nth-child(1) [data-testid="row-checkbox"]');

        // Click bulk publish
        await page.click('[data-testid="bulk-publish-button"]');

        // Should show success message
        await helpers.waitForToast('Courses published successfully');
      }
    });

    test('should bulk delete courses', async ({ page }) => {
      // Create test courses for bulk deletion
      const coursesToCreate = 2;
      // const courseIds: string[] = []; // Not used in this test

      for (let i = 0; i < coursesToCreate; i++) {
        await page.click('[data-testid="create-course-button"]');
        await helpers.waitForDialog('create-course-dialog');

        await helpers.fillForm({
          title: `Bulk Delete Course ${i + 1} ${DataGenerators.randomString()}`,
          description: `Course ${i + 1} for bulk deletion`,
          language: 'Inglés',
          level: 'Principiante'
        });

        await helpers.submitForm('save-course-button');
        await helpers.waitForToast('Course created successfully');
      }

      // Select the created courses (assuming they're the last ones)
      const finalRowCount = await helpers.getTableRowCount('courses-table');
      
      for (let i = finalRowCount - coursesToCreate; i < finalRowCount; i++) {
        await page.check(`[data-testid="courses-table"] tbody tr:nth-child(${i + 1}) [data-testid="row-checkbox"]`);
      }

      // Click bulk delete
      await page.click('[data-testid="bulk-delete-button"]');

      // Confirm deletion
      await helpers.waitForDialog('confirm-bulk-delete-dialog');
      await page.click('[data-testid="confirm-bulk-delete-button"]');

      // Should show success message
      await helpers.waitForToast('Courses deleted successfully');

      // Row count should decrease
      const newRowCount = await helpers.getTableRowCount('courses-table');
      expect(newRowCount).toBe(finalRowCount - coursesToCreate);
    });
  });
});
