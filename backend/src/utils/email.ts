import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { dbConfig } from '../config/config-loader';
import { getConfig } from '../config/database';

// 获取配置
const config = dbConfig;

// 邮件传输配置将在后面定义

// 验证码生成工具
export const generateVerificationCode = (length: number = config.email.verification.codeLength): string => {
  const digits = '0123456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  
  return code;
};

// 生成验证令牌
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// 发送邮箱验证码
export const sendVerificationEmail = async (
  email: string, 
  code: string,
  purpose: 'register' | 'login' = 'register'
): Promise<boolean> => {
  try {
    const subject = purpose === 'register' ? '注册验证码' : '登录验证码';
    const actionText = purpose === 'register' ? '注册' : '登录';
    const expiresMinutes = config.email.verification.expiresMinutes;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #f0f0f0;
          }
          .content {
            padding: 30px 0;
          }
          .code-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
          }
          .verification-code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 10px 0;
          }
          .footer {
            padding: 20px 0;
            border-top: 1px solid #f0f0f0;
            color: #666;
            font-size: 14px;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>QuizCoze</h1>
          <p>${subject}</p>
        </div>
        
        <div class="content">
          <p>您好！</p>
          <p>您正在进行${actionText}操作，请使用以下验证码完成验证：</p>
          
          <div class="code-container">
            <div>您的验证码是</div>
            <div class="verification-code">${code}</div>
            <div>请在${expiresMinutes}分钟内使用</div>
          </div>
          
          <div class="warning">
            <strong>⚠️ 重要提醒：</strong>
            <ul>
              <li>验证码有效期为${expiresMinutes}分钟，请及时使用</li>
              <li>请勿向任何人透露此验证码</li>
              <li>如果您没有进行此操作，请忽略此邮件</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>如有疑问，请联系技术支持。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
          <p style="font-size: 12px; color: #999;">
            QuizCoze v${config.app.version} | 
            环境: ${config.app.environment}
          </p>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      QuizCoze - ${subject}
      
      您好！您正在进行${actionText}操作。
      
      验证码：${code}
      
      验证码有效期为${expiresMinutes}分钟，请及时使用。
      请勿向任何人透露此验证码。
      
      如果您没有进行此操作，请忽略此邮件。
    `;

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: `[QuizCoze] ${subject}`,
      text: textContent,
      html: htmlContent,
    };

    const emailTransporter = getTransporter();
    const result = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ 验证码邮件发送成功: ${email} (MessageId: ${result.messageId})`);
    return true;
  } catch (error) {
    console.error('❌ 发送验证码邮件失败:', error);
    return false;
  }
};

// 验证邮件配置
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    if (!transporter) {
      console.error('❌ 邮件传输器未初始化');
      return false;
    }
    await (transporter as any).verify();
    console.log(`✅ 邮件服务配置验证成功 (${config.email.smtp.host}:${config.email.smtp.port})`);
    return true;
  } catch (error) {
    console.error('❌ 邮件服务配置验证失败:', error);
    console.error('请检查以下配置：');
    console.error(`- SMTP服务器: ${config.email.smtp.host}:${config.email.smtp.port}`);
    console.error(`- 用户名: ${config.email.smtp.auth.user}`);
    console.error('- 密码: [已隐藏]');
    return false;
  }
};

// 获取邮件配置信息（用于调试）
export const getEmailConfigInfo = () => {
  return {
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    secure: config.email.smtp.secure,
    from: config.email.from,
    user: config.email.smtp.auth.user,
    codeLength: config.email.verification.codeLength,
    expiresMinutes: config.email.verification.expiresMinutes,
  };
};

export default {
  generateVerificationCode,
  generateVerificationToken,
  sendVerificationEmail,
  verifyEmailConfig,
  getEmailConfigInfo
}; 

// 邮件传输器接口
interface EmailTransporter {
  sendMail(options: nodemailer.SendMailOptions): Promise<nodemailer.SentMessageInfo>;
}

let transporter: EmailTransporter | null = null;

// 初始化邮件传输器
export const initEmailTransporter = async (): Promise<void> => {
  try {
    const config = getConfig();
    
    // SMTP配置
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // 添加超时和重试配置
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000,   // 30 seconds
      socketTimeout: 60000,     // 60 seconds
    };

    transporter = nodemailer.createTransport(smtpConfig);

    // 验证SMTP连接
    await (transporter as any).verify();
    console.log('✅ SMTP邮件服务初始化成功');
    
  } catch (error) {
    console.error('❌ SMTP邮件服务初始化失败:', error);
    throw error;
  }
};

// 获取邮件传输器
const getTransporter = (): EmailTransporter => {
  if (!transporter) {
    throw new Error('邮件传输器未初始化，请先调用initEmailTransporter()');
  }
  return transporter;
};

