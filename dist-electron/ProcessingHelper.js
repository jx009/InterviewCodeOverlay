"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingHelper = void 0;
// ProcessingHelper.ts
const node_fs_1 = __importDefault(require("node:fs"));
const axios = __importStar(require("axios"));
const openai_1 = require("openai");
const ConfigHelper_1 = require("./ConfigHelper");
// 统一的API密钥 - 用户无需配置
const ISMAQUE_API_KEY = "sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP";
// 使用ismaque.org API的统一客户端，支持OpenAI、Gemini和Claude
class ProcessingHelper {
    constructor(deps) {
        this.ismaqueClient = null;
        // AbortControllers for API requests
        this.currentProcessingAbortController = null;
        this.currentExtraProcessingAbortController = null;
        this.deps = deps;
        this.screenshotHelper = deps.getScreenshotHelper();
        // Initialize AI client
        this.initializeAIClient();
        // Listen for config changes to re-initialize the AI client (model changes)
        ConfigHelper_1.configHelper.on('config-updated', () => {
            this.initializeAIClient();
        });
    }
    /**
     * Initialize the AI client with fixed API key
     */
    initializeAIClient() {
        try {
            // 使用固定的API密钥初始化ismaque.org客户端
            this.ismaqueClient = new openai_1.OpenAI({
                apiKey: ISMAQUE_API_KEY,
                baseURL: "https://ismaque.org/v1", // ismaque.org API endpoint
                // timeout: 60000, // 取消超时限制
                maxRetries: 2 // Retry up to 2 times
            });
            console.log("Ismaque.org API client initialized successfully with built-in key");
        }
        catch (error) {
            console.error("Failed to initialize AI client:", error);
            this.ismaqueClient = null;
        }
    }
    async waitForInitialization(mainWindow) {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds total
        while (attempts < maxAttempts) {
            const isInitialized = await mainWindow.webContents.executeJavaScript("window.__IS_INITIALIZED__");
            if (isInitialized)
                return;
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
        }
        throw new Error("App failed to initialize after 5 seconds");
    }
    async getCredits() {
        const mainWindow = this.deps.getMainWindow();
        if (!mainWindow)
            return 999; // Unlimited credits in this version
        try {
            await this.waitForInitialization(mainWindow);
            return 999; // Always return sufficient credits to work
        }
        catch (error) {
            console.error("Error getting credits:", error);
            return 999; // Unlimited credits as fallback
        }
    }
    async getLanguage() {
        try {
            // Get language from config
            const config = ConfigHelper_1.configHelper.loadConfig();
            if (config.language) {
                return config.language;
            }
            // Fallback to window variable if config doesn't have language
            const mainWindow = this.deps.getMainWindow();
            if (mainWindow) {
                try {
                    await this.waitForInitialization(mainWindow);
                    const language = await mainWindow.webContents.executeJavaScript("window.__LANGUAGE__");
                    if (typeof language === "string" &&
                        language !== undefined &&
                        language !== null) {
                        return language;
                    }
                }
                catch (err) {
                    console.warn("Could not get language from window", err);
                }
            }
            // Default fallback
            return "python";
        }
        catch (error) {
            console.error("Error getting language:", error);
            return "python";
        }
    }
    async processScreenshots() {
        const mainWindow = this.deps.getMainWindow();
        if (!mainWindow)
            return;
        const config = ConfigHelper_1.configHelper.loadConfig();
        // Verify we have a valid AI client (should always be available now)
        if (!this.ismaqueClient) {
            this.initializeAIClient();
            if (!this.ismaqueClient) {
                console.error("Ismaque.org client not initialized");
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.API_KEY_INVALID);
                return;
            }
        }
        const view = this.deps.getView();
        console.log("Processing screenshots in view:", view);
        if (view === "queue") {
            mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START);
            const screenshotQueue = this.screenshotHelper.getScreenshotQueue();
            console.log("Processing main queue screenshots:", screenshotQueue);
            // Check if the queue is empty
            if (!screenshotQueue || screenshotQueue.length === 0) {
                console.log("No screenshots found in queue");
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
                return;
            }
            // Check that files actually exist
            const existingScreenshots = screenshotQueue.filter(path => node_fs_1.default.existsSync(path));
            if (existingScreenshots.length === 0) {
                console.log("Screenshot files don't exist on disk");
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
                return;
            }
            try {
                // Initialize AbortController
                this.currentProcessingAbortController = new AbortController();
                const { signal } = this.currentProcessingAbortController;
                const screenshots = await Promise.all(existingScreenshots.map(async (path) => {
                    try {
                        return {
                            path,
                            preview: await this.screenshotHelper.getImagePreview(path),
                            data: node_fs_1.default.readFileSync(path).toString('base64')
                        };
                    }
                    catch (err) {
                        console.error(`Error reading screenshot ${path}:`, err);
                        return null;
                    }
                }));
                // Filter out any nulls from failed screenshots
                const validScreenshots = screenshots.filter(Boolean);
                if (validScreenshots.length === 0) {
                    throw new Error("Failed to load screenshot data");
                }
                const result = await this.processScreenshotsHelper(validScreenshots, signal);
                if (!result.success) {
                    console.log("Processing failed:", result.error);
                    if (result.error?.includes("401") || result.error?.includes("invalid") || result.error?.includes("unauthorized")) {
                        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.API_KEY_INVALID);
                    }
                    else {
                        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, result.error);
                    }
                    // Reset view back to queue on error
                    console.log("Resetting view to queue due to error");
                    this.deps.setView("queue");
                    return;
                }
                // Only set view to solutions if processing succeeded
                console.log("Setting view to solutions after successful processing");
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS, result.data);
                this.deps.setView("solutions");
            }
            catch (error) {
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, error);
                console.error("Processing error:", error);
                if (axios.isCancel(error)) {
                    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, "处理已被用户取消。");
                }
                else {
                    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, error.message || "服务器错误，请重试。");
                }
                // Reset view back to queue on error
                console.log("Resetting view to queue due to error");
                this.deps.setView("queue");
            }
            finally {
                this.currentProcessingAbortController = null;
            }
        }
        else {
            // view == 'solutions'
            const extraScreenshotQueue = this.screenshotHelper.getExtraScreenshotQueue();
            console.log("Processing extra queue screenshots:", extraScreenshotQueue);
            // Check if the extra queue is empty
            if (!extraScreenshotQueue || extraScreenshotQueue.length === 0) {
                console.log("No extra screenshots found in queue");
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
                return;
            }
            // Check that files actually exist
            const existingExtraScreenshots = extraScreenshotQueue.filter(path => node_fs_1.default.existsSync(path));
            if (existingExtraScreenshots.length === 0) {
                console.log("Extra screenshot files don't exist on disk");
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
                return;
            }
            mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START);
            // Initialize AbortController
            this.currentExtraProcessingAbortController = new AbortController();
            const { signal } = this.currentExtraProcessingAbortController;
            try {
                // Get all screenshots (both main and extra) for processing
                const allPaths = [
                    ...this.screenshotHelper.getScreenshotQueue(),
                    ...existingExtraScreenshots
                ];
                const screenshots = await Promise.all(allPaths.map(async (path) => {
                    try {
                        if (!node_fs_1.default.existsSync(path)) {
                            console.warn(`Screenshot file does not exist: ${path}`);
                            return null;
                        }
                        return {
                            path,
                            preview: await this.screenshotHelper.getImagePreview(path),
                            data: node_fs_1.default.readFileSync(path).toString('base64')
                        };
                    }
                    catch (err) {
                        console.error(`Error reading screenshot ${path}:`, err);
                        return null;
                    }
                }));
                // Filter out any nulls from failed screenshots
                const validScreenshots = screenshots.filter(Boolean);
                if (validScreenshots.length === 0) {
                    throw new Error("Failed to load screenshot data for debugging");
                }
                console.log("Combined screenshots for processing:", validScreenshots.map((s) => s.path));
                const result = await this.processExtraScreenshotsHelper(validScreenshots, signal);
                if (result.success) {
                    this.deps.setHasDebugged(true);
                    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS, result.data);
                }
                else {
                    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, result.error);
                }
            }
            catch (error) {
                if (axios.isCancel(error)) {
                    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, "额外处理已被用户取消。");
                }
                else {
                    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, error.message);
                }
            }
            finally {
                this.currentExtraProcessingAbortController = null;
            }
        }
    }
    async processScreenshotsHelper(screenshots, signal) {
        try {
            const config = ConfigHelper_1.configHelper.loadConfig();
            const language = await this.getLanguage();
            const mainWindow = this.deps.getMainWindow();
            // Step 1: Extract problem info using AI Vision API
            const imageDataList = screenshots.map(screenshot => screenshot.data);
            // Update the user on progress
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: "正在从截图中分析题目...",
                    progress: 20
                });
            }
            let problemInfo;
            // API client should always be available now
            if (!this.ismaqueClient) {
                return {
                    success: false,
                    error: "API客户端初始化失败，请重启应用。"
                };
            }
            // 获取对应的模型名称
            const extractionModel = this.getModelName(config.extractionModel, config.apiProvider);
            // Use unified API for processing
            const messages = [
                {
                    role: "system",
                    content: "你是一个编程题目解释助手。请严格按照要求分析编程题目的截图，提取所有相关信息。\n\n重要要求：\n1. 必须只返回纯JSON格式，不要任何额外的文字、解释或markdown标记\n2. JSON必须包含以下字段：problem_statement, constraints, example_input, example_output\n3. 如果某个字段无法从截图中获取，请设置为空字符串\n4. 确保返回的是有效的JSON格式\n\n示例输出格式：\n{\"problem_statement\":\"题目描述\",\"constraints\":\"约束条件\",\"example_input\":\"示例输入\",\"example_output\":\"示例输出\"}"
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `从这些截图中提取编程题目详情、输入描述、输出描述以及示例，以严格的JSON格式返回。我们将使用${language}语言来解决这个问题。请确保返回的是有效的JSON格式，不要包含任何其他文本。`
                        },
                        ...imageDataList.map(data => ({
                            type: "image_url",
                            image_url: { url: `data:image/png;base64,${data}` }
                        }))
                    ]
                }
            ];
            // Send to Ismaque.org API
            const extractionResponse = await this.ismaqueClient.chat.completions.create({
                model: extractionModel,
                messages: messages,
                max_tokens: 4000,
                temperature: 0.1 // 降低温度以提高输出稳定性
            });
            // Parse the response with improved error handling
            try {
                const responseText = extractionResponse.choices[0].message.content;
                console.log("Raw API response:", responseText); // 添加调试输出
                // More comprehensive cleaning of the response
                let jsonText = responseText.trim();
                // Remove markdown code blocks
                jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                // Remove any leading/trailing non-JSON text
                const jsonStart = jsonText.indexOf('{');
                const jsonEnd = jsonText.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                    jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
                }
                // Try to parse the JSON
                problemInfo = JSON.parse(jsonText);
                // Validate required fields and provide defaults if missing
                problemInfo = {
                    problem_statement: problemInfo.problem_statement || "无法从截图中提取题目描述",
                    constraints: problemInfo.constraints || "无法从截图中提取约束条件",
                    example_input: problemInfo.example_input || "无法从截图中提取示例输入",
                    example_output: problemInfo.example_output || "无法从截图中提取示例输出"
                };
                console.log("Parsed problem info:", problemInfo); // 添加调试输出
            }
            catch (error) {
                console.error("Error parsing API response:", error);
                console.error("Raw response text:", extractionResponse.choices[0].message.content);
                // 尝试备用解析方法：使用正则表达式提取关键信息
                try {
                    const responseText = extractionResponse.choices[0].message.content;
                    console.log("Attempting fallback parsing...");
                    // 尝试从响应中提取关键信息，即使不是完整的JSON
                    const extractField = (fieldName, text) => {
                        const patterns = [
                            new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)"`, 'i'),
                            new RegExp(`${fieldName}[:：]\\s*(.+?)(?=\\n|$)`, 'i'),
                            new RegExp(`【${fieldName}】\\s*(.+?)(?=\\n|【|$)`, 'i')
                        ];
                        for (const pattern of patterns) {
                            const match = text.match(pattern);
                            if (match && match[1]) {
                                return match[1].trim();
                            }
                        }
                        return "";
                    };
                    problemInfo = {
                        problem_statement: extractField("problem_statement", responseText) ||
                            extractField("题目描述", responseText) ||
                            "无法从截图中提取题目描述",
                        constraints: extractField("constraints", responseText) ||
                            extractField("约束条件", responseText) ||
                            "无法从截图中提取约束条件",
                        example_input: extractField("example_input", responseText) ||
                            extractField("示例输入", responseText) ||
                            "无法从截图中提取示例输入",
                        example_output: extractField("example_output", responseText) ||
                            extractField("示例输出", responseText) ||
                            "无法从截图中提取示例输出"
                    };
                    console.log("Fallback parsing successful:", problemInfo);
                }
                catch (fallbackError) {
                    console.error("Fallback parsing also failed:", fallbackError);
                    // 如果备用解析也失败，提供更详细的错误信息
                    return {
                        success: false,
                        error: `解析题目信息失败：${error.message}。API返回内容格式异常，无法提取题目信息。请确保截图清晰完整，或尝试重新截图后重试。`
                    };
                }
            }
            // Update the user on progress
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: "题目分析成功，正在准备生成解决方案...",
                    progress: 40
                });
            }
            // Store problem info in AppState
            this.deps.setProblemInfo(problemInfo);
            // Send first success event
            if (mainWindow) {
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED, problemInfo);
                // Generate solutions after successful extraction
                const solutionsResult = await this.generateSolutionsHelper(signal);
                if (solutionsResult.success) {
                    // Clear any existing extra screenshots before transitioning to solutions view
                    this.screenshotHelper.clearExtraScreenshotQueue();
                    // Final progress update
                    mainWindow.webContents.send("processing-status", {
                        message: "解决方案生成成功",
                        progress: 100
                    });
                    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS, solutionsResult.data);
                    return { success: true, data: solutionsResult.data };
                }
                else {
                    throw new Error(solutionsResult.error || "生成解决方案失败");
                }
            }
            return { success: false, error: "处理截图失败" };
        }
        catch (error) {
            // If the request was cancelled, don't retry
            if (axios.isCancel(error)) {
                return {
                    success: false,
                    error: "处理已被用户取消。"
                };
            }
            // Handle API errors specifically
            if (error?.response?.status === 401 || error?.status === 401) {
                return {
                    success: false,
                    error: "API访问错误，请联系开发者。"
                };
            }
            else if (error?.response?.status === 429 || error?.status === 429) {
                return {
                    success: false,
                    error: "API调用频率限制，请稍后重试。"
                };
            }
            else if (error?.response?.status === 500 || error?.status === 500) {
                return {
                    success: false,
                    error: "服务器错误，请稍后重试。"
                };
            }
            console.error("API Error Details:", error);
            return {
                success: false,
                error: error.message || "处理截图失败，请重试。"
            };
        }
    }
    async generateSolutionsHelper(signal) {
        try {
            const problemInfo = this.deps.getProblemInfo();
            const language = await this.getLanguage();
            const config = ConfigHelper_1.configHelper.loadConfig();
            const mainWindow = this.deps.getMainWindow();
            if (!problemInfo) {
                throw new Error("没有可用的题目信息");
            }
            // Update progress status
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: "正在创建最优解决方案和详细解释...",
                    progress: 60
                });
            }
            // Create prompt for solution generation (in Chinese) - 优化为ACM模式
            const promptText = `
为以下编程题目生成详细的解决方案：

题目描述：
${problemInfo.problem_statement}

约束条件：
${problemInfo.constraints || "未提供具体约束条件。"}

示例输入：
${problemInfo.example_input || "未提供示例输入。"}

示例输出：
${problemInfo.example_output || "未提供示例输出。"}

编程语言：${language}

请按照以下格式提供回复：
1. 代码：一个完整的ACM竞赛模式的${language}实现
2. 解题思路：关键洞察和方法推理的要点列表
3. 时间复杂度：O(X)格式，并提供详细解释（至少2句话）
4. 空间复杂度：O(X)格式，并提供详细解释（至少2句话）

**重要的代码格式要求：**
- 必须生成完整的ACM竞赛编程模式代码
- 对于Java语言，必须使用 "public class Main" 作为主类名
- 必须使用标准输入读取所有数据，不要使用预定义的变量或硬编码的测试数据
- 输入处理必须严格按照题目描述的输入格式来实现
- 代码必须是完整的、可以直接复制粘贴到在线判题系统运行的格式
- 包含适当的导入语句和必要的库引用

对于复杂度解释，请务必详细。例如："时间复杂度：O(n)，因为我们只需要遍历数组一次。这是最优的，因为我们需要至少检查每个元素一次才能找到解决方案。"或者"空间复杂度：O(n)，因为在最坏情况下，我们需要在哈希表中存储所有元素。额外空间使用量与输入规模成线性关系。"

你的解决方案应该：
- 完全符合ACM竞赛编程规范
- 正确处理输入输出格式
- 高效且有良好注释
- 处理边界情况
- 可以直接在各种在线判题平台运行
`;
            let responseContent;
            if (!this.ismaqueClient) {
                return {
                    success: false,
                    error: "API客户端初始化失败，请重启应用。"
                };
            }
            // 获取对应的模型名称
            const solutionModel = this.getModelName(config.solutionModel, config.apiProvider);
            // Send to Ismaque.org API
            const solutionResponse = await this.ismaqueClient.chat.completions.create({
                model: solutionModel,
                messages: [
                    { role: "system", content: "你是一位专业的编程面试助手。提供清晰、最优的解决方案和详细解释。" },
                    { role: "user", content: promptText }
                ],
                max_tokens: 4000,
                temperature: 0.2
            });
            responseContent = solutionResponse.choices[0].message.content;
            // Extract parts from the response
            const codeMatch = responseContent.match(/```(?:\w+)?\s*([\s\S]*?)```/);
            const code = codeMatch ? codeMatch[1].trim() : responseContent;
            // Extract thoughts, looking for bullet points or numbered lists
            const thoughtsRegex = /(?:解题思路|思路|关键洞察|推理|方法)[:：]([\s\S]*?)(?:时间复杂度|$)/i;
            const thoughtsMatch = responseContent.match(thoughtsRegex);
            let thoughts = [];
            if (thoughtsMatch && thoughtsMatch[1]) {
                // Extract bullet points or numbered items
                const bulletPoints = thoughtsMatch[1].match(/(?:^|\n)\s*(?:[-*•]|\d+\.)\s*(.*)/g);
                if (bulletPoints) {
                    thoughts = bulletPoints.map(point => point.replace(/^\s*(?:[-*•]|\d+\.)\s*/, '').trim()).filter(Boolean);
                }
                else {
                    // If no bullet points found, split by newlines and filter empty lines
                    thoughts = thoughtsMatch[1].split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean);
                }
            }
            // Extract complexity information
            const timeComplexityPattern = /时间复杂度[:：]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:空间复杂度|$))/i;
            const spaceComplexityPattern = /空间复杂度[:：]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:[A-Z]|$))/i;
            let timeComplexity = "O(n) - 线性时间复杂度，因为我们只需要遍历数组一次。每个元素只被处理一次，哈希表查找操作是O(1)的。";
            let spaceComplexity = "O(n) - 线性空间复杂度，因为我们在哈希表中存储元素。在最坏情况下，我们可能需要在找到解决方案对之前存储所有元素。";
            const timeMatch = responseContent.match(timeComplexityPattern);
            if (timeMatch && timeMatch[1]) {
                timeComplexity = timeMatch[1].trim();
                if (!timeComplexity.match(/O\([^)]+\)/i)) {
                    timeComplexity = `O(n) - ${timeComplexity}`;
                }
                else if (!timeComplexity.includes('-') && !timeComplexity.includes('因为')) {
                    const notationMatch = timeComplexity.match(/O\([^)]+\)/i);
                    if (notationMatch) {
                        const notation = notationMatch[0];
                        const rest = timeComplexity.replace(notation, '').trim();
                        timeComplexity = `${notation} - ${rest}`;
                    }
                }
            }
            const spaceMatch = responseContent.match(spaceComplexityPattern);
            if (spaceMatch && spaceMatch[1]) {
                spaceComplexity = spaceMatch[1].trim();
                if (!spaceComplexity.match(/O\([^)]+\)/i)) {
                    spaceComplexity = `O(n) - ${spaceComplexity}`;
                }
                else if (!spaceComplexity.includes('-') && !spaceComplexity.includes('因为')) {
                    const notationMatch = spaceComplexity.match(/O\([^)]+\)/i);
                    if (notationMatch) {
                        const notation = notationMatch[0];
                        const rest = spaceComplexity.replace(notation, '').trim();
                        spaceComplexity = `${notation} - ${rest}`;
                    }
                }
            }
            const formattedResponse = {
                code: code,
                thoughts: thoughts.length > 0 ? thoughts : ["基于效率和可读性的解决方案方法"],
                time_complexity: timeComplexity,
                space_complexity: spaceComplexity
            };
            return { success: true, data: formattedResponse };
        }
        catch (error) {
            if (axios.isCancel(error)) {
                return {
                    success: false,
                    error: "处理已被用户取消。"
                };
            }
            if (error?.response?.status === 401 || error?.status === 401) {
                return {
                    success: false,
                    error: "API访问错误，请联系开发者。"
                };
            }
            else if (error?.response?.status === 429 || error?.status === 429) {
                return {
                    success: false,
                    error: "API调用频率限制，请稍后重试。"
                };
            }
            console.error("Solution generation error:", error);
            return { success: false, error: error.message || "生成解决方案失败" };
        }
    }
    async processExtraScreenshotsHelper(screenshots, signal) {
        try {
            const problemInfo = this.deps.getProblemInfo();
            const language = await this.getLanguage();
            const config = ConfigHelper_1.configHelper.loadConfig();
            const mainWindow = this.deps.getMainWindow();
            if (!problemInfo) {
                throw new Error("没有可用的题目信息");
            }
            // Update progress status
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: "正在处理调试截图...",
                    progress: 30
                });
            }
            // Prepare the images for the API call
            const imageDataList = screenshots.map(screenshot => screenshot.data);
            let debugContent;
            if (!this.ismaqueClient) {
                return {
                    success: false,
                    error: "API客户端初始化失败，请重启应用。"
                };
            }
            // 获取对应的模型名称
            const debuggingModel = this.getModelName(config.debuggingModel, config.apiProvider);
            const messages = [
                {
                    role: "system",
                    content: `你是一位编程面试助手，帮助调试和改进解决方案。分析这些包含错误信息、错误输出或测试用例的截图，并提供详细的调试帮助，注意：截图中也可能只包含通过了多少用例，没有任何具体的测试用例，这种情况要考虑代码有哪些方面没考虑到，多考虑边界情况。

请按照以下格式提供回复：
1. 代码：修正后的完整ACM竞赛模式的${language}实现
2. 解题思路：关键修改和改进的要点列表
3. 时间复杂度：O(X)格式，并提供详细解释（至少2句话）
4. 空间复杂度：O(X)格式，并提供详细解释（至少2句话）
5. 修改说明：详细说明相比原代码进行了哪些修改和为什么需要这些修改

**重要的代码格式要求：**
- 必须生成完整的ACM竞赛编程模式代码
- 对于Java语言，必须使用 "public class Main" 作为主类名
- 必须使用标准输入读取所有数据，不要使用预定义的变量或硬编码的测试数据
- 输入处理必须严格按照题目描述的输入格式来实现
- 代码必须是完整的、可以直接复制粘贴到在线判题系统运行的格式
- 包含适当的导入语句和必要的库引用

对于复杂度解释，请务必详细。例如："时间复杂度：O(n)，因为我们只需要遍历数组一次。这是最优的，因为我们需要至少检查每个元素一次才能找到解决方案。"或者"空间复杂度：O(n)，因为在最坏情况下，我们需要在哈希表中存储所有元素。额外空间使用量与输入规模成线性关系。"

你的解决方案应该：
- 完全符合ACM竞赛编程规范
- 正确处理输入输出格式
- 高效且有良好注释
- 处理边界情况
- 可以直接在各种在线判题平台运行`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `我正在解决这个编程题目："${problemInfo.problem_statement}"，使用${language}语言。

题目约束：
${problemInfo.constraints || "未提供具体约束条件。"}

示例输入：
${problemInfo.example_input || "未提供示例输入。"}

示例输出：
${problemInfo.example_output || "未提供示例输出。"}

我需要调试或改进我的解决方案的帮助。这里是我的代码、错误或测试用例的截图。请提供详细分析，包括：
1. 修正后的完整ACM模式代码
2. 关键修改和改进的要点
3. 时间复杂度和空间复杂度分析
4. 详细的修改说明

请确保提供的修正代码是完整的ACM竞赛格式，可以直接在在线判题系统运行。`
                        },
                        ...imageDataList.map(data => ({
                            type: "image_url",
                            image_url: { url: `data:image/png;base64,${data}` }
                        }))
                    ]
                }
            ];
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: "正在分析代码并生成调试反馈...",
                    progress: 60
                });
            }
            const debugResponse = await this.ismaqueClient.chat.completions.create({
                model: debuggingModel,
                messages: messages,
                max_tokens: 4000,
                temperature: 0.2
            });
            debugContent = debugResponse.choices[0].message.content;
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: "调试分析完成",
                    progress: 100
                });
            }
            // Extract parts from the response (same logic as generateSolutionsHelper)
            const codeMatch = debugContent.match(/```(?:\w+)?\s*([\s\S]*?)```/);
            const code = codeMatch ? codeMatch[1].trim() : debugContent;
            // Extract thoughts, looking for bullet points or numbered lists
            const thoughtsRegex = /(?:解题思路|思路|关键洞察|推理|方法|修改|改进)[:：]([\s\S]*?)(?:时间复杂度|$)/i;
            const thoughtsMatch = debugContent.match(thoughtsRegex);
            let thoughts = [];
            if (thoughtsMatch && thoughtsMatch[1]) {
                // Extract bullet points or numbered items
                const bulletPoints = thoughtsMatch[1].match(/(?:^|\n)\s*(?:[-*•]|\d+\.)\s*(.*)/g);
                if (bulletPoints) {
                    thoughts = bulletPoints.map(point => point.replace(/^\s*(?:[-*•]|\d+\.)\s*/, '').trim()).filter(Boolean);
                }
                else {
                    // If no bullet points found, split by newlines and filter empty lines
                    thoughts = thoughtsMatch[1].split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean);
                }
            }
            // Extract complexity information
            const timeComplexityPattern = /时间复杂度[:：]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:空间复杂度|$))/i;
            const spaceComplexityPattern = /空间复杂度[:：]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:[A-Z]|$))/i;
            let timeComplexity = "O(n) - 线性时间复杂度，因为我们只需要遍历数组一次。每个元素只被处理一次，哈希表查找操作是O(1)的。";
            let spaceComplexity = "O(n) - 线性空间复杂度，因为我们在哈希表中存储元素。在最坏情况下，我们可能需要在找到解决方案对之前存储所有元素。";
            const timeMatch = debugContent.match(timeComplexityPattern);
            if (timeMatch && timeMatch[1]) {
                timeComplexity = timeMatch[1].trim();
                if (!timeComplexity.match(/O\([^)]+\)/i)) {
                    timeComplexity = `O(n) - ${timeComplexity}`;
                }
                else if (!timeComplexity.includes('-') && !timeComplexity.includes('因为')) {
                    const notationMatch = timeComplexity.match(/O\([^)]+\)/i);
                    if (notationMatch) {
                        const notation = notationMatch[0];
                        const rest = timeComplexity.replace(notation, '').trim();
                        timeComplexity = `${notation} - ${rest}`;
                    }
                }
            }
            const spaceMatch = debugContent.match(spaceComplexityPattern);
            if (spaceMatch && spaceMatch[1]) {
                spaceComplexity = spaceMatch[1].trim();
                if (!spaceComplexity.match(/O\([^)]+\)/i)) {
                    spaceComplexity = `O(n) - ${spaceComplexity}`;
                }
                else if (!spaceComplexity.includes('-') && !spaceComplexity.includes('因为')) {
                    const notationMatch = spaceComplexity.match(/O\([^)]+\)/i);
                    if (notationMatch) {
                        const notation = notationMatch[0];
                        const rest = spaceComplexity.replace(notation, '').trim();
                        spaceComplexity = `${notation} - ${rest}`;
                    }
                }
            }
            // Extract modification explanation
            const modificationPattern = /(?:修改说明|修改|改进说明|变更)[:：]?([\s\S]*?)(?=\n\s*$|$)/i;
            const modificationMatch = debugContent.match(modificationPattern);
            let modifications = "基于截图分析的代码修改和优化";
            if (modificationMatch && modificationMatch[1]) {
                modifications = modificationMatch[1].trim();
            }
            const response = {
                code: code,
                thoughts: thoughts.length > 0 ? thoughts : ["基于效率和可读性的解决方案方法"],
                time_complexity: timeComplexity,
                space_complexity: spaceComplexity,
                modifications: modifications
            };
            return { success: true, data: response };
        }
        catch (error) {
            console.error("Debug processing error:", error);
            return { success: false, error: error.message || "处理调试请求失败" };
        }
    }
    /**
     * 根据API提供商和模型配置，获取实际的模型名称
     */
    getModelName(configModel, apiProvider) {
        // 如果没有配置模型，使用默认值
        if (!configModel) {
            switch (apiProvider) {
                case "openai":
                    return "gpt-4o";
                case "gemini":
                    return "gemini-2.0-flash";
                case "anthropic":
                    return "claude-sonnet-4-20250514-thinking";
                default:
                    return "gpt-4o";
            }
        }
        // 根据API提供商映射模型名称（ismaque.org支持的模型）
        switch (apiProvider) {
            case "openai":
                // OpenAI模型保持原名
                return configModel;
            case "gemini":
                // Gemini模型在ismaque.org上的对应名称
                if (configModel.includes('gemini-1.5-pro')) {
                    return 'gemini-1.5-pro';
                }
                else if (configModel.includes('gemini-2.0-flash')) {
                    return 'gemini-2.0-flash';
                }
                return 'gemini-2.0-flash'; // 默认
            case "anthropic":
                // Claude模型在ismaque.org上的对应名称
                if (configModel.includes('claude-3-7-sonnet')) {
                    return 'claude-sonnet-4-20250514-thinking';
                }
                else if (configModel.includes('claude-3-5-sonnet')) {
                    return 'claude-3-5-sonnet-20241022';
                }
                else if (configModel.includes('claude-3-opus')) {
                    return 'claude-3-opus-20240229';
                }
                return 'claude-sonnet-4-20250514-thinking'; // 默认
            default:
                return configModel;
        }
    }
    cancelOngoingRequests() {
        let wasCancelled = false;
        if (this.currentProcessingAbortController) {
            this.currentProcessingAbortController.abort();
            this.currentProcessingAbortController = null;
            wasCancelled = true;
        }
        if (this.currentExtraProcessingAbortController) {
            this.currentExtraProcessingAbortController.abort();
            this.currentExtraProcessingAbortController = null;
            wasCancelled = true;
        }
        this.deps.setHasDebugged(false);
        this.deps.setProblemInfo(null);
        const mainWindow = this.deps.getMainWindow();
        if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        }
    }
}
exports.ProcessingHelper = ProcessingHelper;
