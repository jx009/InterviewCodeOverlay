// 微信支付V2版本加密工具类
import * as crypto from 'crypto';
import * as xml2js from 'xml2js';

/**
 * 微信支付V2版本加密工具类
 */
export class WechatPayV2Crypto {
  private apiKey: string;
  private signType: 'MD5' | 'HMAC-SHA256';

  constructor(apiKey: string, signType: 'MD5' | 'HMAC-SHA256' = 'MD5') {
    this.apiKey = apiKey;
    this.signType = signType;
  }

  /**
   * 生成签名
   * @param params 参数对象
   * @returns 签名字符串
   */
  generateSign(params: Record<string, any>): string {
    try {
      // 1. 过滤掉sign字段和空值
      const filteredParams = this.filterParams(params);
      
      // 2. 按字典序排序
      const sortedKeys = Object.keys(filteredParams).sort();
      
      // 3. 拼接成key=value&key=value格式
      const stringA = sortedKeys
        .map(key => `${key}=${filteredParams[key]}`)
        .join('&');
      
      // 4. 添加API密钥
      const stringSignTemp = `${stringA}&key=${this.apiKey}`;
      
      console.log('🔐 签名字符串:', stringSignTemp);
      
      // 5. 根据签名类型生成签名
      let signature: string;
      if (this.signType === 'MD5') {
        signature = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex');
      } else {
        signature = crypto.createHmac('sha256', this.apiKey).update(stringSignTemp, 'utf8').digest('hex');
      }
      
      const finalSign = signature.toUpperCase();
      console.log('✅ 生成签名成功:', finalSign);
      
      return finalSign;
    } catch (error) {
      console.error('❌ 签名生成失败:', error);
      throw new Error(`签名生成失败: ${error}`);
    }
  }

  /**
   * 验证签名
   * @param params 参数对象（包含sign字段）
   * @returns 验证结果
   */
  verifySign(params: Record<string, any>): boolean {
    try {
      if (!params.sign) {
        console.error('❌ 签名验证失败：缺少sign字段');
        return false;
      }

      const receivedSign = params.sign;
      const calculatedSign = this.generateSign(params);
      
      const isValid = receivedSign === calculatedSign;
      
      if (!isValid) {
        console.error('❌ 签名验证失败:', {
          received: receivedSign,
          calculated: calculatedSign,
          params: this.filterParams(params)
        });
      } else {
        console.log('✅ 签名验证成功');
      }
      
      return isValid;
    } catch (error) {
      console.error('❌ 签名验证异常:', error);
      return false;
    }
  }

  /**
   * 过滤参数（去除sign字段和空值）
   * @param params 原始参数
   * @returns 过滤后的参数
   */
  private filterParams(params: Record<string, any>): Record<string, any> {
    const filtered: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      // 跳过sign字段和空值
      if (key === 'sign' || 
          value === null || 
          value === undefined || 
          value === '' ||
          (typeof value === 'string' && value.trim() === '')) {
        continue;
      }
      
      // 确保值为字符串类型
      filtered[key] = typeof value === 'string' ? value : String(value);
    }
    
