#!/usr/bin/env node

/**
 * GitHub Artifacts 清理脚本
 * 用于清理GitHub Actions产生的artifacts以释放存储空间
 */

const https = require('https');

// GitHub API配置
const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'jx009'; // 请根据实际情况修改
const REPO_NAME = 'InterviewCodeOverlay'; // 请根据实际情况修改

// 从环境变量或命令行参数获取GitHub token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.argv[2];

if (!GITHUB_TOKEN) {
  console.error('❌ 错误：需要GitHub token');
  console.error('使用方法：');
  console.error('  node cleanup-artifacts.js YOUR_GITHUB_TOKEN');
  console.error('或设置环境变量：');
  console.error('  export GITHUB_TOKEN=your_token');
  console.error('  node cleanup-artifacts.js');
  process.exit(1);
}

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'cleanup-artifacts-script',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || responseData}`));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function listArtifacts() {
  const path = `/repos/${REPO_OWNER}/${REPO_NAME}/actions/artifacts?per_page=100`;
  return await makeRequest(path);
}

async function deleteArtifact(artifactId) {
  const path = `/repos/${REPO_OWNER}/${REPO_NAME}/actions/artifacts/${artifactId}`;
  return await makeRequest(path, 'DELETE');
}

async function cleanupArtifacts() {
  try {
    console.log('🔍 获取artifacts列表...');
    const response = await listArtifacts();
    const artifacts = response.artifacts;

    console.log(`📦 找到 ${artifacts.length} 个artifacts`);

    if (artifacts.length === 0) {
      console.log('✅ 没有artifacts需要清理');
      return;
    }

    // 显示artifacts信息
    console.log('\n📋 Artifacts列表:');
    artifacts.forEach((artifact, index) => {
      const createdAt = new Date(artifact.created_at).toLocaleString();
      const sizeKB = Math.round(artifact.size_in_bytes / 1024);
      console.log(`${index + 1}. ${artifact.name} (${sizeKB}KB) - ${createdAt}`);
    });

    // 计算总大小
    const totalSizeKB = Math.round(artifacts.reduce((sum, a) => sum + a.size_in_bytes, 0) / 1024);
    const totalSizeMB = Math.round(totalSizeKB / 1024);
    console.log(`\n💾 总大小: ${totalSizeKB}KB (${totalSizeMB}MB)`);

    // 删除所有artifacts
    console.log('\n🗑️  开始清理artifacts...');
    let deletedCount = 0;
    let failedCount = 0;

    for (const artifact of artifacts) {
      try {
        await deleteArtifact(artifact.id);
        console.log(`✅ 已删除: ${artifact.name}`);
        deletedCount++;
      } catch (error) {
        console.log(`❌ 删除失败 ${artifact.name}: ${error.message}`);
        failedCount++;
      }
      
      // 添加延迟避免API限制
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 清理完成！`);
    console.log(`✅ 成功删除: ${deletedCount} 个artifacts`);
    if (failedCount > 0) {
      console.log(`❌ 删除失败: ${failedCount} 个artifacts`);
    }

  } catch (error) {
    console.error('❌ 清理失败:', error.message);
    process.exit(1);
  }
}

// 运行清理
cleanupArtifacts();