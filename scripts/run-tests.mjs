import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

console.log('🧪 Running Playwright tests with test configuration...');

try {
  // Ensure the application is running
  console.log('🚀 Starting application...');
  
  // Run tests
  console.log('🎭 Running Playwright tests...');
  execSync('npx playwright test', { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  console.log('✅ All tests completed successfully!');
} catch (error) {
  console.error('❌ Tests failed:', error.message);
  process.exit(1);
}
