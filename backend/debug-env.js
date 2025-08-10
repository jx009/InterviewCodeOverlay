require('dotenv').config({ path: '/mnt/c/jxProject/InterviewCodeOverlay/.env' });

console.log('🔍 Environment Variables Debug:');
console.log('Working directory:', process.cwd());
console.log('');

console.log('📋 WeChat Pay Configuration:');
console.log('WECHAT_PAY_APP_ID:', process.env.WECHAT_PAY_APP_ID);
console.log('WECHAT_PAY_MCH_ID:', process.env.WECHAT_PAY_MCH_ID);
console.log('WECHAT_PAY_API_KEY:', process.env.WECHAT_PAY_API_KEY);
console.log('WECHAT_PAY_API_KEY length:', process.env.WECHAT_PAY_API_KEY?.length || 0);
console.log('WECHAT_PAY_NOTIFY_URL:', process.env.WECHAT_PAY_NOTIFY_URL);
console.log('WECHAT_PAY_SIGN_TYPE:', process.env.WECHAT_PAY_SIGN_TYPE);
console.log('PAYMENT_ENVIRONMENT:', process.env.PAYMENT_ENVIRONMENT);

console.log('\n🔍 API Key Analysis:');
const apiKey = process.env.WECHAT_PAY_API_KEY || '';
console.log('Raw API Key:', JSON.stringify(apiKey));
console.log('First 10 chars:', apiKey.substring(0, 10));
console.log('Last 10 chars:', apiKey.substring(apiKey.length - 10));
console.log('Has spaces:', apiKey.includes(' '));
console.log('Has newlines:', apiKey.includes('\n') || apiKey.includes('\r'));

// Check if .env file exists
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
const envExists = fs.existsSync(envPath);
console.log('\n📁 .env file check:');
console.log('Expected path:', envPath);
console.log('File exists:', envExists);

if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  const apiKeyLine = lines.find(line => line.startsWith('WECHAT_PAY_API_KEY='));
  console.log('API Key line from .env:', apiKeyLine);
}