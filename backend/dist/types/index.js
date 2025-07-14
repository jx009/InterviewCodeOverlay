"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROGRAMMING_LANGUAGES = exports.SUPPORTED_MODELS = void 0;
exports.SUPPORTED_MODELS = {
    claude: [
        { id: 'claude-sonnet-4-20250514', name: 'claude-4-sonnet', category: 'general' }
    ],
    gemini: [
        { id: 'gemini-2.5-pro-deepsearch', name: 'gemini-pro-2.5', category: 'general' },
        { id: 'gemini-2.5-flash-preview-04-17', name: 'gemini-flash-2.5', category: 'general' }
    ],
    openai: [
        { id: 'gpt-4o', name: 'gpt-4o', category: 'general' },
        { id: 'gpt-4o-mini', name: 'gpt-4o-mini', category: 'general' },
        { id: 'o4-mini-high-all', name: 'o4-mini-high', category: 'general' },
        { id: 'o4-mini-all', name: 'o4-mini', category: 'general' }
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