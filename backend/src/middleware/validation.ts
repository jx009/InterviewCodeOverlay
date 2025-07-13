import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ResponseUtils } from '../utils/response';

/**
 * 通用请求验证中间件
 * 处理express-validator验证结果
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return ResponseUtils.error(
      res, 
      Array.isArray(errorMessages) && errorMessages.length > 0 
        ? errorMessages[0] 
        : '请求参数验证失败',
      400
    );
  }
  
  next();
}; 