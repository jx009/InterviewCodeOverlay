const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始编译生产级别支付系统...');

try {
  // 1. 检查是否安装了必要的依赖
  console.log('📦 检查依赖...');
  
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredDeps = [
    '@prisma/client',
    'axios',
    'crypto'
  ];
  
  const requiredDevDeps = [
    'typescript',
    '@types/node'
  ];
  
  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.dependencies || !packageJson.dependencies[dep]
  );
  
  const missingDevDeps = requiredDevDeps.filter(dep => 
    !packageJson.devDependencies || !packageJson.devDependencies[dep]
  );
  
  if (missingDeps.length > 0 || missingDevDeps.length > 0) {
    console.log('❌ 缺少依赖，正在安装...');
    
    if (missingDeps.length > 0) {
      console.log('安装生产依赖:', missingDeps.join(', '));
      execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
    }
    
    if (missingDevDeps.length > 0) {
      console.log('安装开发依赖:', missingDevDeps.join(', '));
      execSync(`npm install -D ${missingDevDeps.join(' ')}`, { stdio: 'inherit' });
    }
  }
  
  // 2. 检查TypeScript配置
  console.log('⚙️  检查TypeScript配置...');
  
  const tsconfigPath = path.join(__dirname, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    console.log('创建tsconfig.json...');
    
    const tsconfig = {
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        lib: ["ES2020"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: false,
        sourceMap: false
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist", "**/*.test.ts"]
    };
    
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  }
  
  // 3. 编译TypeScript代码
  console.log('🔨 编译TypeScript代码...');
  
  try {
    execSync('npx tsc', { stdio: 'inherit' });
    console.log('✅ TypeScript编译成功');
  } catch (error) {
    console.error('❌ TypeScript编译失败:', error.message);
    process.exit(1);
  }
  
  // 4. 验证编译结果
  console.log('🔍 验证编译结果...');
  
  const distPath = path.join(__dirname, 'dist');
  const expectedFiles = [
    'config/wechat-pay-v2.js',
    'services/WechatPayV2Service.js',
    'services/PaymentService.js',
    'routes/payment.js',
    'scripts/init-payment-packages.js'
  ];
  
  const missingFiles = expectedFiles.filter(file => 
    !fs.existsSync(path.join(distPath, file))
  );
  
  if (missingFiles.length > 0) {
    console.error('❌ 编译结果不完整，缺少文件:', missingFiles);
    process.exit(1);
  }
  
  // 5. 生成Prisma客户端
  console.log('🗄️  生成Prisma客户端...');
  
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma客户端生成成功');
  } catch (error) {
    console.warn('⚠️ Prisma客户端生成失败:', error.message);
    console.log('请手动运行: npx prisma generate');
  }
  
  // 6. 初始化支付套餐数据
  console.log('💰 初始化支付套餐数据...');
  
  try {
    execSync('node dist/scripts/init-payment-packages.js', { stdio: 'inherit' });
    console.log('✅ 支付套餐数据初始化成功');
  } catch (error) {
    console.warn('⚠️ 支付套餐数据初始化失败:', error.message);
    console.log('请手动运行: node dist/scripts/init-payment-packages.js');
  }
  
  console.log('\n🎉 生产级别支付系统编译完成！');
  console.log('\n📋 下一步：');
  console.log('1. 配置环境变量（参考 env.payment.example）');
  console.log('2. 配置微信支付商户参数');
  console.log('3. 重启服务器以启用新的支付系统');
  console.log('4. 测试支付流程');

} catch (error) {
  console.error('❌ 编译过程出错:', error);
  process.exit(1);
} 