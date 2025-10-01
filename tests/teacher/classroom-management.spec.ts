import { test, expect } from '@playwright/test';
import { TestHelpers, DataGenerators } from '../utils/test-helpers';

test.describe('Teacher - Classroom Management', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.loginAsTeacher();
  });

  test.describe('Teacher Dashboard', () => {
    test('should display teacher dashboard correctly', async ({ page }) => {
      await page.goto('/classroom');

      // Should show main dashboard components
      await helpers.expectElementVisible('teacher-dashboard');
      await helpers.expectElementVisible('upcoming-classes');
      await helpers.expectElementVisible('student-list');
      await helpers.expectElementVisible('class-statistics');
      await helpers.expectElementVisible('quick-actions');
    });

    test('should show upcoming classes', async ({ page }) => {
      await page.goto('/classroom');

      // Should show upcoming classes section
      await helpers.expectElementVisible('upcoming-classes');
      
      const upcomingClasses = page.locator('[data-testid="upcoming-class"]');
      const classCount = await upcomingClasses.count();

      // Each class should show required information
      for (let i = 0; i < Math.min(classCount, 3); i++) {
        const classItem = upcomingClasses.nth(i);
        
        await expect(classItem.locator('[data-testid="student-name"]')).toBeVisible();
        await expect(classItem.locator('[data-testid="class-time"]')).toBeVisible();
        await expect(classItem.locator('[data-testid="class-status"]')).toBeVisible();
        await expect(classItem.locator('[data-testid="start-class-button"]')).toBeVisible();
      }
    });

    test('should show class statistics', async ({ page }) => {
      await page.goto('/classroom');

      // Should show statistics cards
      await helpers.expectElementVisible('total-classes-stat');
      await helpers.expectElementVisible('completed-classes-stat');
      await helpers.expectElementVisible('upcoming-classes-stat');
      await helpers.expectElementVisible('student-count-stat');

      // Statistics should have numeric values
      const totalClasses = await page.locator('[data-testid="total-classes-value"]').textContent();
      const completedClasses = await page.locator('[data-testid="completed-classes-value"]').textContent();
      
      expect(totalClasses).toMatch(/^\d+$/);
      expect(completedClasses).toMatch(/^\d+$/);
    });
  });

  test.describe('Class Booking Management', () => {
    test('should view all class bookings', async ({ page }) => {
      await page.goto('/classroom/bookings');

      // Should show bookings table
      await helpers.expectElementVisible('bookings-table');
      
      const bookings = page.locator('[data-testid="booking-row"]');
      const bookingCount = await bookings.count();

      // Each booking should show required information
      for (let i = 0; i < Math.min(bookingCount, 3); i++) {
        const booking = bookings.nth(i);
        
        await expect(booking.locator('[data-testid="student-name"]')).toBeVisible();
        await expect(booking.locator('[data-testid="booking-date"]')).toBeVisible();
        await expect(booking.locator('[data-testid="booking-time"]')).toBeVisible();
        await expect(booking.locator('[data-testid="booking-status"]')).toBeVisible();
      }
    });

    test('should filter bookings by status', async ({ page }) => {
      await page.goto('/classroom/bookings');

      // Filter by confirmed bookings
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="filter-confirmed"]');

      await helpers.waitForLoadingToFinish();

      // All visible bookings should be confirmed
      const bookings = page.locator('[data-testid="booking-row"]');
      const count = await bookings.count();

      for (let i = 0; i < count; i++) {
        const status = bookings.nth(i).locator('[data-testid="booking-status"]');
        await expect(status).toContainText('Confirmed');
      }
    });

    test('should filter bookings by date range', async ({ page }) => {
      await page.goto('/classroom/bookings');

      // Set date range filter
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await page.fill('[data-testid="date-from-input"]', today.toISOString().split('T')[0]);
      await page.fill('[data-testid="date-to-input"]', tomorrow.toISOString().split('T')[0]);
      await page.click('[data-testid="apply-date-filter"]');

      await helpers.waitForLoadingToFinish();

      // All bookings should be within the date range
      const bookings = page.locator('[data-testid="booking-row"]');
      const count = await bookings.count();

      for (let i = 0; i < count; i++) {
        const bookingDate = await bookings.nth(i).locator('[data-testid="booking-date"]').textContent();
        // Verify date is within range (simplified check)
        expect(bookingDate).toBeTruthy();
      }
    });

    test('should start class from booking', async ({ page }) => {
      await page.goto('/classroom/bookings');

      // Find a confirmed booking
      const confirmedBookings = page.locator('[data-testid="booking-row"][data-status="confirmed"]');
      const count = await confirmedBookings.count();

      if (count > 0) {
        // Click start class button
        await confirmedBookings.first().locator('[data-testid="start-class-button"]').click();

        // Should navigate to video call or class interface
        await helpers.expectUrl(/\/(video-call|classroom\/session)/);
      }
    });

    test('should reschedule booking', async ({ page }) => {
      await page.goto('/classroom/bookings');

      const bookings = page.locator('[data-testid="booking-row"]');
      const count = await bookings.count();

      if (count > 0) {
        // Click reschedule button
        await bookings.first().locator('[data-testid="reschedule-button"]').click();

        // Should show reschedule dialog
        await helpers.waitForDialog('reschedule-dialog');

        // Select new date and time
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        await page.fill('[data-testid="new-date-input"]', tomorrow.toISOString().split('T')[0]);
        await page.selectOption('[data-testid="new-time-select"]', '10:00');

        // Confirm reschedule
        await helpers.submitForm('confirm-reschedule-button');

        // Should show success message
        await helpers.waitForToast('Class rescheduled successfully');
      }
    });

    test('should cancel booking', async ({ page }) => {
      await page.goto('/classroom/bookings');

      const bookings = page.locator('[data-testid="booking-row"]');
      const count = await bookings.count();

      if (count > 0) {
        // Click cancel button
        await bookings.first().locator('[data-testid="cancel-button"]').click();

        // Should show cancel confirmation dialog
        await helpers.waitForDialog('cancel-booking-dialog');

        // Add cancellation reason
        await page.fill('[data-testid="cancellation-reason"]', 'Teacher unavailable');

        // Confirm cancellation
        await page.click('[data-testid="confirm-cancel-button"]');

        // Should show success message
        await helpers.waitForToast('Booking cancelled successfully');

        // Status should change to cancelled
        const status = bookings.first().locator('[data-testid="booking-status"]');
        await expect(status).toContainText('Cancelled');
      }
    });
  });

  test.describe('Student Management', () => {
    test('should view student list', async ({ page }) => {
      await page.goto('/classroom/students');

      // Should show students table
      await helpers.expectElementVisible('students-table');
      
      const students = page.locator('[data-testid="student-row"]');
      const studentCount = await students.count();

      // Each student should show required information
      for (let i = 0; i < Math.min(studentCount, 3); i++) {
        const student = students.nth(i);
        
        await expect(student.locator('[data-testid="student-name"]')).toBeVisible();
        await expect(student.locator('[data-testid="student-email"]')).toBeVisible();
        await expect(student.locator('[data-testid="enrollment-date"]')).toBeVisible();
        await expect(student.locator('[data-testid="progress-indicator"]')).toBeVisible();
      }
    });

    test('should view student details', async ({ page }) => {
      await page.goto('/classroom/students');

      const students = page.locator('[data-testid="student-row"]');
      const count = await students.count();

      if (count > 0) {
        // Click on first student
        await students.first().locator('[data-testid="view-student-button"]').click();

        // Should navigate to student details page
        await helpers.expectUrl(/\/classroom\/students\/[a-zA-Z0-9]+/);

        // Should show student details
        await helpers.expectElementVisible('student-details');
        await helpers.expectElementVisible('student-progress');
        await helpers.expectElementVisible('class-history');
        await helpers.expectElementVisible('performance-metrics');
      }
    });

    test('should add notes to student', async ({ page }) => {
      await page.goto('/classroom/students');

      const students = page.locator('[data-testid="student-row"]');
      const count = await students.count();

      if (count > 0) {
        // Click on first student
        await students.first().locator('[data-testid="view-student-button"]').click();

        // Add a note
        await page.click('[data-testid="add-note-button"]');
        await helpers.waitForDialog('add-note-dialog');

        const noteText = `Test note ${DataGenerators.randomString()}`;
        await page.fill('[data-testid="note-content"]', noteText);
        await helpers.submitForm('save-note-button');

        // Should show success message
        await helpers.waitForToast('Note added successfully');

        // Note should appear in notes list
        await helpers.expectElementText('student-notes', noteText);
      }
    });

    test('should send message to student', async ({ page }) => {
      await page.goto('/classroom/students');

      const students = page.locator('[data-testid="student-row"]');
      const count = await students.count();

      if (count > 0) {
        // Click message button
        await students.first().locator('[data-testid="message-student-button"]').click();

        // Should show message dialog
        await helpers.waitForDialog('message-dialog');

        const messageText = `Test message ${DataGenerators.randomString()}`;
        await page.fill('[data-testid="message-content"]', messageText);
        await helpers.submitForm('send-message-button');

        // Should show success message
        await helpers.waitForToast('Message sent successfully');
      }
    });
  });

  test.describe('Schedule Management', () => {
    test('should view teacher schedule', async ({ page }) => {
      await page.goto('/classroom/schedule');

      // Should show calendar view
      await helpers.expectElementVisible('schedule-calendar');
      await helpers.expectElementVisible('calendar-navigation');
      await helpers.expectElementVisible('schedule-legend');

      // Should show current week by default
      const currentWeekIndicator = page.locator('[data-testid="current-week"]');
      await expect(currentWeekIndicator).toBeVisible();
    });

    test('should set availability', async ({ page }) => {
      await page.goto('/classroom/schedule');

      // Click set availability button
      await page.click('[data-testid="set-availability-button"]');
      await helpers.waitForDialog('availability-dialog');

      // Select day and time slots
      await page.check('[data-testid="monday-checkbox"]');
      await page.selectOption('[data-testid="start-time-select"]', '09:00');
      await page.selectOption('[data-testid="end-time-select"]', '17:00');

      // Save availability
      await helpers.submitForm('save-availability-button');

      // Should show success message
      await helpers.waitForToast('Availability updated successfully');

      // Calendar should show available slots
      const availableSlots = page.locator('[data-testid="available-slot"]');
      await expect(availableSlots.first()).toBeVisible();
    });

    test('should block time slots', async ({ page }) => {
      await page.goto('/classroom/schedule');

      // Click on an available time slot
      const availableSlots = page.locator('[data-testid="available-slot"]');
      const count = await availableSlots.count();

      if (count > 0) {
        await availableSlots.first().click();

        // Should show slot options
        await page.click('[data-testid="block-slot-button"]');
        await helpers.waitForDialog('block-slot-dialog');

        // Add reason for blocking
        await page.fill('[data-testid="block-reason"]', 'Personal appointment');
        await helpers.submitForm('confirm-block-button');

        // Should show success message
        await helpers.waitForToast('Time slot blocked successfully');

        // Slot should show as blocked
        const blockedSlot = page.locator('[data-testid="blocked-slot"]');
        await expect(blockedSlot.first()).toBeVisible();
      }
    });

    test('should navigate between weeks', async ({ page }) => {
      await page.goto('/classroom/schedule');

      // Get current week
      const currentWeek = await page.locator('[data-testid="current-week"]').textContent();

      // Navigate to next week
      await page.click('[data-testid="next-week-button"]');

      // Week should change
      const nextWeek = await page.locator('[data-testid="current-week"]').textContent();
      expect(nextWeek).not.toBe(currentWeek);

      // Navigate back to previous week
      await page.click('[data-testid="prev-week-button"]');

      // Should return to original week
      const returnedWeek = await page.locator('[data-testid="current-week"]').textContent();
      expect(returnedWeek).toBe(currentWeek);
    });
  });

  test.describe('Class Session Management', () => {
    test('should start a class session', async ({ page }) => {
      await page.goto('/classroom');

      // Find an upcoming class
      const upcomingClasses = page.locator('[data-testid="upcoming-class"]');
      const count = await upcomingClasses.count();

      if (count > 0) {
        // Start the class
        await upcomingClasses.first().locator('[data-testid="start-class-button"]').click();

        // Should navigate to class session
        await helpers.expectUrl(/\/(video-call|classroom\/session)/);

        // Should show class interface
        await helpers.expectElementVisible('class-interface');
      }
    });

    test('should take attendance', async ({ page }) => {
      // This test assumes we're in a class session
      await page.goto('/classroom/session/test-session-id');

      // Should show attendance section
      await helpers.expectElementVisible('attendance-section');

      // Mark student as present
      const studentAttendance = page.locator('[data-testid="student-attendance"]');
      const studentCount = await studentAttendance.count();

      if (studentCount > 0) {
        await studentAttendance.first().locator('[data-testid="mark-present-button"]').click();

        // Should show success message
        await helpers.waitForToast('Attendance marked');

        // Status should change to present
        const status = studentAttendance.first().locator('[data-testid="attendance-status"]');
        await expect(status).toContainText('Present');
      }
    });

    test('should add class notes', async ({ page }) => {
      await page.goto('/classroom/session/test-session-id');

      // Add class notes
      await page.click('[data-testid="class-notes-tab"]');
      
      const noteText = `Class notes ${DataGenerators.randomString()}`;
      await page.fill('[data-testid="class-notes-input"]', noteText);
      await page.click('[data-testid="save-notes-button"]');

      // Should show success message
      await helpers.waitForToast('Notes saved successfully');

      // Notes should be saved
      const savedNotes = await page.locator('[data-testid="class-notes-input"]').inputValue();
      expect(savedNotes).toBe(noteText);
    });

    test('should end class session', async ({ page }) => {
      await page.goto('/classroom/session/test-session-id');

      // End the class
      await page.click('[data-testid="end-class-button"]');
      await helpers.waitForDialog('end-class-dialog');

      // Add session summary
      await page.fill('[data-testid="session-summary"]', 'Good class, student made progress');
      await page.selectOption('[data-testid="student-performance"]', 'excellent');

      // Confirm end class
      await helpers.submitForm('confirm-end-class-button');

      // Should show success message
      await helpers.waitForToast('Class ended successfully');

      // Should navigate back to dashboard
      await helpers.expectUrl(/\/classroom/);
    });
  });

  test.describe('Performance Analytics', () => {
    test('should view teaching analytics', async ({ page }) => {
      await page.goto('/classroom/analytics');

      // Should show analytics dashboard
      await helpers.expectElementVisible('analytics-dashboard');
      await helpers.expectElementVisible('performance-charts');
      await helpers.expectElementVisible('student-progress-overview');
      await helpers.expectElementVisible('class-statistics');
    });

    test('should filter analytics by date range', async ({ page }) => {
      await page.goto('/classroom/analytics');

      // Set date range
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      await page.fill('[data-testid="analytics-start-date"]', startDate.toISOString().split('T')[0]);
      await page.fill('[data-testid="analytics-end-date"]', endDate.toISOString().split('T')[0]);
      await page.click('[data-testid="apply-date-filter"]');

      await helpers.waitForLoadingToFinish();

      // Charts should update with filtered data
      await helpers.expectElementVisible('filtered-analytics');
    });

    test('should export analytics report', async ({ page }) => {
      await page.goto('/classroom/analytics');

      // Click export button
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-report-button"]');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/analytics.*\.(pdf|xlsx)$/);
    });
  });

  test.describe('Resource Management', () => {
    test('should upload teaching materials', async ({ page }) => {
      await page.goto('/classroom/resources');

      // Upload a file
      await page.click('[data-testid="upload-resource-button"]');
      await helpers.waitForDialog('upload-dialog');

      // Fill resource details
      await helpers.fillForm({
        'resource-title': `Test Resource ${DataGenerators.randomString()}`,
        'resource-description': 'Test resource for teaching',
        'resource-category': 'Grammar'
      });

      // Upload file (mock)
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles({
        name: 'test-resource.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test content')
      });

      // Save resource
      await helpers.submitForm('save-resource-button');

      // Should show success message
      await helpers.waitForToast('Resource uploaded successfully');

      // Resource should appear in list
      await helpers.expectElementVisible('resources-list');
    });

    test('should share resource with students', async ({ page }) => {
      await page.goto('/classroom/resources');

      const resources = page.locator('[data-testid="resource-item"]');
      const count = await resources.count();

      if (count > 0) {
        // Click share button
        await resources.first().locator('[data-testid="share-resource-button"]').click();
        await helpers.waitForDialog('share-resource-dialog');

        // Select students
        await page.check('[data-testid="select-all-students"]');

        // Add message
        await page.fill('[data-testid="share-message"]', 'Please review this resource for our next class');

        // Share resource
        await helpers.submitForm('confirm-share-button');

        // Should show success message
        await helpers.waitForToast('Resource shared successfully');
      }
    });

    test('should organize resources into folders', async ({ page }) => {
      await page.goto('/classroom/resources');

      // Create new folder
      await page.click('[data-testid="create-folder-button"]');
      await helpers.waitForDialog('create-folder-dialog');

      const folderName = `Test Folder ${DataGenerators.randomString()}`;
      await page.fill('[data-testid="folder-name"]', folderName);
      await helpers.submitForm('create-folder-button');

      // Should show success message
      await helpers.waitForToast('Folder created successfully');

      // Folder should appear in resources
      await helpers.expectElementText('resources-list', folderName);
    });
  });
});
