#!/usr/bin/env node

/**
 * 测试Ismaque.org API状态
 */

const { OpenAI } = require('openai');

// 从代码中提取的API配置
const ISMAQUE_API_KEY = "sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP";

console.log('🧪 测试Ismaque.org API状态...\n');

async function testAPI() {
  try {
    const client = new OpenAI({
      apiKey: ISMAQUE_API_KEY,
      baseURL: "https://ismaque.org/v1",
      maxRetries: 2
    });

    console.log('📡 创建OpenAI客户端成功');
    console.log('🔗 Base URL:', "https://ismaque.org/v1");
    console.log('🔑 API Key前缀:', ISMAQUE_API_KEY.substring(0, 20) + '...');

    // 测试1: 简单的聊天完成请求
    console.log('\n🔍 测试1: 基本聊天完成请求...');
    
    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-20250514',  // 使用应用中的默认模型
      messages: [
        { role: "system", content: "你是一个测试助手。" },
        { role: "user", content: "请回复'测试成功'。" }
      ],
      max_tokens: 50,
      temperature: 0.1
    });

    console.log('✅ API调用成功!');
    console.log('📋 响应结构:');
    console.log('  - 响应对象存在:', !!response);
    console.log('  - choices字段存在:', !!response.choices);
    console.log('  - choices类型:', Array.isArray(response.choices) ? 'array' : typeof response.choices);
    console.log('  - choices长度:', response.choices?.length);
    
    if (response.choices && response.choices.length > 0) {
      console.log('  - 第一个choice存在:', !!response.choices[0]);
      console.log('  - message字段存在:', !!response.choices[0]?.message);
      console.log('  - content字段存在:', !!response.choices[0]?.message?.content);
      console.log('📝 响应内容:', response.choices[0]?.message?.content);
    }

    console.log('\n📊 完整响应对象:');
    console.log(JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('❌ API测试失败:');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    
    if (error.response) {
      console.error('HTTP状态码:', error.response.status);
      console.error('响应头:', error.response.headers);
      console.error('响应数据:', error.response.data);
    }
    
    if (error.request) {
      console.error('请求配置:', {
        url: error.request.url,
        method: error.request.method,
        headers: error.request.headers
      });
    }
  }
}

// 测试不同的模型
async function testModels() {
  const models = [
    'claude-sonnet-4-20250514',
    'gpt-4',
    'gpt-3.5-turbo',
    'gemini-2.5-flash-preview-04-17'
  ];

  for (const model of models) {
    console.log(`\n🔍 测试模型: ${model}`);
    try {
      const client = new OpenAI({
        apiKey: ISMAQUE_API_KEY,
        baseURL: "https://ismaque.org/v1",
        maxRetries: 1
      });

      const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: "测试" }],
        max_tokens: 10,
        temperature: 0
      });

      const hasValidResponse = response && response.choices && response.choices.length > 0;
      console.log(`  ${hasValidResponse ? '✅' : '❌'} ${model}: ${hasValidResponse ? '可用' : '不可用'}`);
      
    } catch (error) {
      console.log(`  ❌ ${model}: 错误 - ${error.message}`);
    }
  }
}

// 执行测试
async function runTests() {
  console.log('🚀 开始API测试...\n');
  
  // 基本API测试
  await testAPI();
  
  // 模型可用性测试
  console.log('\n' + '='.repeat(50));
  console.log('🔬 测试不同模型的可用性...');
  await testModels();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎯 建议:');
  console.log('1. 如果所有模型都不可用，可能是API密钥或服务问题');
  console.log('2. 如果只有特定模型不可用，请尝试使用其他模型');
  console.log('3. 检查网络连接和防火墙设置');
  console.log('4. 考虑联系API提供商确认服务状态');
}

runTests().catch(console.error);