#!/usr/bin/env node

/**
 * 无签名构建脚本
 * 专门用于CI环境中构建未签名的应用包
 */

const { build } = require('electron-builder');
const path = require('path');

async function buildUnsigned() {
  try {
    console.log('🚀 开始无签名构建...');
    
    // 确保环境变量设置正确
    process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
    process.env.CSC_LINK = '';
    process.env.CSC_KEY_PASSWORD = '';
    process.env.WIN_CSC_LINK = '';
    process.env.WIN_CSC_KEY_PASSWORD = '';
    
    // 删除可能存在的环境变量
    delete process.env.CSC_LINK;
    delete process.env.CSC_KEY_PASSWORD;
    delete process.env.WIN_CSC_LINK;
    delete process.env.WIN_CSC_KEY_PASSWORD;
    
    const config = {
      // 基本配置
      appId: 'com.chunginlee.interviewcoder',
      productName: 'QuizCoze',
      
      // 文件包含
      files: [
        'dist/**/*',
        'dist-electron/**/*',
        'package.json',
        'electron/**/*'
      ],
      
      // 目录配置
      directories: {
        output: 'release',
        buildResources: 'assets'
      },
      
      // 基本设置
      asar: true,
      compression: 'maximum',
      
      // macOS特定配置（无签名）
      mac: {
        category: 'public.app-category.developer-tools',
        target: [
          { target: 'dmg', arch: ['x64', 'arm64'] },
          { target: 'zip', arch: ['x64', 'arm64'] }
        ],
        artifactName: 'Interview-Coder-${arch}.${ext}',
        icon: 'assets/icons/mac/logo_qz.icns'
      },
      
      // Windows配置（完全禁用签名）
      win: {
        target: ['nsis'],
        icon: 'assets/icons/win/logo_qz.ico',
        artifactName: '${productName}-Windows-${version}.${ext}',
        sign: null, // 禁用签名
        verifyUpdateCodeSignature: false // 禁用更新验证
      },
      
      // Linux配置
      linux: {
        target: ['AppImage'],
        icon: 'assets/icons/png/icon-256x256.png',
        artifactName: '${productName}-Linux-${version}.${ext}'
      }
    };
    
    // 执行构建
    await build({
      config,
      publish: 'never' // 不发布，只构建
    });
    
    console.log('✅ 构建完成！');
    
  } catch (error) {
    console.error('❌ 构建失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  buildUnsigned();
}

module.exports = { buildUnsigned };