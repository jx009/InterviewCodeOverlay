const crypto = require('crypto');
const axios = require('axios');
const xml2js = require('xml2js');

class WechatPayV2Service {
  constructor() {
    this.appId = process.env.WECHAT_PAY_APP_ID || 'wx04948e55b1c03277';
    this.mchId = process.env.WECHAT_PAY_MCH_ID || '1608730981';
    this.apiKey = process.env.WECHAT_PAY_API_KEY || 'Aa111111111122222222223333333333';
    this.notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL || 'http://localhost:3001/api/payment/wechat/callback';
    
    // 微信支付 API V2 URLs
    this.urls = {
      unifiedOrder: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
      orderQuery: 'https://api.mch.weixin.qq.com/pay/orderquery',
      closeOrder: 'https://api.mch.weixin.qq.com/pay/closeorder'
    };

    // 验证配置
    console.log('🔧 微信支付配置信息:');
    console.log('APP_ID:', this.appId);
    console.log('MCH_ID:', this.mchId);
    console.log('API_KEY长度:', this.apiKey.length);
    console.log('API_KEY前缀:', this.apiKey.substring(0, 6) + '...');
    console.log('NOTIFY_URL:', this.notifyUrl);
    
    // 验证API密钥格式（通常是32位，但可能有变化）
    if (this.apiKey.length < 30 || this.apiKey.length > 35) {
      console.warn(`⚠️ 警告：API密钥长度异常 (${this.apiKey.length}位)，可能导致签名错误`);
    }
    
    // 检查是否使用的是测试凭据
    if (this.apiKey.startsWith('Aa111111')) {
      console.warn('⚠️ 警告：当前使用的似乎是测试凭据，请确认微信支付配置正确');
      console.warn('💡 提示：请在环境变量中设置真实的微信支付凭据');
      console.warn('   WECHAT_PAY_APP_ID=你的真实AppID');
      console.warn('   WECHAT_PAY_MCH_ID=你的真实商户号');
      console.warn('   WECHAT_PAY_API_KEY=你的真实API密钥');
    }
  }

  /**
   * 生成随机字符串
   */
  generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成签名
   */
  generateSign(params) {
    // 过滤空值和sign字段，按字典序排序参数
    const sortedKeys = Object.keys(params)
      .filter(key => {
        const value = params[key];
        return key !== 'sign' && value !== '' && value !== null && value !== undefined;
      })
      .sort();
    
    const stringA = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    const stringSignTemp = `${stringA}&key=${this.apiKey}`;
    
    // 添加调试信息
    console.log('🔐 微信支付签名调试信息:');
    console.log('参数列表:', JSON.stringify(params, null, 2));
    console.log('有效参数键:', sortedKeys);
    console.log('签名字符串:', stringSignTemp);
    
    const signature = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
    console.log('生成签名:', signature);
    
    return signature;
  }

  /**
   * 验证签名
   */
  verifySign(params) {
    const receivedSign = params.sign;
    delete params.sign;
    const calculatedSign = this.generateSign(params);
    return receivedSign === calculatedSign;
  }

  /**
   * 将对象转换为XML
   */
  objectToXml(obj) {
    const builder = new xml2js.Builder({
      rootName: 'xml',
      headless: true,
      renderOpts: { pretty: false },
      cdata: false // 关闭CDATA包装
    });
    const xmlData = builder.buildObject(obj);
    
    console.log('📤 发送给微信的XML数据:');
    console.log(xmlData);
    
    return xmlData;
  }

  /**
   * 将XML转换为对象
   */
  async xmlToObject(xml) {
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    return parser.parseStringPromise(xml);
  }

