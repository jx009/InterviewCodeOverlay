// 微信支付V2加密工具类测试
import { WechatPayV2Crypto, createWechatPayV2Crypto, WECHAT_PAY_V2_CONSTANTS } from '../utils/wechat-v2-crypto';
import { getWechatPayV2Config, validateWechatPayV2Config, getWechatPayV2ErrorMessage } from '../config/wechat-v2-config';

describe('WechatPayV2Crypto', () => {
  const testApiKey = 'test-api-key-12345678901234567890';
  const crypto = new WechatPayV2Crypto(testApiKey, 'MD5');

  describe('签名功能测试', () => {
    it('应该正确生成MD5签名', () => {
      const params = {
        appid: 'wxd930ea5d5a258f4f',
        mch_id: '10000100',
        nonce_str: 'ibuaiVcKdpRxkhJA',
        body: 'QQ公仔',
        out_trade_no: '20150806125346',
        total_fee: 1,
        spbill_create_ip: '123.12.12.123',
        notify_url: 'http://test.com/notify',
        trade_type: 'NATIVE'
      };

      const signature = crypto.generateSign(params);
      expect(signature).toBeDefined();
      expect(signature).toHaveLength(32);
      expect(signature).toMatch(/^[A-F0-9]{32}$/);
    });

    it('应该正确验证签名', () => {
      const params = {
        appid: 'wxd930ea5d5a258f4f',
        mch_id: '10000100',
        nonce_str: 'ibuaiVcKdpRxkhJA',
        body: 'QQ公仔',
        out_trade_no: '20150806125346',
        total_fee: 1,
        spbill_create_ip: '123.12.12.123',
        notify_url: 'http://test.com/notify',
        trade_type: 'NATIVE'
      };

      const signature = crypto.generateSign(params);
      const paramsWithSign = { ...params, sign: signature };
      
      expect(crypto.verifySign(paramsWithSign)).toBe(true);
    });

    it('应该正确处理空值和null值', () => {
      const params = {
        appid: 'wxd930ea5d5a258f4f',
        mch_id: '10000100',
        nonce_str: 'ibuaiVcKdpRxkhJA',
        body: 'QQ公仔',
        out_trade_no: '20150806125346',
        total_fee: 1,
        spbill_create_ip: '123.12.12.123',
        notify_url: 'http://test.com/notify',
        trade_type: 'NATIVE',
        empty_value: '',
        null_value: null,
        undefined_value: undefined
      };

      const signature = crypto.generateSign(params);
      expect(signature).toBeDefined();
    });
  });

  describe('HMAC-SHA256签名测试', () => {
    const hmacCrypto = new WechatPayV2Crypto(testApiKey, 'HMAC-SHA256');

    it('应该正确生成HMAC-SHA256签名', () => {
      const params = {
        appid: 'wxd930ea5d5a258f4f',
        mch_id: '10000100',
        nonce_str: 'ibuaiVcKdpRxkhJA',
        body: 'QQ公仔',
        out_trade_no: '20150806125346',
        total_fee: 1,
        spbill_create_ip: '123.12.12.123',
        notify_url: 'http://test.com/notify',
        trade_type: 'NATIVE'
      };

      const signature = hmacCrypto.generateSign(params);
      expect(signature).toBeDefined();
      expect(signature).toHaveLength(64);
      expect(signature).toMatch(/^[A-F0-9]{64}$/);
    });
  });

  describe('XML转换功能测试', () => {
    it('应该正确将对象转换为XML', () => {
      const obj = {
        appid: 'wxd930ea5d5a258f4f',
        mch_id: '10000100',
        nonce_str: 'ibuaiVcKdpRxkhJA',
        body: 'QQ公仔',
        out_trade_no: '20150806125346',
        total_fee: 1,
        spbill_create_ip: '123.12.12.123',
        notify_url: 'http://test.com/notify',
        trade_type: 'NATIVE'
      };

      const xml = crypto.objectToXml(obj);
      expect(xml).toContain('<xml>');
      expect(xml).toContain('<appid>wxd930ea5d5a258f4f</appid>');
      expect(xml).toContain('<mch_id>10000100</mch_id>');
      expect(xml).toContain('<total_fee>1</total_fee>');
      expect(xml).toContain('</xml>');
    });

    it('应该正确将XML转换为对象', async () => {
      const xml = `
        <xml>
          <appid>wxd930ea5d5a258f4f</appid>
          <mch_id>10000100</mch_id>
          <nonce_str>ibuaiVcKdpRxkhJA</nonce_str>
          <body>QQ公仔</body>
          <out_trade_no>20150806125346</out_trade_no>
          <total_fee>1</total_fee>
          <spbill_create_ip>123.12.12.123</spbill_create_ip>
          <notify_url>http://test.com/notify</notify_url>
          <trade_type>NATIVE</trade_type>
        </xml>
      `;

      const obj = await crypto.xmlToObject(xml);
      expect(obj.appid).toBe('wxd930ea5d5a258f4f');
      expect(obj.mch_id).toBe('10000100');
      expect(obj.total_fee).toBe('1');
      expect(obj.trade_type).toBe('NATIVE');
    });

    it('应该正确处理同步XML转换', () => {
      const xml = `
        <xml>
          <return_code>SUCCESS</return_code>
          <return_msg>OK</return_msg>
          <appid>wxd930ea5d5a258f4f</appid>
          <mch_id>10000100</mch_id>
          <result_code>SUCCESS</result_code>
          <prepay_id>wx201506101052001a2c6e7c39</prepay_id>
          <trade_type>NATIVE</trade_type>
          <code_url>weixin://wxpay/bizpayurl?pr=NwY5Mz9</code_url>
        </xml>
      `;

      const obj = crypto.xmlToObjectSync(xml);
      expect(obj.return_code).toBe('SUCCESS');
      expect(obj.result_code).toBe('SUCCESS');
      expect(obj.prepay_id).toBe('wx201506101052001a2c6e7c39');
      expect(obj.code_url).toBe('weixin://wxpay/bizpayurl?pr=NwY5Mz9');
    });
  });

  describe('辅助工具函数测试', () => {
    it('应该正确生成随机字符串', () => {
      const nonceStr = crypto.generateNonceStr();
      expect(nonceStr).toHaveLength(32);
      expect(nonceStr).toMatch(/^[A-Za-z0-9]{32}$/);

      const customLength = crypto.generateNonceStr(16);
      expect(customLength).toHaveLength(16);
    });

    it('应该正确生成时间戳', () => {
      const timestamp = crypto.generateTimestamp();
      expect(timestamp).toMatch(/^\d{10}$/);
      expect(parseInt(timestamp)).toBeGreaterThan(Date.now() / 1000 - 10);
    });

    it('应该正确进行金额转换', () => {
      expect(crypto.yuanToFen(1)).toBe(100);
      expect(crypto.yuanToFen(10.5)).toBe(1050);
      expect(crypto.yuanToFen(0.01)).toBe(1);

      expect(crypto.fenToYuan(100)).toBe(1);
      expect(crypto.fenToYuan(1050)).toBe(10.5);
      expect(crypto.fenToYuan(1)).toBe(0.01);
    });

    it('应该正确验证金额格式', () => {
      expect(crypto.validateAmount(100)).toBe(true);
      expect(crypto.validateAmount(1)).toBe(true);
      expect(crypto.validateAmount(99999999)).toBe(true);

      expect(crypto.validateAmount(0)).toBe(false);
      expect(crypto.validateAmount(-1)).toBe(false);
      expect(crypto.validateAmount(100000001)).toBe(false);
      expect(crypto.validateAmount(1.5)).toBe(false);
    });

    it('应该正确格式化时间', () => {
      const date = new Date(2023, 5, 15, 14, 30, 45); // 2023-06-15 14:30:45
      const formatted = crypto.formatDateTime(date);
      expect(formatted).toBe('20230615143045');
    });

    it('应该正确解析时间', () => {
      const timeString = '20230615143045';
      const date = crypto.parseDateTime(timeString);
      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBe(5); // 月份从0开始
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);
      expect(date.getSeconds()).toBe(45);
    });

    it('应该正确生成订单号', () => {
      const orderNo = crypto.generateOutTradeNo();
      expect(orderNo).toMatch(/^WX\d{13}\d{5}$/);

      const customOrderNo = crypto.generateOutTradeNo('TEST');
      expect(customOrderNo).toMatch(/^TEST\d{13}\d{5}$/);
    });

    it('应该正确生成退款单号', () => {
      const refundNo = crypto.generateRefundNo();
      expect(refundNo).toMatch(/^RF\d{13}\d{5}$/);

      const customRefundNo = crypto.generateRefundNo('REFUND');
      expect(customRefundNo).toMatch(/^REFUND\d{13}\d{5}$/);
    });

    it('应该正确格式化商品描述', () => {
      expect(crypto.formatDescription('普通商品')).toBe('普通商品');
      expect(crypto.formatDescription('Test Product')).toBe('Test Product');
      expect(crypto.formatDescription('商品-测试_1.0')).toBe('商品-测试_1.0');
      expect(crypto.formatDescription('商品@#$%^&*()+=[]{}|;:,.<>?')).toBe('商品');
      
      // 测试长度截断
      const longDesc = 'A'.repeat(200);
      expect(crypto.formatDescription(longDesc)).toHaveLength(127);
    });
  });

  describe('工厂函数测试', () => {
    it('应该正确创建加密工具实例', () => {
      const instance = createWechatPayV2Crypto(testApiKey, 'MD5');
      expect(instance).toBeInstanceOf(WechatPayV2Crypto);
    });
  });

  describe('常量测试', () => {
    it('应该包含所有必要的常量', () => {
      expect(WECHAT_PAY_V2_CONSTANTS.SIGN_TYPE.MD5).toBe('MD5');
      expect(WECHAT_PAY_V2_CONSTANTS.SIGN_TYPE.HMAC_SHA256).toBe('HMAC-SHA256');
      expect(WECHAT_PAY_V2_CONSTANTS.TRADE_TYPE.NATIVE).toBe('NATIVE');
      expect(WECHAT_PAY_V2_CONSTANTS.TRADE_STATE.SUCCESS).toBe('SUCCESS');
    });
  });
});