// 邮件模板类
export class EmailTemplates {
  
  // 验证码邮件模板
  static getVerificationCodeTemplate(code: string, email: string): { subject: string; html: string; text: string } {
    const subject = '【QuizCoze】邮箱验证码';
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>邮箱验证码</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
            }
            .content {
                padding: 40px 30px;
            }
            .code-box {
                background-color: #f8f9fa;
                border: 2px dashed #dee2e6;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 20px 0;
            }
            .code {
                font-family: 'Courier New', monospace;
                font-size: 28px;
                font-weight: 700;
                color: #495057;
                letter-spacing: 4px;
                margin: 10px 0;
            }
            .info {
                background-color: #e3f2fd;
                border-left: 4px solid #2196f3;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                color: #6c757d;
                font-size: 14px;
            }
            .warning {
                color: #e74c3c;
                font-size: 14px;
                margin-top: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📧 邮箱验证</h1>
                <p>QuizCoze 验证码服务</p>
            </div>
            
            <div class="content">
                <p>您好！</p>
                <p>您正在进行邮箱验证，请使用以下验证码完成操作：</p>
                
                <div class="code-box">
                    <p style="margin: 0; color: #666; font-size: 14px;">您的验证码是：</p>
                    <div class="code">${code}</div>
                    <p style="margin: 0; color: #666; font-size: 12px;">请在5分钟内输入此验证码</p>
                </div>
                
                <div class="info">
                    <p style="margin: 0;"><strong>📋 使用说明：</strong></p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>验证码有效期为 <strong>5分钟</strong></li>
                        <li>每个验证码最多可尝试 <strong>5次</strong></li>
                        <li>请勿将验证码分享给他人</li>
                    </ul>
                </div>
                
                <p>如果您没有请求此验证码，请忽略此邮件。</p>
                
                <div class="warning">
                    ⚠️ 为了您的账户安全，请勿将验证码告诉任何人！
                </div>
            </div>
            
            <div class="footer">
                <p>此邮件由 QuizCoze 系统自动发送，请勿回复。</p>
                <p>发送时间：${new Date().toLocaleString('zh-CN', { 
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })}</p>
            </div>
        </div>
    </body>
    </html>`;
    
    const text = `
【QuizCoze】邮箱验证码

您好！

您正在进行邮箱验证，请使用以下验证码完成操作：

验证码：${code}

使用说明：
- 验证码有效期为5分钟
- 每个验证码最多可尝试5次
- 请勿将验证码分享给他人

如果您没有请求此验证码，请忽略此邮件。

⚠️ 为了您的账户安全，请勿将验证码告诉任何人！

此邮件由 QuizCoze 系统自动发送，请勿回复。
发送时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
    `;

    return { subject, html, text };
  }

  // 注册成功欢迎邮件
  static getWelcomeTemplate(username: string): { subject: string; html: string; text: string } {
    const subject = '🎉 欢迎加入 QuizCoze！';
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>欢迎加入</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .content {
                padding: 40px 30px;
            }
            .feature {
                background-color: #f8f9fa;
                padding: 20px;
                margin: 15px 0;
                border-radius: 8px;
                border-left: 4px solid #28a745;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 注册成功！</h1>
                <p>欢迎加入 QuizCoze</p>
            </div>
            
            <div class="content">
                <p>亲爱的 <strong>${username}</strong>，</p>
                <p>恭喜您成功注册 QuizCoze 账户！现在您可以享受以下功能：</p>
                
                <div class="feature">
                    <h3>🚀 AI智能分析</h3>
                    <p>使用最新的AI模型分析编程题目和多选题</p>
                </div>
                
                <div class="feature">
                    <h3>📊 个性化配置</h3>
                    <p>自定义AI模型、编程语言和界面主题</p>
                </div>
                
                <div class="feature">
                    <h3>🔄 多端同步</h3>
                    <p>Web端和Electron客户端数据同步</p>
                </div>
                
                <p>开始使用：<a href="${process.env.WEB_URL || 'http://localhost:3000'}" style="color: #667eea;">立即体验</a></p>
                
                <p>如有问题，请随时联系我们。</p>
            </div>
        </div>
    </body>
    </html>`;
    
    const text = `欢迎加入 QuizCoze！

亲爱的 ${username}，

恭喜您成功注册！现在您可以享受AI智能分析、个性化配置、多端同步等功能。

开始使用：${process.env.WEB_URL || 'http://localhost:3000'}`;

    return { subject, html, text };
  }
}

// 邮件发送服务类
export class EmailService {
  
