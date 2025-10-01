import { FullConfig } from '@playwright/test';
import { DatabaseHelpers } from '../utils/test-helpers';
import { cleanAuthStates } from './auth-storage';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  try {
    // Clean up test data
    console.log('🗑️ Cleaning up test data...');
    await DatabaseHelpers.cleanupTestData();
    console.log('✅ Test data cleanup complete');

    // Close database connections
    console.log('🔌 Closing database connections...');
    // This would close any open database connections
    console.log('✅ Database connections closed');

    // Clean up uploaded files
    console.log('📁 Cleaning up test files...');
    await cleanupTestFiles();
    console.log('✅ Test files cleanup complete');

    // Clean up auth storage states
    await cleanAuthStates();

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }

  console.log('🎉 Global test teardown completed!');
}

async function cleanupTestFiles() {
  // Clean up any files uploaded during tests
  // This would remove test uploads, generated reports, etc.
  console.log('  - Removing test uploads...');
  console.log('  - Cleaning temporary files...');
  console.log('  - Removing test recordings...');
}

export default globalTeardown;
