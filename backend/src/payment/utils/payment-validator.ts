// 支付参数验证工具
import { PaymentMethod, PaymentStatus } from '../../types/payment';
import { PAYMENT_CONFIG, validateAmount, validatePoints } from '../config/payment-config';

// 验证结果接口
export interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
}

// 创建订单参数验证
export function validateCreateOrderParams(params: {
  userId?: number;
  packageId?: number;
  amount?: number;
  points?: number;
  paymentMethod?: string;
}): ValidationResult {
  const errors: string[] = [];

  // 验证用户ID
  if (!params.userId || !Number.isInteger(params.userId) || params.userId <= 0) {
    errors.push('用户ID必须是正整数');
  }

  // 验证支付金额
  if (params.amount !== undefined) {
    if (typeof params.amount !== 'number' || params.amount <= 0) {
      errors.push('支付金额必须是正数');
    } else {
      const amountValidation = validateAmount(params.amount);
      if (!amountValidation.valid) {
        errors.push(amountValidation.message!);
      }
    }
  }

  // 验证积分数量
  if (params.points !== undefined) {
    if (!Number.isInteger(params.points) || params.points <= 0) {
      errors.push('积分数量必须是正整数');
    } else {
      const pointsValidation = validatePoints(params.points);
      if (!pointsValidation.valid) {
        errors.push(pointsValidation.message!);
      }
    }
  }

  // 验证支付方式
  if (params.paymentMethod) {
    if (!PAYMENT_CONFIG.SUPPORTED_METHODS.includes(params.paymentMethod as any)) {
      errors.push(`不支持的支付方式: ${params.paymentMethod}`);
    }
  }

  // 验证套餐ID（如果提供）
  if (params.packageId !== undefined) {
    if (!Number.isInteger(params.packageId) || params.packageId <= 0) {
      errors.push('套餐ID必须是正整数');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length > 0 ? errors.join('; ') : undefined
  };
}

// 验证订单号格式
export function validateOrderNo(orderNo: string): ValidationResult {
  if (!orderNo || typeof orderNo !== 'string') {
    return { valid: false, message: '订单号不能为空' };
  }

  // 订单号格式验证 (PAY开头，后跟时间戳和随机数)
  const orderNoRegex = /^PAY\d{13}\d{4}$/;
  if (!orderNoRegex.test(orderNo)) {
    return { valid: false, message: '订单号格式不正确' };
  }

  return { valid: true };
}

// 验证商户订单号格式
export function validateOutTradeNo(outTradeNo: string): ValidationResult {
  if (!outTradeNo || typeof outTradeNo !== 'string') {
    return { valid: false, message: '商户订单号不能为空' };
  }

  // 商户订单号格式验证
  const outTradeNoRegex = /^PAY_\d{13}_\d{5}$/;
  if (!outTradeNoRegex.test(outTradeNo)) {
    return { valid: false, message: '商户订单号格式不正确' };
  }

  return { valid: true };
}

// 验证支付状态
export function validatePaymentStatus(status: string): ValidationResult {
  const validStatuses = ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED'];
  
  if (!status || !validStatuses.includes(status)) {
    return { 
      valid: false, 
      message: `无效的支付状态，必须是以下之一: ${validStatuses.join(', ')}` 
    };
  }

  return { valid: true };
}

// 验证支付方式
export function validatePaymentMethod(method: string): ValidationResult {
  const validMethods = ['WECHAT_PAY', 'ALIPAY'];
  
  if (!method || !validMethods.includes(method)) {
    return { 
      valid: false, 
      message: `无效的支付方式，必须是以下之一: ${validMethods.join(', ')}` 
    };
  }

  return { valid: true };
}

// 验证套餐参数
export function validatePackageParams(params: {
  name?: string;
  amount?: number;
  points?: number;
  bonusPoints?: number;
  description?: string;
}): ValidationResult {
  const errors: string[] = [];

  // 验证套餐名称
  if (params.name !== undefined) {
    if (!params.name || typeof params.name !== 'string' || params.name.trim().length === 0) {
      errors.push('套餐名称不能为空');
    } else if (params.name.length > 100) {
      errors.push('套餐名称不能超过100个字符');
    }
  }

  // 验证价格
  if (params.amount !== undefined) {
    if (typeof params.amount !== 'number' || params.amount <= 0) {
      errors.push('套餐价格必须是正数');
    } else {
      const amountValidation = validateAmount(params.amount);
      if (!amountValidation.valid) {
        errors.push(amountValidation.message!);
      }
    }
  }

  // 验证积分
  if (params.points !== undefined) {
    if (!Number.isInteger(params.points) || params.points <= 0) {
      errors.push('套餐积分必须是正整数');
    }
  }

  // 验证赠送积分
  if (params.bonusPoints !== undefined) {
    if (!Number.isInteger(params.bonusPoints) || params.bonusPoints < 0) {
      errors.push('套餐赠送积分必须是非负整数');
    }
  }

  // 验证描述
  if (params.description !== undefined && params.description !== null) {
    if (typeof params.description !== 'string') {
      errors.push('套餐描述必须是字符串');
    } else if (params.description.length > 500) {
      errors.push('套餐描述不能超过500个字符');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length > 0 ? errors.join('; ') : undefined
  };
}

// 验证退款参数
export function validateRefundParams(params: {
  orderNo?: string;
  refundAmount?: number;
  refundReason?: string;
}): ValidationResult {
  const errors: string[] = [];

  // 验证订单号
  if (!params.orderNo) {
    errors.push('订单号不能为空');
  } else {
    const orderNoValidation = validateOrderNo(params.orderNo);
    if (!orderNoValidation.valid) {
      errors.push(orderNoValidation.message!);
    }
  }

  // 验证退款金额
  if (params.refundAmount !== undefined) {
    if (typeof params.refundAmount !== 'number' || params.refundAmount <= 0) {
      errors.push('退款金额必须是正数');
    } else if (params.refundAmount > PAYMENT_CONFIG.ORDER.MAX_AMOUNT) {
      errors.push(`退款金额不能超过${PAYMENT_CONFIG.ORDER.MAX_AMOUNT}元`);
    }
  }

  // 验证退款原因
  if (params.refundReason !== undefined && params.refundReason !== null) {
    if (typeof params.refundReason !== 'string') {
      errors.push('退款原因必须是字符串');
    } else if (params.refundReason.length > 200) {
      errors.push('退款原因不能超过200个字符');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length > 0 ? errors.join('; ') : undefined
  };
}

// 验证分页参数
export function validatePaginationParams(params: {
  page?: number;
  limit?: number;
}): ValidationResult {
  const errors: string[] = [];

  // 验证页码
  if (params.page !== undefined) {
    if (!Number.isInteger(params.page) || params.page < 1) {
      errors.push('页码必须是大于0的整数');
    }
  }

  // 验证每页数量
  if (params.limit !== undefined) {
    if (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100) {
      errors.push('每页数量必须是1-100之间的整数');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length > 0 ? errors.join('; ') : undefined
  };
}

// 验证微信支付回调头部
export function validateWechatNotifyHeaders(headers: Record<string, string>): ValidationResult {
  const errors: string[] = [];
  const requiredHeaders = [
    'wechatpay-timestamp',
    'wechatpay-nonce',
    'wechatpay-signature',
    'wechatpay-serial'
  ];

  for (const header of requiredHeaders) {
    if (!headers[header] && !headers[header.toLowerCase()]) {
      errors.push(`缺少必需的头部: ${header}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length > 0 ? errors.join('; ') : undefined
  };
}

// 验证时间范围
export function validateDateRange(startDate?: Date, endDate?: Date): ValidationResult {
  const errors: string[] = [];

  if (startDate && (!(startDate instanceof Date) || isNaN(startDate.getTime()))) {
    errors.push('开始日期格式不正确');
  }

  if (endDate && (!(endDate instanceof Date) || isNaN(endDate.getTime()))) {
    errors.push('结束日期格式不正确');
  }

  if (startDate && endDate && startDate > endDate) {
    errors.push('开始日期不能晚于结束日期');
  }

  // 验证时间范围不能超过1年
  if (startDate && endDate) {
    const oneYear = 365 * 24 * 60 * 60 * 1000; // 1年的毫秒数
    if (endDate.getTime() - startDate.getTime() > oneYear) {
      errors.push('查询时间范围不能超过1年');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length > 0 ? errors.join('; ') : undefined
  };
}

// 验证JSON字符串
export function validateJsonString(jsonStr: string): ValidationResult {
  if (!jsonStr || typeof jsonStr !== 'string') {
    return { valid: false, message: 'JSON字符串不能为空' };
  }

  try {
    JSON.parse(jsonStr);
    return { valid: true };
  } catch (error) {
    return { valid: false, message: 'JSON格式不正确' };
  }
}

// 通用字符串验证
export function validateString(
  value: string, 
  fieldName: string, 
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  } = {}
): ValidationResult {
  const errors: string[] = [];

  // 必填验证
  if (options.required && (!value || value.trim().length === 0)) {
    errors.push(`${fieldName}不能为空`);
    return { valid: false, message: errors[0] };
  }

  // 如果不是必填且值为空，则跳过其他验证
  if (!value && !options.required) {
    return { valid: true };
  }

  // 长度验证
  if (options.minLength && value.length < options.minLength) {
    errors.push(`${fieldName}长度不能少于${options.minLength}个字符`);
  }

  if (options.maxLength && value.length > options.maxLength) {
    errors.push(`${fieldName}长度不能超过${options.maxLength}个字符`);
  }

  // 格式验证
  if (options.pattern && !options.pattern.test(value)) {
    errors.push(`${fieldName}格式不正确`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length > 0 ? errors.join('; ') : undefined
  };
} 