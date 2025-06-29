import { Request } from 'express';

// 用户相关类型
export interface UserPayload {
  id: number;
  username: string;
  email?: string | null;
}

// 简化的用户认证信息（Cursor风格）
export interface SimpleUserPayload {
  userId: number;
}

// 更新AuthenticatedRequest以匹配新的认证中间件
export interface AuthenticatedRequest extends Request {
  user?: { userId: number };
}

// 题目类型枚举
export type QuestionType = 'programming' | 'multiple_choice';

// 单个选择题信息
export interface MultipleChoiceQuestion {
  question_number: string;  // 题号，如 "1", "2", "A", "B" 等
  question_text: string;
  options: string[];        // 选项 A, B, C, D 等
  correct_answer?: string;  // 正确答案
}

// 题目信息结构
export interface ProblemInfo {
  type: QuestionType;
  problem_statement: string;
  constraints?: string;
  example_input?: string;
  example_output?: string;
  // 选择题特有字段 - 支持多题
  multiple_choice_questions?: MultipleChoiceQuestion[];
}

// 响应数据结构
export interface ProgrammingResponse {
  type: 'programming';
  code: string;
  thoughts: string[];
  time_complexity: string;
  space_complexity: string;
}

// 单个选择题的答案
export interface MultipleChoiceAnswer {
  question_number: string;
  answer: string;           // 选择的答案，如 "A", "B", "C", "D"
  reasoning?: string;       // 该题的解题思路
}

export interface MultipleChoiceResponse {
  type: 'multiple_choice';
  answers: MultipleChoiceAnswer[];  // 所有题目的答案数组
  thoughts: string[];               // 整体思路分析
  // time_complexity 和 space_complexity 留空
}

export type AIResponse = ProgrammingResponse | MultipleChoiceResponse;

// AI模型相关类型
export interface AIModel {
  id: string;
  modelId: string;
  name: string;
  provider: 'claude' | 'gemini' | 'openai';
  category: 'extraction' | 'solution' | 'debugging' | 'general';
  isActive: boolean;
  priority: number;
}

export interface UserConfigData {
  selectedProvider: 'claude' | 'gemini' | 'openai';
  // 分离的模型配置
  programmingModel: string;
  multipleChoiceModel: string;
  // 保留向后兼容的字段
  extractionModel?: string;
  solutionModel?: string;
  debuggingModel?: string;
  language: string;
  opacity: number;
  showCopyButton: boolean;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 登录请求类型
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

// Token响应类型
export interface TokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: string;
  user: UserPayload;
}

// AI Chat请求类型
export interface ChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
}

// 使用统计类型
export interface UsageStats {
  totalRequests: number;
  requestsByModel: Record<string, number>;
  requestsByAction: Record<string, number>;
  tokensUsed: number;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
}

// 支持的AI模型配置
export const SUPPORTED_MODELS = {
  claude: [
    { id: 'claude-sonnet-4-20250514-thinking', name: 'Claude Sonnet 4 (Thinking)', category: 'general' },
    { id: 'claude-opus-4-20250514-thinking', name: 'Claude Opus 4 (Thinking)', category: 'general' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', category: 'general' }
  ],
  gemini: [
    { id: 'gemini-2.5-flash-preview-04-17-thinking', name: 'Gemini 2.5 Flash (Thinking)', category: 'general' },
    { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash', category: 'general' },
    { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro', category: 'general' },
    { id: 'gemini-2.5-pro-preview-06-05-thinking', name: 'Gemini 2.5 Pro (Thinking)', category: 'general' }
  ],
  openai: [
    { id: 'chatgpt-4o-latest', name: 'ChatGPT 4o Latest', category: 'general' },
    { id: 'o3-mini', name: 'O3 Mini', category: 'general' }
  ]
} as const;

export const PROGRAMMING_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'scala', label: 'Scala' }
] as const;

// 扩展Express Request类型
declare module 'express' {
  interface Request {
    userId?: number;
    user?: {
      userId: number;
      username?: string;
      email?: string;
      role?: string;
    };
  }
} 