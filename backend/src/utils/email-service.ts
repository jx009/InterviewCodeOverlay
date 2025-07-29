import nodemailer from 'nodemailer';
import { getConfig } from '../config/database';

// 邮件传输器接口
interface EmailTransporter {
  sendMail(options: nodemailer.SendMailOptions): Promise<nodemailer.SentMessageInfo>;
}

let emailTransporter: EmailTransporter | null = null;

// 初始化邮件传输器
export const initEmailTransporter = async (): Promise<void> => {
  try {
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

    emailTransporter = nodemailer.createTransport(smtpConfig);

    // 验证SMTP连接
    await (emailTransporter as any).verify();
    console.log('✅ SMTP邮件服务初始化成功');
    
  } catch (error) {
    console.error('❌ SMTP邮件服务初始化失败:', error);
    throw error;
  }
};

// 获取邮件传输器
const getEmailTransporter = (): EmailTransporter => {
  if (!emailTransporter) {
    throw new Error('邮件传输器未初始化，请先调用initEmailTransporter()');
  }
  return emailTransporter;
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
      const transporter = getEmailTransporter();
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
      const transporter = getEmailTransporter();
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
      const transporter = getEmailTransporter();
      
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