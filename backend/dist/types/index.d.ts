import { Request } from 'express';
export interface UserPayload {
    id: string;
    username: string;
    email?: string | null;
}
export interface SimpleUserPayload {
    userId: string;
}
export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
    };
}
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
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
export interface LoginRequest {
    username: string;
    password: string;
}
export interface RegisterRequest {
    username: string;
    password: string;
    email?: string;
}
export interface TokenResponse {
    token: string;
    refreshToken: string;
    expiresIn: string;
    user: UserPayload;
}
export interface ChatRequest {
    model: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    temperature?: number;
    maxTokens?: number;
}
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
export declare const SUPPORTED_MODELS: {
    readonly claude: readonly [{
        readonly id: "claude-sonnet-4-20250514-thinking";
        readonly name: "Claude Sonnet 4 (Thinking)";
        readonly category: "general";
    }, {
        readonly id: "claude-3-7-sonnet-thinking";
        readonly name: "Claude 3.7 Sonnet (Thinking)";
        readonly category: "general";
    }, {
        readonly id: "claude-opus-4-20250514-thinking";
        readonly name: "Claude Opus 4 (Thinking)";
        readonly category: "general";
    }, {
        readonly id: "claude-3-7-sonnet-20250219";
        readonly name: "Claude 3.7 Sonnet";
        readonly category: "general";
    }, {
        readonly id: "claude-sonnet-4-20250514";
        readonly name: "Claude Sonnet 4";
        readonly category: "general";
    }];
    readonly gemini: readonly [{
        readonly id: "gemini-2.5-flash-preview-04-17-thinking";
        readonly name: "Gemini 2.5 Flash (Thinking)";
        readonly category: "general";
    }, {
        readonly id: "gemini-2.5-flash-preview-04-17";
        readonly name: "Gemini 2.5 Flash";
        readonly category: "general";
    }, {
        readonly id: "gemini-2.5-pro-preview-06-05";
        readonly name: "Gemini 2.5 Pro";
        readonly category: "general";
    }, {
        readonly id: "gemini-2.5-pro-preview-06-05-thinking";
        readonly name: "Gemini 2.5 Pro (Thinking)";
        readonly category: "general";
    }];
    readonly openai: readonly [{
        readonly id: "chatgpt-4o-latest";
        readonly name: "ChatGPT 4o Latest";
        readonly category: "general";
    }, {
        readonly id: "o3-mini";
        readonly name: "O3 Mini";
        readonly category: "general";
    }];
};
export declare const PROGRAMMING_LANGUAGES: readonly [{
    readonly value: "python";
    readonly label: "Python";
}, {
    readonly value: "javascript";
    readonly label: "JavaScript";
}, {
    readonly value: "java";
    readonly label: "Java";
}, {
    readonly value: "cpp";
    readonly label: "C++";
}, {
    readonly value: "c";
    readonly label: "C";
}, {
    readonly value: "csharp";
    readonly label: "C#";
}, {
    readonly value: "go";
    readonly label: "Go";
}, {
    readonly value: "rust";
    readonly label: "Rust";
}, {
    readonly value: "typescript";
    readonly label: "TypeScript";
}, {
    readonly value: "kotlin";
    readonly label: "Kotlin";
}, {
    readonly value: "swift";
    readonly label: "Swift";
}, {
    readonly value: "php";
    readonly label: "PHP";
}, {
    readonly value: "ruby";
    readonly label: "Ruby";
}, {
    readonly value: "scala";
    readonly label: "Scala";
}];
//# sourceMappingURL=index.d.ts.map