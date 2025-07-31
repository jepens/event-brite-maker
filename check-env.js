// Script to check environment variables
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking environment variables...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const optionalVars = [
    'VITE_SUPABASE_SERVICE_ROLE_KEY',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'RESEND_API_KEY'
  ];
  
  console.log('\n📋 Required Variables:');
  requiredVars.forEach(varName => {
    const line = lines.find(l => l.startsWith(varName + '='));
    if (line && !line.includes('your_') && !line.includes('placeholder')) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Not set or using placeholder`);
    }
  });
  
  console.log('\n📋 Optional Variables:');
  optionalVars.forEach(varName => {
    const line = lines.find(l => l.startsWith(varName + '='));
    if (line && !line.includes('your_') && !line.includes('placeholder')) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`⚠️  ${varName}: Not set (optional)`);
    }
  });
  
} else {
  console.log('❌ .env file not found');
  console.log('💡 Run: cp docker.env.example .env');
  console.log('💡 Then edit .env with your actual values');
}

console.log('\n🚀 To run with Docker:');
console.log('   docker-compose up -d event-app');
console.log('\n🌐 Access at: http://localhost:3000'); 