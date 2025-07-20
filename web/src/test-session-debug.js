// 简单的sessionId调试脚本
console.log('🔍 开始sessionId调试...');

// 检查localStorage
function checkLocalStorage() {
    console.log('=== localStorage检查 ===');
    const sessionId = localStorage.getItem('sessionId');
    const token = localStorage.getItem('token');
    
    console.log('sessionId:', sessionId);
    console.log('token:', token);
    
    if (sessionId) {
        console.log('✅ sessionId存在');
        return sessionId;
    } else {
        console.log('❌ sessionId不存在');
        return null;
    }
}

// 测试API请求
async function testApiRequest(sessionId) {
    console.log('\n=== API请求测试 ===');
    
    if (!sessionId) {
        console.log('❌ 没有sessionId，跳过API测试');
        return;
    }
    
    try {
        console.log('📡 发送请求...');
        const response = await fetch('http://localhost:3001/api/config', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId
            },
            credentials: 'include'
        });
        
        console.log('状态码:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API请求成功:', data);
        } else {
            console.log('❌ API请求失败:', response.statusText);
        }
    } catch (error) {
        console.log('❌ 请求异常:', error);
    }
}

// 模拟axios请求拦截器
function simulateAxiosInterceptor() {
    console.log('\n=== 模拟axios拦截器 ===');
    
    const sessionId = localStorage.getItem('sessionId');
    const token = localStorage.getItem('token');
    
    console.log('拦截器检查:');
    console.log('  sessionId:', sessionId ? sessionId.substring(0, 10) + '...' : '无');
    console.log('  token:', token ? token.substring(0, 10) + '...' : '无');
    
    if (sessionId) {
        console.log('✅ 拦截器会添加X-Session-Id头');
    } else {
        console.log('❌ 拦截器不会添加sessionId头');
    }
}

// 运行所有测试
async function runDebugTests() {
    console.log('🚀 开始调试测试...');
    
    const sessionId = checkLocalStorage();
    simulateAxiosInterceptor();
    await testApiRequest(sessionId);
    
    console.log('\n🏁 调试测试完成');
}

// 如果在浏览器中运行
if (typeof window !== 'undefined') {
    window.debugSession = {
        checkLocalStorage,
        testApiRequest,
        simulateAxiosInterceptor,
        runDebugTests,
        setTestSession: () => {
            localStorage.setItem('sessionId', '3PCdm1gS5b1oAKvLkSWduUYrrLM9Ea');
            console.log('✅ 测试sessionId已设置');
        },
        clearSession: () => {
            localStorage.removeItem('sessionId');
            localStorage.removeItem('token');
            console.log('🗑️ 会话已清除');
        }
    };
    
    console.log('调试函数已添加到 window.debugSession');
    console.log('使用方法:');
    console.log('  window.debugSession.runDebugTests() - 运行所有测试');
    console.log('  window.debugSession.setTestSession() - 设置测试sessionId');
}

// 立即运行一次检查
if (typeof window !== 'undefined') {
    runDebugTests();
}

export { runDebugTests, checkLocalStorage, testApiRequest };

// 测试sessionId保护机制
import { SessionProtection } from './utils/sessionProtection';

console.log('🧪 开始测试SessionId保护机制...');

// 1. 测试保存和获取
console.log('\n1️⃣ 测试保存和获取sessionId');
const testSessionId = 'test_session_' + Date.now();
SessionProtection.saveSessionId(testSessionId);

const retrievedSessionId = SessionProtection.getSessionId();
console.log('保存的sessionId:', testSessionId);
console.log('获取的sessionId:', retrievedSessionId);
console.log('是否匹配:', testSessionId === retrievedSessionId);

// 2. 测试备份恢复功能
console.log('\n2️⃣ 测试备份恢复功能');
// 模拟主sessionId丢失
localStorage.removeItem('sessionId');
console.log('主sessionId已清除');

const recoveredSessionId = SessionProtection.getSessionId();
console.log('恢复的sessionId:', recoveredSessionId);
console.log('恢复成功:', testSessionId === recoveredSessionId);

// 3. 测试会话信息
console.log('\n3️⃣ 测试会话信息');
const sessionInfo = SessionProtection.getSessionInfo();
console.log('会话信息:', sessionInfo);

// 4. 测试完全清除
console.log('\n4️⃣ 测试完全清除');
SessionProtection.clearSessionId();
const afterClearSessionId = SessionProtection.getSessionId();
console.log('清除后的sessionId:', afterClearSessionId);
console.log('清除成功:', afterClearSessionId === null);

console.log('\n✅ SessionId保护机制测试完成！'); 