import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

console.log('🗄️ Setting up test database...');

try {
  // Push database schema using test environment
  console.log('📋 Pushing database schema...');
  execSync('npx prisma db push', { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  // Generate Prisma client
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  // Seed test data if script exists
  try {
    console.log('🌱 Seeding test data...');
    execSync('npm run seed:activities', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch {
    console.log('⚠️ Seeding failed or no seed script found, continuing...');
  }

  console.log('✅ Test database setup complete!');
} catch (error) {
  console.error('❌ Test database setup failed:', error.message);
  process.exit(1);
}
