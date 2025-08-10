// 积分系统类型定义
import { QuestionType as PrismaQuestionType, TransactionType as PrismaTransactionType } from '@prisma/client';

// 使用Prisma生成的枚举类型
export type QuestionType = PrismaQuestionType;
export type TransactionType = PrismaTransactionType;

// 枚举值常量，方便使用
export const QuestionType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE' as PrismaQuestionType,
  PROGRAMMING: 'PROGRAMMING' as PrismaQuestionType
} as const;

export const TransactionType = {
  CONSUME: 'CONSUME' as PrismaTransactionType,
  RECHARGE: 'RECHARGE' as PrismaTransactionType,
  REFUND: 'REFUND' as PrismaTransactionType,
  REWARD: 'REWARD' as PrismaTransactionType
} as const;

export interface PointCheckResult {
  sufficient: boolean;
  currentPoints: number;
  requiredPoints: number;
  message: string;
}

export interface ConsumePointsResult {
  success: boolean;
  newBalance: number;
  transactionId: number;
  message: string;
}

export interface ModelPointConfig {
  id: number;
  modelName: string;
  questionType: QuestionType;
  cost: number;
  isActive: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PointTransaction {
  id: number;
  userId: number;
  transactionType: TransactionType;
  amount: number;
  balanceAfter: number;
  modelName?: string | null;
  questionType?: QuestionType | null;
  description?: string | null;
  metadata?: string | null;
  createdAt: Date;
}

export interface UserWithPoints {
  id: number;
  username: string;
  email?: string | null;
  points: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} 