    return filtered;
  }

  /**
   * JavaScript对象转XML
   * @param obj 对象
   * @returns XML字符串
   */
  objectToXml(obj: Record<string, any>): string {
    const builder = new xml2js.Builder({
      rootName: 'xml',
      cdata: false,
      renderOpts: {
        pretty: false,
        indent: '',
        newline: ''
      }
    });
    
    return builder.buildObject(obj);
  }

  /**
   * XML转JavaScript对象
   * @param xmlString XML字符串
   * @returns Promise<对象>
   */
  async xmlToObject(xmlString: string): Promise<Record<string, any>> {
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
    
    try {
      console.log('🔍 开始解析XML, 长度:', xmlString.length);
      console.log('🔍 XML内容预览:', xmlString.substring(0, 200) + (xmlString.length > 200 ? '...' : ''));
      
      const result = await parser.parseStringPromise(xmlString);
      console.log('✅ XML解析成功:', JSON.stringify(result, null, 2));
      
      return result.xml || result;
    } catch (error) {
      console.error('❌ XML解析失败:', error);
      console.error('❌ 原始XML:', xmlString);
      throw new Error(`XML解析失败: ${error}`);
    }
  }

  /**
   * 同步版本的XML转对象（用于简单场景）
   * @param xmlString XML字符串
   * @returns 对象
   */
  xmlToObjectSync(xmlString: string): Record<string, any> {
    try {
      console.log('🔍 同步解析XML, 长度:', xmlString.length);
      console.log('🔍 XML内容预览:', xmlString.substring(0, 200) + (xmlString.length > 200 ? '...' : ''));
      
      // 如果XML为空或格式不正确，尝试手动解析
      if (!xmlString || !xmlString.trim()) {
        console.warn('⚠️ XML字符串为空');
        return { return_code: 'FAIL', return_msg: 'Empty response' };
      }
      
      // 检查是否是有效的XML格式
      if (!xmlString.includes('<xml>') && !xmlString.includes('<?xml')) {
        console.warn('⚠️ 响应不是XML格式:', xmlString);
        return { return_code: 'FAIL', return_msg: 'Invalid response format' };
      }
      
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: true,
        trim: true
      });
      
      let result: any;
      parser.parseString(xmlString, (err: any, parsed: any) => {
        if (err) {
          console.error('❌ 同步XML解析失败:', err);
          console.error('❌ 原始XML:', xmlString);
          throw new Error(`XML解析失败: ${err}`);
        }
        result = parsed.xml || parsed;
      });
      
      console.log('✅ 同步XML解析成功:', JSON.stringify(result, null, 2));
      
      // 确保返回的对象包含必要的字段
      if (!result || typeof result !== 'object') {
        console.warn('⚠️ 解析结果无效:', result);
        return { return_code: 'FAIL', return_msg: 'Invalid parsed result' };
      }
      
      return result;
    } catch (error) {
      console.error('❌ 同步XML解析异常:', error);
      console.error('❌ 原始XML:', xmlString);
      return { 
        return_code: 'FAIL', 
        return_msg: `XML解析异常: ${error}`,
        raw_response: xmlString
      };
    }
  }

  /**
   * 生成随机字符串
   * @param length 长度，默认32
   * @returns 随机字符串
   */
  generateNonceStr(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成时间戳
   * @returns 时间戳字符串
   */
  generateTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  /**
   * 元转分
   * @param amount 金额（元）
   * @returns 金额（分）
   */
  yuanToFen(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * 分转元
   * @param amount 金额（分）
   * @returns 金额（元）
   */
  fenToYuan(amount: number): number {
    return Math.round(amount) / 100;
  }

  /**
   * 验证金额格式
   * @param amount 金额（分）
   * @returns 是否有效
   */
  validateAmount(amount: number): boolean {
    return Number.isInteger(amount) && amount > 0 && amount <= 100000000; // 最大1万元
  }

  /**
   * 格式化时间为微信支付要求的格式
   * @param date 日期对象
   * @returns 格式化后的时间字符串 yyyyMMddHHmmss
   */
  formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  /**
   * 解析微信支付时间格式
   * @param timeString 时间字符串 yyyyMMddHHmmss
   * @returns 日期对象
   */
  parseDateTime(timeString: string): Date {
    if (!timeString || timeString.length !== 14) {
      throw new Error('Invalid time format');
    }
    
    const year = parseInt(timeString.substring(0, 4));
    const month = parseInt(timeString.substring(4, 6)) - 1; // 月份从0开始
    const day = parseInt(timeString.substring(6, 8));
    const hour = parseInt(timeString.substring(8, 10));
    const minute = parseInt(timeString.substring(10, 12));
    const second = parseInt(timeString.substring(12, 14));
    
    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * 生成商户订单号
   * @param prefix 前缀，默认'WX'
   * @returns 商户订单号
   */
  generateOutTradeNo(prefix: string = 'WX'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * 生成退款单号
   * @param prefix 前缀，默认'RF'
   * @returns 退款单号
   */
  generateRefundNo(prefix: string = 'RF'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * 格式化商品描述（处理特殊字符）
   * @param description 商品描述
   * @returns 格式化后的描述
   */
  formatDescription(description: string): string {
    // 移除特殊字符，只保留中文、英文、数字和基本符号
    return description.replace(/[^\u4e00-\u9fa5\w\s\-_.]/g, '').substring(0, 127);
  }

  /**
   * 验证回调IP地址（微信支付服务器IP白名单）
   * @param ip IP地址
   * @returns 是否为微信支付服务器IP
   */
  validateNotifyIP(ip: string): boolean {
    // 微信支付服务器IP段（需要定期更新）
    const wechatIPs = [
      '101.226.103.0/24',
      '101.226.62.0/24',
      '101.227.200.0/24',
      '101.227.204.0/24',
      '193.112.75.0/24',
      '140.207.54.0/24'
    ];
    
    // 简单的IP验证（生产环境建议使用更严格的IP段验证）
    return wechatIPs.some(ipRange => {
      const [network, mask] = ipRange.split('/');
      return this.isInNetwork(ip, network, parseInt(mask));
    });
  }

  /**
   * 检查IP是否在指定网络段内
   * @param ip 目标IP
   * @param network 网络地址
   * @param mask 子网掩码位数
   * @returns 是否在网络段内
   */
  private isInNetwork(ip: string, network: string, mask: number): boolean {
    const ipNum = this.ipToNumber(ip);
    const networkNum = this.ipToNumber(network);
    const maskNum = (0xFFFFFFFF << (32 - mask)) >>> 0;
    
    return (ipNum & maskNum) === (networkNum & maskNum);
  }

  /**
   * IP地址转数字
   * @param ip IP地址
   * @returns 数字
   */
  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }
}

// 导出工具函数
export const createWechatPayV2Crypto = (apiKey: string, signType: 'MD5' | 'HMAC-SHA256' = 'MD5') => {
  return new WechatPayV2Crypto(apiKey, signType);
};

// 导出常量
export const WECHAT_PAY_V2_CONSTANTS = {
  SIGN_TYPE: {
    MD5: 'MD5',
    HMAC_SHA256: 'HMAC-SHA256'
  },
  TRADE_TYPE: {
    JSAPI: 'JSAPI',
    NATIVE: 'NATIVE',
    APP: 'APP',
    MWEB: 'MWEB'
  },
  TRADE_STATE: {
    SUCCESS: 'SUCCESS',
    REFUND: 'REFUND',
    NOTPAY: 'NOTPAY',
    CLOSED: 'CLOSED',
    REVOKED: 'REVOKED',
    USERPAYING: 'USERPAYING',
    PAYERROR: 'PAYERROR'
  },
  RETURN_CODE: {
    SUCCESS: 'SUCCESS',
    FAIL: 'FAIL'
  },
  RESULT_CODE: {
    SUCCESS: 'SUCCESS',
    FAIL: 'FAIL'
  }
} as const; 