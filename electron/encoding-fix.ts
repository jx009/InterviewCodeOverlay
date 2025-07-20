// encoding-fix.ts - 全局UTF-8编码设置
// 解决控制台中文乱码问题

export function setupUTF8Encoding() {
  // 设置Node.js进程的标准输出为UTF-8编码
  if (process.stdout && typeof process.stdout.setEncoding === 'function') {
    process.stdout.setEncoding('utf8');
  }
  
  if (process.stderr && typeof process.stderr.setEncoding === 'function') {
    process.stderr.setEncoding('utf8');
  }

  // 设置环境变量以确保UTF-8编码
  process.env.LANG = 'en_US.UTF-8';
  process.env.LC_ALL = 'en_US.UTF-8';
  
  // 如果是Windows系统，设置控制台代码页为UTF-8
  if (process.platform === 'win32') {
    try {
      const { execSync } = require('child_process');
      execSync('chcp 65001', { stdio: 'ignore' });
    } catch (error) {
      console.log('Note: Could not set Windows console to UTF-8');
    }
  }

  console.log('✅ UTF-8 encoding configured for console output');
}

// 重写console方法以确保UTF-8输出
export function patchConsoleForUTF8() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  console.log = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? Buffer.from(arg, 'utf8').toString('utf8') : arg
    );
    originalLog.apply(console, message);
  };

  console.error = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? Buffer.from(arg, 'utf8').toString('utf8') : arg
    );
    originalError.apply(console, message);
  };

  console.warn = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? Buffer.from(arg, 'utf8').toString('utf8') : arg
    );
    originalWarn.apply(console, message);
  };

  console.info = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? Buffer.from(arg, 'utf8').toString('utf8') : arg
    );
    originalInfo.apply(console, message);
  };
}