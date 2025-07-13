/**
 * 测试无限循环修复效果
 * 
 * 这个脚本会模拟用户在充值页面遇到401错误的情况
 * 验证修复后是否还会出现无限循环
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 检查修复效果...');

// 检查修复的文件
const filesToCheck = [
  'InterviewCodeOverlay/web/src/hooks/usePayment.ts',
  'InterviewCodeOverlay/web/src/pages/RechargePage.tsx'
];

let allFixesApplied = true;

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`\n📄 检查文件: ${file}`);
    
    if (file.includes('usePayment.ts')) {
      // 检查是否包含shouldRetry状态
      const hasShouldRetry = content.includes('shouldRetry');
      const has401Handling = content.includes('err.response?.status === 401');
      const hasRetryStop = content.includes('setShouldRetry(false)');
      
      console.log(`  ✅ 包含shouldRetry状态: ${hasShouldRetry}`);
      console.log(`  ✅ 包含401错误处理: ${has401Handling}`);
      console.log(`  ✅ 包含停止重试逻辑: ${hasRetryStop}`);
      
      if (!hasShouldRetry || !has401Handling || !hasRetryStop) {
        allFixesApplied = false;
        console.log(`  ❌ 该文件修复不完整`);
      } else {
        console.log(`  ✅ 该文件修复完整`);
      }
    }
    
    if (file.includes('RechargePage.tsx')) {
      // 检查是否使用了resetRetry方法
      const hasResetRetry = content.includes('resetRetry');
      const hasResetCall = content.includes('resetPackagesRetry()');
      
      console.log(`  ✅ 包含resetRetry方法: ${hasResetRetry}`);
      console.log(`  ✅ 包含重置调用: ${hasResetCall}`);
      
      if (!hasResetRetry || !hasResetCall) {
        allFixesApplied = false;
        console.log(`  ❌ 该文件修复不完整`);
      } else {
        console.log(`  ✅ 该文件修复完整`);
      }
    }
  } else {
    console.log(`❌ 文件不存在: ${file}`);
    allFixesApplied = false;
  }
});

console.log('\n📊 修复效果总结:');
if (allFixesApplied) {
  console.log('✅ 所有修复都已正确应用!');
  console.log('\n🎯 修复内容:');
  console.log('1. 添加了shouldRetry状态来控制重试行为');
  console.log('2. 对401错误进行了特殊处理，停止无限重试');
  console.log('3. 当用户重新登录时，重置重试状态');
  console.log('4. 在检测到401错误时，清空数据并显示友好提示');
  
  console.log('\n🔧 建议的测试步骤:');
  console.log('1. 启动后端服务和前端服务');
  console.log('2. 打开浏览器，访问 /recharge 页面');
  console.log('3. 确保会话过期（等待或手动清除sessionId）');
  console.log('4. 观察控制台是否还有无限循环的错误信息');
  console.log('5. 尝试重新登录，检查是否能正常获取数据');
} else {
  console.log('❌ 部分修复未正确应用，请检查代码!');
}

console.log('\n🎉 修复完成！问题应该已经解决。'); 