  /**
   * 创建统一下单
   */
  async createUnifiedOrder(orderData) {
    const {
      outTradeNo,
      totalFee, // 金额，单位：分
      body,
      spbillCreateIp = '127.0.0.1',
      timeExpire
    } = orderData;

    const params = {
      appid: this.appId,
      mch_id: this.mchId,
      nonce_str: this.generateNonceStr(),
      body,
      out_trade_no: outTradeNo,
      total_fee: totalFee,
      spbill_create_ip: spbillCreateIp,
      notify_url: this.notifyUrl,
      trade_type: 'NATIVE' // 扫码支付
    };

    // 只有当timeExpire存在且格式正确时才添加
    if (timeExpire && timeExpire.length === 14) {
      params.time_expire = timeExpire;
    }

    // 生成签名
    params.sign = this.generateSign(params);

    // 转换为XML
    const xmlData = this.objectToXml(params);

    try {
      const response = await axios.post(this.urls.unifiedOrder, xmlData, {
        headers: {
          'Content-Type': 'application/xml',
          'User-Agent': 'WeChatPay Node.js SDK'
        },
        timeout: 30000
      });

      const result = await this.xmlToObject(response.data);
      const data = result.xml;

      if (data.return_code !== 'SUCCESS') {
        throw new Error(`微信支付API返回错误: ${data.return_msg}`);
      }

      if (data.result_code !== 'SUCCESS') {
        throw new Error(`微信支付业务错误: ${data.err_code} - ${data.err_code_des}`);
      }

      // 验证返回签名
      if (!this.verifySign(data)) {
        throw new Error('微信支付返回签名验证失败');
      }

      return {
        success: true,
        prepayId: data.prepay_id,
        codeUrl: data.code_url, // 二维码链接
        outTradeNo: data.out_trade_no
      };
    } catch (error) {
      console.error('微信支付统一下单失败:', error);
      return {
        success: false,
        error: error.message || '微信支付接口调用失败'
      };
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrder(outTradeNo) {
    console.log(`🔍 开始查询微信支付订单: ${outTradeNo}`);
    
    const params = {
      appid: this.appId,
      mch_id: this.mchId,
      out_trade_no: outTradeNo,
      nonce_str: this.generateNonceStr(),
      sign_type: 'MD5'
    };

    params.sign = this.generateSign(params);
    const xmlData = this.objectToXml(params);

    try {
      console.log('📤 发送订单查询请求到微信API');
      const response = await axios.post(this.urls.orderQuery, xmlData, {
        headers: { 'Content-Type': 'application/xml' },
        timeout: 30000
      });

      console.log('📥 收到微信API响应:', response.data);
      const result = await this.xmlToObject(response.data);
      const data = result.xml;
      console.log('📊 解析后的响应数据:', JSON.stringify(data, null, 2));

      if (data.return_code !== 'SUCCESS') {
        throw new Error(`查询失败: ${data.return_msg}`);
      }

      if (data.result_code !== 'SUCCESS') {
        console.log(`❌ 微信支付查询业务失败: ${data.err_code} - ${data.err_code_des}`);
        return {
          success: false,
          tradeState: 'NOTPAY',
          message: data.err_code_des || data.err_code
        };
      }

      // 处理支付状态
      const tradeState = data.trade_state;
      console.log(`💰 支付状态: ${tradeState}`);
      
      const queryResult = {
        success: true,
        tradeState: tradeState,
        transactionId: data.transaction_id,
        outTradeNo: data.out_trade_no,
        totalFee: parseInt(data.total_fee) || 0,
        timeEnd: this.parseWechatTime(data.time_end)
      };
      
      console.log('✅ 订单查询结果:', JSON.stringify(queryResult, null, 2));
      return queryResult;
    } catch (error) {
      console.error('查询订单失败:', error);
      throw new Error(`查询订单失败: ${error.message}`);
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(outTradeNo) {
    const params = {
      appid: this.appId,
      mch_id: this.mchId,
      out_trade_no: outTradeNo,
      nonce_str: this.generateNonceStr()
    };

    params.sign = this.generateSign(params);
    const xmlData = this.objectToXml(params);

    try {
      const response = await axios.post(this.urls.closeOrder, xmlData, {
        headers: { 'Content-Type': 'application/xml' },
        timeout: 30000
      });

      const result = await this.xmlToObject(response.data);
      const data = result.xml;

      return {
        success: data.return_code === 'SUCCESS' && data.result_code === 'SUCCESS',
        message: data.return_msg || data.err_code_des
      };
    } catch (error) {
      console.error('关闭订单失败:', error);
      throw new Error(`关闭订单失败: ${error.message}`);
    }
  }

  /**
   * 处理微信支付回调
   */
  async handleNotify(xmlData) {
    try {
      const result = await this.xmlToObject(xmlData);
      const data = result.xml;

      // 验证签名
      if (!this.verifySign(data)) {
        return {
          success: false,
          message: '签名验证失败'
        };
      }

      // 检查基本返回状态
      if (data.return_code !== 'SUCCESS') {
        return {
          success: false,
          message: `通讯失败: ${data.return_msg}`
        };
      }

      // 检查业务结果
      if (data.result_code !== 'SUCCESS') {
        return {
          success: false,
          message: `业务失败: ${data.err_code} - ${data.err_code_des}`
        };
      }

      return {
        success: true,
        outTradeNo: data.out_trade_no,
        transactionId: data.transaction_id,
        totalFee: parseInt(data.total_fee),
        timeEnd: data.time_end,
        tradeState: 'SUCCESS'
      };
    } catch (error) {
      console.error('处理微信支付回调失败:', error);
      return {
        success: false,
        message: `回调处理失败: ${error.message}`
      };
    }
  }

  /**
   * 生成回调响应XML
   */
  generateNotifyResponse(success = true, message = 'OK') {
    const response = {
      return_code: success ? 'SUCCESS' : 'FAIL',
      return_msg: message
    };
    return this.objectToXml(response);
  }

  /**
   * 解析微信时间格式 yyyyMMddHHmmss 转为 ISO 字符串
   */
  parseWechatTime(wechatTime) {
    if (!wechatTime) {
      console.log('⚠️ 微信时间为空');
      return null;
    }
    
    // 微信支付V2时间格式：yyyyMMddHHmmss (14位)
    if (wechatTime.length !== 14) {
      console.log(`⚠️ 微信时间格式异常，长度: ${wechatTime.length}, 内容: ${wechatTime}`);
      return null;
    }
    
    try {
      const year = wechatTime.substring(0, 4);
      const month = wechatTime.substring(4, 6);
      const day = wechatTime.substring(6, 8);
      const hour = wechatTime.substring(8, 10);
      const minute = wechatTime.substring(10, 12);
      const second = wechatTime.substring(12, 14);
      
      // 构建ISO格式时间（北京时间UTC+8）
      const isoTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`).toISOString();
      console.log(`🕐 时间转换: ${wechatTime} → ${isoTime}`);
      return isoTime;
    } catch (error) {
      console.error('❌ 微信时间解析失败:', error);
      return null;
    }
  }

  /**
   * 格式化时间为微信支付要求的格式 (yyyyMMddHHmmss)
   */
  formatExpireTime(minutes = 30) {
    const expireTime = new Date(Date.now() + minutes * 60 * 1000);
    const year = expireTime.getFullYear();
    const month = String(expireTime.getMonth() + 1).padStart(2, '0');
    const day = String(expireTime.getDate()).padStart(2, '0');
    const hour = String(expireTime.getHours()).padStart(2, '0');
    const minute = String(expireTime.getMinutes()).padStart(2, '0');
    const second = String(expireTime.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  /**
   * 元转分
   */
  yuanToFen(yuan) {
    return Math.round(parseFloat(yuan) * 100);
  }

  /**
   * 分转元
   */
  fenToYuan(fen) {
    return (parseInt(fen) / 100).toFixed(2);
  }
}

module.exports = WechatPayV2Service;