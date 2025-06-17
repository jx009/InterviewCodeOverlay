"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROGRAMMING_LANGUAGES = exports.SUPPORTED_MODELS = void 0;
exports.SUPPORTED_MODELS = {
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
};
exports.PROGRAMMING_LANGUAGES = [
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
];
//# sourceMappingURL=index.js.map