export interface Solution {
  initial_thoughts: string[]
  thought_steps: string[]
  description: string
  code: string
}

export interface SolutionsResponse {
  [key: string]: Solution
}

// 选择题信息
export interface MultipleChoiceQuestion {
  question_number: string;
  question_text: string;
  options: string[];
  correct_answer?: string;
}

// 选择题答案
export interface MultipleChoiceAnswer {
  question_number: string;
  answer: string;
  reasoning?: string;
}

export interface ProblemStatementData {
  type?: 'programming' | 'multiple_choice';
  problem_statement: string
  input_format?: {
    description: string
    parameters: any[]
  }
  output_format?: {
    description: string
    type: string
    subtype: string
  }
  complexity?: {
    time: string
    space: string
  }
  test_cases?: any[]
  validation_type?: string
  difficulty?: string
  // 选择题特有字段
  multiple_choice_questions?: MultipleChoiceQuestion[]
}

// 解决方案响应格式
export interface SolutionData {
  type?: 'programming' | 'multiple_choice';
  code?: string;
  thoughts?: string[];
  time_complexity?: string;
  space_complexity?: string;
  // 选择题答案
  answers?: MultipleChoiceAnswer[];
}
