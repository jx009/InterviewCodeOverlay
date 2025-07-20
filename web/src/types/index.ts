export interface User {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  points?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  displayName: string;
  description?: string;
  isActive: boolean;
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

// 单个选择题的答案
export interface MultipleChoiceAnswer {
  question_number: string;
  answer: string;           // 选择的答案，如 "A", "B", "C", "D"
  reasoning?: string;       // 该题的解题思路
}

// 编程题响应格式
export interface ProgrammingResponse {
  type: 'programming';
  code: string;
  thoughts: string[];
  time_complexity: string;
  space_complexity: string;
}

// 选择题响应格式
export interface MultipleChoiceResponse {
  type: 'multiple_choice';
  answers: MultipleChoiceAnswer[];  // 所有题目的答案数组
  thoughts: string[];               // 整体思路分析
  // time_complexity 和 space_complexity 留空
}

// 通用解决方案响应
export type SolutionResponse = ProgrammingResponse | MultipleChoiceResponse;

export interface UserConfig {
  aiModel: string;
  programmingModel?: string;    // 编程题专用模型
  multipleChoiceModel?: string; // 选择题专用模型
  language: string;
  theme: 'light' | 'dark' | 'system';
  shortcuts: {
    takeScreenshot: string;
    openQueue: string;
    openSettings: string;
  };
  display: {
    opacity: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    autoHide: boolean;
    hideDelay: number;
  };
  processing: {
    autoProcess: boolean;
    saveScreenshots: boolean;
    compressionLevel: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
} 