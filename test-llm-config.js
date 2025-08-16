// 测试LLM配置动态切换
const fetch = require('node-fetch');

const BASE_URL = 'https://quiz.playoffer.cn';

// 模拟的session token (需要替换为真实的)
const TEST_SESSION_TOKEN = 'your-session-token-here';

async function testGetLLMConfig() {
  console.log('🔍 测试获取LLM配置...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/llm/config`, {
      method: 'GET',
      headers: {
        'X-Session-Id': TEST_SESSION_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ LLM配置获取成功:');
      console.log('  - Provider:', data.config.provider);
      console.log('  - Base URL:', data.config.baseUrl);
      console.log('  - Has API Key:', !!data.config.apiKey);
      console.log('  - Max Retries:', data.config.maxRetries);
      console.log('  - Timeout:', data.config.timeout);
    } else {
      console.log('❌ LLM配置获取失败:', data.error);
    }
  } catch (error) {
    console.error('❌ 请求异常:', error.message);
  }
}

async function testUpdateLLMConfig() {
  console.log('\n🔧 测试更新LLM配置...');
  
  const newConfig = {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-your-openai-key-here',
    maxRetries: 3,
    timeout: 45000,
    provider: 'openai'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/llm/config`, {
      method: 'POST',
      headers: {
        'X-Session-Id': TEST_SESSION_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newConfig)
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ LLM配置更新成功:', data.message);
    } else {
      console.log('❌ LLM配置更新失败:', data.error);
    }
  } catch (error) {
    console.error('❌ 请求异常:', error.message);
  }
}

async function testGetAdminLLMConfig() {
  console.log('\n👨‍💼 测试获取管理员LLM配置...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/llm/config`, {
      method: 'GET',
      headers: {
        'X-Session-Id': TEST_SESSION_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 管理员LLM配置获取成功:');
      data.configs.forEach(config => {
        console.log(`  - ${config.config_key}: ${config.config_value}`);
        console.log(`    描述: ${config.description}`);
        console.log(`    更新时间: ${config.updated_at}`);
      });
    } else {
      console.log('❌ 管理员LLM配置获取失败:', data.error);
    }
  } catch (error) {
    console.error('❌ 请求异常:', error.message);
  }
}

async function runTests() {
  console.log('🚀 开始测试LLM配置API...\n');
  
  if (TEST_SESSION_TOKEN === 'your-session-token-here') {
    console.log('⚠️ 请先在脚本中设置有效的SESSION_TOKEN');
    return;
  }
  
  await testGetLLMConfig();
  await testUpdateLLMConfig();
  await testGetAdminLLMConfig();
  
  console.log('\n✨ 测试完成!');
}

// 直接运行数据库配置切换示例
function showDatabaseConfigExamples() {
  console.log('\n📋 数据库配置切换示例:\n');
  
  console.log('1. 切换到OpenAI:');
  console.log(`UPDATE llm_config SET config_value = 'https://api.openai.com/v1' WHERE config_key = 'base_url';`);
  console.log(`UPDATE llm_config SET config_value = 'your-openai-api-key' WHERE config_key = 'api_key';`);
  console.log(`UPDATE llm_config SET config_value = 'openai' WHERE config_key = 'provider';`);
  
  console.log('\n2. 切换到Anthropic Claude:');
  console.log(`UPDATE llm_config SET config_value = 'https://api.anthropic.com' WHERE config_key = 'base_url';`);
  console.log(`UPDATE llm_config SET config_value = 'your-anthropic-api-key' WHERE config_key = 'api_key';`);
  console.log(`UPDATE llm_config SET config_value = 'anthropic' WHERE config_key = 'provider';`);
  
  console.log('\n3. 切换到Google AI:');
  console.log(`UPDATE llm_config SET config_value = 'https://generativelanguage.googleapis.com/v1beta' WHERE config_key = 'base_url';`);
  console.log(`UPDATE llm_config SET config_value = 'your-google-api-key' WHERE config_key = 'api_key';`);
  console.log(`UPDATE llm_config SET config_value = 'google' WHERE config_key = 'provider';`);
  
  console.log('\n4. 恢复默认(Ismaque):');
  console.log(`UPDATE llm_config SET config_value = 'https://ismaque.org/v1' WHERE config_key = 'base_url';`);
  console.log(`UPDATE llm_config SET config_value = 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP' WHERE config_key = 'api_key';`);
  console.log(`UPDATE llm_config SET config_value = 'ismaque' WHERE config_key = 'provider';`);
}

if (require.main === module) {
  showDatabaseConfigExamples();
  runTests();
}