  // 发送验证码邮件
  static async sendVerificationCode(email: string, code: string): Promise<boolean> {
    try {
      const transporter = getTransporter();
      const template = EmailTemplates.getVerificationCodeTemplate(code, email);
      
      const mailOptions = {
        from: {
          name: 'QuizCoze',
          address: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
        },
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ 验证码邮件已发送到 ${email}:`, info.messageId);
      return true;
      
    } catch (error) {
      console.error(`❌ 验证码邮件发送失败 (${email}):`, error);
      return false;
    }
  }

  // 发送欢迎邮件
  static async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    try {
      const transporter = getTransporter();
      const template = EmailTemplates.getWelcomeTemplate(username);
      
      const mailOptions = {
        from: {
          name: 'QuizCoze',
          address: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
        },
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ 欢迎邮件已发送到 ${email}:`, info.messageId);
      return true;
      
    } catch (error) {
      console.error(`❌ 欢迎邮件发送失败 (${email}):`, error);
      return false;
    }
  }

  // 测试邮件发送
  static async testEmailSending(testEmail: string): Promise<boolean> {
    try {
      const transporter = getTransporter();
      
      const mailOptions = {
        from: {
          name: 'QuizCoze Test',
          address: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
        },
        to: testEmail,
        subject: '📧 邮件服务测试',
        html: `
          <h2>邮件服务测试成功！</h2>
          <p>如果您收到这封邮件，说明SMTP配置正确。</p>
          <p>发送时间：${new Date().toLocaleString('zh-CN')}</p>
        `,
        text: `邮件服务测试成功！发送时间：${new Date().toLocaleString('zh-CN')}`,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ 测试邮件已发送到 ${testEmail}:`, info.messageId);
      return true;
      
    } catch (error) {
      console.error(`❌ 测试邮件发送失败 (${testEmail}):`, error);
      return false;
    }
  }
}

// 邮件发送限流管理
export class EmailRateLimit {
  private static readonly RATE_LIMIT_PREFIX = 'email_rate_limit:';
  private static readonly MAX_EMAILS_PER_HOUR = 10; // 每小时最多10封邮件
  private static readonly MAX_EMAILS_PER_DAY = 50;  // 每天最多50封邮件

  // 检查是否可以发送邮件
  static async canSendEmail(email: string): Promise<{ canSend: boolean; reason?: string; waitTime?: number }> {
    try {
      const redis = require('../config/redis').getRedisClient();
      const now = Date.now();
      const hourKey = `${this.RATE_LIMIT_PREFIX}hour:${email}:${Math.floor(now / (60 * 60 * 1000))}`;
      const dayKey = `${this.RATE_LIMIT_PREFIX}day:${email}:${Math.floor(now / (24 * 60 * 60 * 1000))}`;

      const [hourCount, dayCount] = await Promise.all([
        redis.get(hourKey),
        redis.get(dayKey)
      ]);

      const hourLimit = parseInt(hourCount || '0');
      const dayLimit = parseInt(dayCount || '0');

      if (hourLimit >= this.MAX_EMAILS_PER_HOUR) {
        const waitTime = 60 * 60 * 1000 - (now % (60 * 60 * 1000)); // 距离下一小时的时间
        return { 
          canSend: false, 
          reason: `每小时邮件发送次数已达上限（${this.MAX_EMAILS_PER_HOUR}次）`,
          waitTime 
        };
      }

      if (dayLimit >= this.MAX_EMAILS_PER_DAY) {
        const waitTime = 24 * 60 * 60 * 1000 - (now % (24 * 60 * 60 * 1000)); // 距离第二天的时间
        return { 
          canSend: false, 
          reason: `每日邮件发送次数已达上限（${this.MAX_EMAILS_PER_DAY}次）`,
          waitTime 
        };
      }

      return { canSend: true };

    } catch (error) {
      console.error('检查邮件发送限制时出错:', error);
      // 出错时允许发送，但记录错误
      return { canSend: true };
    }
  }

  // 记录邮件发送
  static async recordEmailSent(email: string): Promise<void> {
    try {
      const redis = require('../config/redis').getRedisClient();
      const now = Date.now();
      const hourKey = `${this.RATE_LIMIT_PREFIX}hour:${email}:${Math.floor(now / (60 * 60 * 1000))}`;
      const dayKey = `${this.RATE_LIMIT_PREFIX}day:${email}:${Math.floor(now / (24 * 60 * 60 * 1000))}`;

      await Promise.all([
        redis.incr(hourKey),
        redis.incr(dayKey),
        redis.expire(hourKey, 60 * 60), // 1小时过期
        redis.expire(dayKey, 24 * 60 * 60), // 24小时过期
      ]);

    } catch (error) {
      console.error('记录邮件发送时出错:', error);
    }
  }
} 