describe('WechatPayV2Config', () => {
  // 模拟环境变量
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WECHAT_PAY_APP_ID: 'wx123456789abcdef',
      WECHAT_PAY_MCH_ID: '1234567890',
      WECHAT_PAY_API_KEY: 'test-api-key-12345678901234567890',
      WECHAT_PAY_SIGN_TYPE: 'MD5',
      WECHAT_PAY_NOTIFY_URL: 'https://test.com/notify',
      BASE_URL: 'https://test.com',
      PAYMENT_ENVIRONMENT: 'sandbox'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('应该正确获取配置', () => {
    const config = getWechatPayV2Config();
    expect(config.appId).toBe('wx123456789abcdef');
    expect(config.mchId).toBe('1234567890');
    expect(config.apiKey).toBe('test-api-key-12345678901234567890');
    expect(config.signType).toBe('MD5');
    expect(config.environment).toBe('sandbox');
  });

  it('应该正确验证配置', () => {
    const config = getWechatPayV2Config();
    const validation = validateWechatPayV2Config(config);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('应该正确处理无效配置', () => {
    const invalidConfig = {
      appId: '',
      mchId: '',
      apiKey: '',
      signType: 'INVALID' as any,
      notifyUrl: '',
      environment: 'INVALID' as any
    };

    const validation = validateWechatPayV2Config(invalidConfig);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('应该正确获取错误消息', () => {
    const message = getWechatPayV2ErrorMessage('SIGNERROR');
    expect(message).toBe('签名错误');

    const unknownMessage = getWechatPayV2ErrorMessage('UNKNOWN_ERROR');
    expect(unknownMessage).toBe('未知错误: UNKNOWN_ERROR');
  });
});

// 集成测试示例
describe('WechatPayV2Integration', () => {
  const testApiKey = 'test-api-key-12345678901234567890';
  const crypto = new WechatPayV2Crypto(testApiKey, 'MD5');

  it('应该正确处理完整的支付流程数据', async () => {
    // 模拟统一下单请求
    const orderRequest = {
      appid: 'wxd930ea5d5a258f4f',
      mch_id: '10000100',
      nonce_str: crypto.generateNonceStr(),
      body: '测试商品',
      out_trade_no: crypto.generateOutTradeNo(),
      total_fee: crypto.yuanToFen(1),
      spbill_create_ip: '127.0.0.1',
      notify_url: 'https://test.com/notify',
      trade_type: 'NATIVE'
    };

    // 生成签名
    const signature = crypto.generateSign(orderRequest);
    const signedRequest = { ...orderRequest, sign: signature };

    // 转换为XML
    const xmlRequest = crypto.objectToXml(signedRequest);
    expect(xmlRequest).toContain('<xml>');
    expect(xmlRequest).toContain('<sign>');

    // 模拟微信支付响应
    const mockResponse = `
      <xml>
        <return_code>SUCCESS</return_code>
        <return_msg>OK</return_msg>
        <appid>wxd930ea5d5a258f4f</appid>
        <mch_id>10000100</mch_id>
        <nonce_str>5K8264ILTKCH16CQ2502SI8ZNMTM67VS</nonce_str>
        <sign>C380BEC2BFD727A4B6845133519F3AD6</sign>
        <result_code>SUCCESS</result_code>
        <prepay_id>wx201506101052001a2c6e7c39</prepay_id>
        <trade_type>NATIVE</trade_type>
        <code_url>weixin://wxpay/bizpayurl?pr=NwY5Mz9</code_url>
      </xml>
    `;

    // 解析响应
    const responseObj = await crypto.xmlToObject(mockResponse);
    expect(responseObj.return_code).toBe('SUCCESS');
    expect(responseObj.result_code).toBe('SUCCESS');
    expect(responseObj.code_url).toBeDefined();
  });
});

export {}; 