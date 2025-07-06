// 微信支付加密工具
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import NodeRSA from 'node-rsa';
import { getWechatPayConfig } from '../config/payment-config';
import { 
  WECHAT_SIGN_CONFIG, 
  generateNonceStr, 
  generateTimestamp 
} from '../config/wechat-config';

// 微信支付签名工具类
export class WechatCrypto {
  private privateKey: string = '';
  private publicKey: string = '';
  private config: any;

  constructor() {
    this.config = getWechatPayConfig();
    this.loadKeys();
  }

  // 加载证书和私钥
  private loadKeys() {
    try {
      // 在开发环境下，如果证书路径是默认的开发路径，则使用模拟证书
      if (process.env.NODE_ENV === 'development' && 
          (this.config.keyPath === '/dev/null' || this.config.certPath === '/dev/null')) {
        console.log('⚠️  开发环境使用模拟微信支付证书');
        this.privateKey = 'dev_private_key';
        this.publicKey = 'dev_public_key';
        return;
      }

      // 加载商户私钥
      const keyPath = path.resolve(this.config.keyPath);
      if (!fs.existsSync(keyPath)) {
        throw new Error(`Private key file not found: ${keyPath}`);
      }
      this.privateKey = fs.readFileSync(keyPath, 'utf8');

      // 加载商户证书
      const certPath = path.resolve(this.config.certPath);
      if (!fs.existsSync(certPath)) {
        throw new Error(`Certificate file not found: ${certPath}`);
      }
      const cert = fs.readFileSync(certPath, 'utf8');
      
      // 从证书中提取公钥
      this.publicKey = this.extractPublicKeyFromCert(cert);
      
      console.log('✅ 微信支付证书加载成功');
    } catch (error) {
      console.error('❌ 微信支付证书加载失败:', error);
      throw error;
    }
  }

  // 从证书中提取公钥
  private extractPublicKeyFromCert(cert: string): string {
    try {
      const certObj = crypto.createPublicKey(cert);
      return certObj.export({ type: 'spki', format: 'pem' }) as string;
    } catch (error) {
      console.error('提取公钥失败:', error);
      throw new Error('Failed to extract public key from certificate');
    }
  }

  // 生成请求签名
  generateSignature(method: string, url: string, timestamp: string, nonce: string, body: string = ''): string {
    try {
      // 开发环境使用模拟签名
      if (process.env.NODE_ENV === 'development' && this.privateKey === 'dev_private_key') {
        return 'dev_signature_' + Math.random().toString(36).substring(2, 15);
      }

      // 构建签名字符串
      const signString = [method, url, timestamp, nonce, body].join('\n') + '\n';
      
      // 使用私钥签名
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(signString, 'utf8');
      const signature = sign.sign(this.privateKey, 'base64');
      
      return signature;
    } catch (error) {
      console.error('生成签名失败:', error);
      throw new Error('Failed to generate signature');
    }
  }

  // 生成Authorization头
  generateAuthorizationHeader(method: string, url: string, body: string = ''): string {
    const timestamp = generateTimestamp();
    const nonce = generateNonceStr();
    const signature = this.generateSignature(method, url, timestamp, nonce, body);

    return [
      `${WECHAT_SIGN_CONFIG.ALGORITHM}`,
      `mchid="${this.config.mchId}"`,
      `nonce_str="${nonce}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${this.config.serialNo}"`,
      `signature="${signature}"`
    ].join(',');
  }

  // 验证回调签名
  verifyNotifySignature(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
    wechatPublicKey?: string
  ): boolean {
    try {
      // 开发环境总是返回true
      if (process.env.NODE_ENV === 'development' && this.publicKey === 'dev_public_key') {
        return true;
      }

      // 构建验签字符串
      const signString = [timestamp, nonce, body].join('\n') + '\n';
      
      // 使用微信公钥验证签名（如果提供）
      const publicKey = wechatPublicKey || this.publicKey;
      
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(signString, 'utf8');
      
      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      console.error('验证回调签名失败:', error);
      return false;
    }
  }

  // AES-256-GCM 解密 (用于解密回调数据)
  decryptAES256GCM(ciphertext: string, key: string, nonce: string, associatedData: string = ''): string {
    try {
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      // 注意：这是简化版本，实际使用时需要根据微信支付的具体加密方式调整
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('AES解密失败:', error);
      throw new Error('Failed to decrypt AES data');
    }
  }

  // RSA加密
  encryptRSA(data: string, publicKey?: string): string {
    try {
      const key = publicKey || this.publicKey;
      const rsa = new NodeRSA(key);
      rsa.setOptions({ encryptionScheme: 'pkcs1' });
      
      return rsa.encrypt(data, 'base64');
    } catch (error) {
      console.error('RSA加密失败:', error);
      throw new Error('Failed to encrypt RSA data');
    }
  }

  // RSA解密
  decryptRSA(encryptedData: string, privateKey?: string): string {
    try {
      const key = privateKey || this.privateKey;
      const rsa = new NodeRSA(key);
      rsa.setOptions({ encryptionScheme: 'pkcs1' });
      
      return rsa.decrypt(encryptedData, 'utf8');
    } catch (error) {
      console.error('RSA解密失败:', error);
      throw new Error('Failed to decrypt RSA data');
    }
  }

  // 生成MD5签名 (用于部分旧版API)
  generateMD5Signature(params: Record<string, any>): string {
    try {
      // 排序参数
      const sortedKeys = Object.keys(params).sort();
      const signString = sortedKeys
        .filter(key => params[key] !== undefined && params[key] !== '')
        .map(key => `${key}=${params[key]}`)
        .join('&') + `&key=${this.config.apiKey}`;
      
      // 生成MD5签名
      return crypto.createHash('md5').update(signString, 'utf8').digest('hex').toUpperCase();
    } catch (error) {
      console.error('生成MD5签名失败:', error);
      throw new Error('Failed to generate MD5 signature');
    }
  }

  // 验证MD5签名
  verifyMD5Signature(params: Record<string, any>, signature: string): boolean {
    try {
      const expectedSign = this.generateMD5Signature(params);
      return expectedSign === signature.toUpperCase();
    } catch (error) {
      console.error('验证MD5签名失败:', error);
      return false;
    }
  }

  // 生成随机字符串
  static generateNonceStr(length: number = 32): string {
    return generateNonceStr(length);
  }

  // 生成时间戳
  static generateTimestamp(): string {
    return generateTimestamp();
  }

  // 获取配置信息
  getConfig() {
    return {
      appId: this.config.appId,
      mchId: this.config.mchId,
      serialNo: this.config.serialNo,
      environment: this.config.environment
    };
  }
}

// 单例模式
let wechatCryptoInstance: WechatCrypto | null = null;

export function getWechatCrypto(): WechatCrypto {
  if (!wechatCryptoInstance) {
    wechatCryptoInstance = new WechatCrypto();
  }
  return wechatCryptoInstance;
}

// 工具函数：验证时间戳
export function validateTimestamp(timestamp: string, maxDiff: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp);
  
  return Math.abs(now - requestTime) <= maxDiff;
}

// 工具函数：生成请求ID
export function generateRequestId(): string {
  return `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 工具函数：格式化错误信息
export function formatCryptoError(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
} 