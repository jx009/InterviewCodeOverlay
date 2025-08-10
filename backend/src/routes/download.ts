import express from 'express';
import path from 'path';
import fs from 'fs';
import { ResponseUtils } from '../utils/response';

const router = express.Router();

// 定义下载文件的配置
const DOWNLOAD_CONFIG = {
  windows: {
    filename: 'Interview-Coder-Windows-Setup.exe',
    path: '../../release/Interview-Coder-Windows-1.0.19.exe',
    contentType: 'application/octet-stream'
  },
  mac: {
    filename: 'Interview-Coder-macOS.dmg',
    path: '../../release/Interview-Coder-macOS-1.0.19.dmg',
    contentType: 'application/octet-stream'
  }
};

// 获取下载信息
router.get('/info', async (req, res) => {
  try {
    const version = '1.0.19';
    const releaseDate = '2024-01-15';
    
    const downloadInfo = {
      version,
      releaseDate,
      platforms: {
        windows: {
          available: await checkFileExists(DOWNLOAD_CONFIG.windows.path),
          filename: DOWNLOAD_CONFIG.windows.filename,
          size: await getFileSize(DOWNLOAD_CONFIG.windows.path)
        },
        mac: {
          available: await checkFileExists(DOWNLOAD_CONFIG.mac.path),
          filename: DOWNLOAD_CONFIG.mac.filename,
          size: await getFileSize(DOWNLOAD_CONFIG.mac.path)
        }
      }
    };

    return ResponseUtils.success(res, downloadInfo);
  } catch (error) {
    console.error('获取下载信息失败:', error);
    return ResponseUtils.internalError(res, '获取下载信息失败');
  }
});

// Windows 下载
router.get('/windows', async (req, res) => {
  try {
    const config = DOWNLOAD_CONFIG.windows;
    const filePath = path.join(__dirname, config.path);
    
    if (!await checkFileExists(filePath)) {
      return ResponseUtils.notFound(res, 'Windows 安装包不存在');
    }

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${config.filename}"`);
    res.setHeader('Content-Type', config.contentType);
    
    // 发送文件
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('文件流错误:', error);
      if (!res.headersSent) {
        ResponseUtils.internalError(res, '文件下载失败');
      }
    });
    
    fileStream.on('end', () => {
      console.log('Windows 文件下载完成');
    });
    
  } catch (error) {
    console.error('Windows 下载失败:', error);
    return ResponseUtils.internalError(res, '下载失败');
  }
});

// macOS 下载
router.get('/mac', async (req, res) => {
  try {
    const config = DOWNLOAD_CONFIG.mac;
    const filePath = path.join(__dirname, config.path);
    
    if (!await checkFileExists(filePath)) {
      return ResponseUtils.notFound(res, 'macOS 安装包不存在');
    }

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${config.filename}"`);
    res.setHeader('Content-Type', config.contentType);
    
    // 发送文件
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('文件流错误:', error);
      if (!res.headersSent) {
        ResponseUtils.internalError(res, '文件下载失败');
      }
    });
    
    fileStream.on('end', () => {
      console.log('macOS 文件下载完成');
    });
    
  } catch (error) {
    console.error('macOS 下载失败:', error);
    return ResponseUtils.internalError(res, '下载失败');
  }
});


// 辅助函数：检查文件是否存在
async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// 辅助函数：获取文件大小
async function getFileSize(filePath: string): Promise<string> {
  try {
    const stats = await fs.promises.stat(filePath);
    const sizeInBytes = stats.size;
    
    // 转换为人类可读的格式
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
  } catch {
    return 'N/A';
  }
}

export default router;