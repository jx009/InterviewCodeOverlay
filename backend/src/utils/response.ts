import { Response } from 'express';
import { ApiResponse } from '../types';

export class ResponseUtils {
  // 成功响应
  static success<T>(res: Response, data?: T, message?: string): void {
    res.json({
      success: true,
      data,
      message
    } as ApiResponse<T>);
  }

  // 错误响应
  static error(res: Response, error: string, statusCode: number = 400): void {
    res.status(statusCode).json({
      success: false,
      error
    } as ApiResponse);
  }

  // 验证错误响应
  static validationError(res: Response, errors: string[]): void {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      data: { errors }
    } as ApiResponse);
  }

  // 未授权响应
  static unauthorized(res: Response, message?: string): void {
    res.status(401).json({
      success: false,
      error: message || '未授权访问'
    } as ApiResponse);
  }

  // 禁止访问响应
  static forbidden(res: Response, message?: string): void {
    res.status(403).json({
      success: false,
      error: message || '禁止访问'
    } as ApiResponse);
  }

  // 未找到响应
  static notFound(res: Response, message?: string): void {
    res.status(404).json({
      success: false,
      error: message || '资源未找到'
    } as ApiResponse);
  }

  // 服务器内部错误响应
  static internalError(res: Response, message?: string): void {
    res.status(500).json({
      success: false,
      error: message || '服务器内部错误'
    } as ApiResponse);
  }

  // 分页响应
  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ): void {
    res.json({
      success: true,
      data,
      message,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    } as ApiResponse<T[]>);
  }
} 