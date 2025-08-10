import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ResponseUtils } from '../utils/response';

/**
 * 通用请求验证中间件
 * 用于验证express-validator规则
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return ResponseUtils.error(
      res, 
      `请求验证失败: ${errors.array().map(err => err.msg).join(', ')}`,
      400
    );
  }
  
  next();
}; 