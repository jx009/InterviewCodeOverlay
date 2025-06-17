import { Request } from 'express';

// 用户相关类型
export interface UserPayload {
  id: string;
  username: string;
  email?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

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
  extractionModel: string;
  solutionModel: string;
  debuggingModel: string;
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
    { id: 'claude-3-7-sonnet-thinking', name: 'Claude 3.7 Sonnet (Thinking)', category: 'general' },
    { id: 'claude-opus-4-20250514-thinking', name: 'Claude Opus 4 (Thinking)', category: 'general' },
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', category: 'general' },
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