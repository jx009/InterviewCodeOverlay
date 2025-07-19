"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleProcessingHelper = void 0;
// SimpleProcessingHelper.ts - Cursor式AI处理助手
const node_fs_1 = __importDefault(require("node:fs"));
const openai_1 = require("openai");
const SimpleAuthManager_1 = require("./SimpleAuthManager");
const crypto_1 = require("crypto");
const node_fetch_1 = __importDefault(require("node-fetch"));
// Set UTF-8 encoding for console output in this module
if (process.stdout.setEncoding) {
    process.stdout.setEncoding('utf8');
}
if (process.stderr.setEncoding) {
    process.stderr.setEncoding('utf8');
}
// 统一的API密钥 - 用户无需配置
const ISMAQUE_API_KEY = "sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP";
/**
 * 简化的AI处理助手 - 采用Cursor式设计
 * 核心原则：
 * 1. 强制用户认证（必须登录才能使用）
 * 2. 统一token验证
 * 3. 简化的配置获取（直接从Web用户配置）
 */
class SimpleProcessingHelper {
    constructor(deps) {
        this.ismaqueClient = null;
        this.ongoingRequests = new Map();
        // AbortControllers for API requests
        this.currentProcessingAbortController = null;
        this.currentExtraProcessingAbortController = null;
        // 🆕 积分管理相关
        this.pendingCreditOperations = new Map();
        // 🆕 积分缓存
        this.userCredits = null;
        this.lastCreditsFetchTime = 0;
        this.CREDITS_CACHE_TTL = 60000; // 1分钟缓存时间
        this.creditModelsCache = new Map(); // 缓存模型积分配置
        this.deps = deps;
        this.screenshotHelper = deps.getScreenshotHelper();
        // Initialize AI client
        this.initializeAIClient();
    }
    /**
     * Initialize the AI client with fixed API key
     */
    initializeAIClient() {
        try {
            this.ismaqueClient = new openai_1.OpenAI({
                apiKey: ISMAQUE_API_KEY,
                baseURL: "https://ismaque.org/v1",
                maxRetries: 2
            });
            console.log("✅ Ismaque.org API客户端初始化成功");
        }
        catch (error) {
            console.error("❌ AI客户端初始化失败:", error);
            this.ismaqueClient = null;
        }
    }
    /**
     * 核心方法：处理截图
     * 强制登录流程：检查认证 → 获取配置 → 处理AI → 返回结果
     */
    async processScreenshots() {
        const mainWindow = this.deps.getMainWindow();
        if (!mainWindow)
            return;
        console.log('🚀 开始AI处理流程...');
        // Step 1: 强制检查用户认证
        console.log('🔐 执行认证检查...');
        const isAuthenticated = await SimpleAuthManager_1.simpleAuthManager.isAuthenticated();
        console.log('🔐 认证检查结果:', isAuthenticated);
        if (!isAuthenticated) {
            console.log('❌ 用户未认证，必须登录');
            await this.showLoginDialog();
            return;
        }
        // Step 2: 获取用户和配置
        console.log('👤 获取用户信息...');
        const user = SimpleAuthManager_1.simpleAuthManager.getCurrentUser();
        console.log('👤 用户信息:', user ? `${user.username} (${user.id})` : 'null');
        console.log('⚙️ 获取用户配置...');
        // 强制刷新配置以确保获取最新设置
        console.log('🔄 强制刷新用户配置以获取最新设置...');
        await SimpleAuthManager_1.simpleAuthManager.refreshUserConfig(true); // 强制刷新
        const userConfig = SimpleAuthManager_1.simpleAuthManager.getUserConfig();
        console.log('⚙️ 用户配置:', userConfig ? {
            aiModel: userConfig.aiModel,
            programmingModel: userConfig.programmingModel,
            multipleChoiceModel: userConfig.multipleChoiceModel,
            language: userConfig.language
        } : 'null');
        if (!user || !userConfig) {
            console.log('❌ 用户信息或配置获取失败，需要重新登录');
            console.log('  - 用户信息存在:', !!user);
            console.log('  - 用户配置存在:', !!userConfig);
            await this.showLoginDialog();
            return;
        }
        console.log(`✅ 用户认证成功: ${user.username}`);
        console.log(`📋 使用配置: AI模型=${userConfig.aiModel}, 语言=${userConfig.language}`);
        // Step 3: 使用Web端语言设置（优先级最高）
        const finalLanguage = userConfig.language || 'python';
        console.log(`🎯 最终使用语言 (来自Web配置): ${finalLanguage}`);
        // Step 4: 执行AI处理
        const view = this.deps.getView();
        if (view === "queue") {
            await this.processMainQueue(userConfig, finalLanguage);
        }
        else {
            await this.processExtraQueue(userConfig, finalLanguage);
        }
    }
    /**
     * 等待客户端初始化
     */
    async waitForInitialization(mainWindow) {
        let attempts = 0;
        const maxAttempts = 50;
        while (attempts < maxAttempts) {
            const isInitialized = await mainWindow.webContents.executeJavaScript("window.__IS_INITIALIZED__");
            if (isInitialized)
                return;
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
        }
        throw new Error("应用程序5秒后初始化失败");
    }
    /**
     * 处理主队列截图
     */
    async processMainQueue(userConfig, language) {
        const mainWindow = this.deps.getMainWindow();
        if (!mainWindow)
            return;
        console.log('📸 开始处理主队列截图...');
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START);
        const screenshotQueue = this.screenshotHelper.getScreenshotQueue();
        // 检查截图队列
        if (!screenshotQueue || screenshotQueue.length === 0) {
            console.log("❌ 主队列中没有截图");
            mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
            return;
        }
        // 检查文件是否存在
        const existingScreenshots = screenshotQueue.filter(path => node_fs_1.default.existsSync(path));
        if (existingScreenshots.length === 0) {
            console.log("❌ 截图文件不存在");
            mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
            return;
        }
        try {
            // 初始化AbortController
            this.currentProcessingAbortController = new AbortController();
            const { signal } = this.currentProcessingAbortController;
            // 加载截图数据
            const screenshots = await Promise.all(existingScreenshots.map(async (path) => {
                try {
                    return {
                        path,
                        preview: await this.screenshotHelper.getImagePreview(path),
                        data: node_fs_1.default.readFileSync(path).toString('base64')
                    };
                }
                catch (err) {
                    console.error(`读取截图错误 ${path}:`, err);
                    return null;
                }
            }));
            const validScreenshots = screenshots.filter(Boolean);
            if (validScreenshots.length === 0) {
                throw new Error("加载截图数据失败");
            }
            // 处理截图
            const result = await this.processScreenshotsWithAI(validScreenshots, userConfig, language, signal);
            if (!result.success) {
                console.log("❌ AI处理失败:", result.error);
                // 检查是否是认证错误
                if (this.isAuthError(result.error)) {
                    await SimpleAuthManager_1.simpleAuthManager.logout();
                    await this.showLoginDialog();
                }
                else {
                    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, result.error);
                }
                this.deps.setView("queue");
                return;
            }
            // 成功处理
            console.log("✅ AI处理成功");
            mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS, 'data' in result ? result.data : null);
            this.deps.setView("solutions");
        }
        catch (error) {
            console.error("处理错误:", error);
            if (error.name === 'AbortError') {
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, "处理已被用户取消");
            }
            else {
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, error.message || "处理失败，请重试");
            }
            this.deps.setView("queue");
        }
        finally {
            this.currentProcessingAbortController = null;
        }
    }
    /**
     * 显示友好的登录提示
     */
    async showLoginDialog() {
        const mainWindow = this.deps.getMainWindow();
        if (!mainWindow)
            return;
        // 显示友好的登录提示
        mainWindow.webContents.send('show-notification', {
            type: 'info',
            title: '需要登录账户',
            message: '请登录以使用AI智能分析功能',
            duration: 0, // 持续显示
            actions: [{
                    text: '立即登录',
                    action: 'open-web-login'
                }]
        });
        // 监听登录进度事件
        const handleLoginProgress = (data) => {
            mainWindow.webContents.send('show-notification', {
                type: 'loading',
                title: '正在登录',
                message: data.message,
                duration: 30000, // 30秒后自动消失，避免永久显示
                showProgress: true
            });
        };
        const handleLoginSuccess = (data) => {
            // 先清除加载通知，再显示成功通知
            mainWindow.webContents.send('clear-notification');
            setTimeout(() => {
                mainWindow.webContents.send('show-notification', {
                    type: 'success',
                    title: '登录成功',
                    message: data.message,
                    duration: 3000
                });
            }, 100);
        };
        const handleLoginError = (data) => {
            // 先清除加载通知，再显示错误通知
            mainWindow.webContents.send('clear-notification');
            setTimeout(() => {
                mainWindow.webContents.send('show-notification', {
                    type: 'error',
                    title: '登录失败',
                    message: data.error,
                    duration: 6000,
                    actions: [{
                            text: '重试',
                            action: 'open-web-login'
                        }]
                });
            }, 100);
        };
        const handleLoginCancelled = () => {
            // 登录被取消时清除通知
            mainWindow.webContents.send('clear-notification');
        };
        // 临时监听登录事件
        SimpleAuthManager_1.simpleAuthManager.once('login-progress', handleLoginProgress);
        SimpleAuthManager_1.simpleAuthManager.once('login-success', handleLoginSuccess);
        SimpleAuthManager_1.simpleAuthManager.once('login-error', handleLoginError);
        SimpleAuthManager_1.simpleAuthManager.once('login-cancelled', handleLoginCancelled);
    }
    /**
     * 使用AI处理截图（简化版本）
     */
    async processScreenshotsWithAI(screenshots, userConfig, language, signal) {
        // 生成唯一操作ID，用于跟踪整个处理过程中的积分消费
        const operationId = `ai_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`📝 创建操作ID: ${operationId}`);
        try {
            const mainWindow = this.deps.getMainWindow();
            if (!this.ismaqueClient) {
                this.initializeAIClient();
                if (!this.ismaqueClient) {
                    return {
                        success: false,
                        error: "AI客户端初始化失败，请重启应用"
                    };
                }
            }
            // Step 1: 识别题目类型和提取题目信息
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: "正在识别题目类型...",
                    progress: 10
                });
            }
            const imageDataList = screenshots.map(screenshot => screenshot.data);
            // 根据题目类型选择合适的模型
            const questionType = await this.identifyQuestionType(imageDataList, userConfig, signal);
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: `检测到${questionType === 'programming' ? '编程题' : '选择题'}，正在提取题目信息...`,
                    progress: 20
                });
            }
            // 确定要使用的模型
            const modelName = questionType === 'programming'
                ? userConfig.programmingModel || userConfig.aiModel || 'gpt-4'
                : userConfig.multipleChoiceModel || userConfig.aiModel || 'gpt-3.5-turbo';
            // Step 1.5: 积分检查和扣除
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: "检查积分余额...",
                    progress: 15
                });
            }
            // 使用直接的检查方式，避免类型错误
            try {
                // 先获取token
                const token = SimpleAuthManager_1.simpleAuthManager.getToken();
                if (!token) {
                    return {
                        success: false,
                        error: "用户未登录，请先登录"
                    };
                }
                const BASE_URL = 'http://localhost:3001';
                // 1. 检查积分
                const checkResponse = await (0, node_fetch_1.default)(`${BASE_URL}/api/client/credits/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Session-Id': token },
                    body: JSON.stringify({ modelName, questionType })
                });
                const checkResult = await checkResponse.json();
                console.log('✅ 积分检查结果:', checkResult);
                if (!checkResponse.ok || !checkResult.sufficient) {
                    return {
                        success: false,
                        error: checkResult.error || `积分不足 (需要 ${checkResult.requiredCredits || '未知'} 积分)`
                    };
                }
                // 2. 扣除积分
                const deductResponse = await (0, node_fetch_1.default)(`${BASE_URL}/api/client/credits/deduct`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Session-Id': token },
                    body: JSON.stringify({ modelName, questionType, operationId })
                });
                const deductResult = await deductResponse.json();
                console.log('💰 积分扣除结果:', deductResult);
                if (!deductResponse.ok || !deductResult.success) {
                    return {
                        success: false,
                        error: deductResult.error || '积分扣除失败'
                    };
                }
                // 记录积分操作，便于后续退款
                this.pendingCreditOperations.set(operationId, {
                    modelName,
                    questionType,
                    amount: checkResult.requiredCredits || 0
                });
                console.log(`✅ 积分检查通过，扣除成功，剩余积分: ${deductResult.newCredits || '未知'}`);
            }
            catch (creditsError) {
                console.error("积分检查或扣除失败:", creditsError);
                return {
                    success: false,
                    error: `积分处理失败: ${creditsError.message || '未知错误'}`
                };
            }
            // 根据题目类型提取不同的信息
            const problemInfo = await this.extractProblemInfo(imageDataList, questionType, userConfig, language, signal);
            if (!problemInfo.success) {
                // 提取信息失败，退款积分
                try {
                    await this.refundCredits(operationId, 0, "题目信息提取失败: " + (problemInfo.error || "未知错误"));
                }
                catch (refundError) {
                    console.error("退款失败:", refundError);
                    // 继续处理，不中断流程
                }
                return problemInfo;
            }
            console.log("✅ 题目信息提取成功:", problemInfo.data);
            // Step 2: 生成解决方案
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: "正在生成解决方案...",
                    progress: 60
                });
            }
            // 存储题目信息
            this.deps.setProblemInfo(problemInfo.data);
            // 发送题目提取成功事件
            if (mainWindow) {
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED, problemInfo.data);
            }
            const solutionsResult = await this.generateSolutions(userConfig, language, problemInfo.data, signal);
            if (solutionsResult.success) {
                // 🆕 积分操作标记为完成
                try {
                    await this.completeCreditsOperation(operationId);
                }
                catch (completeError) {
                    console.error("标记积分操作完成失败:", completeError);
                    // 继续处理，不中断流程
                }
                // 清除额外截图队列
                this.screenshotHelper.clearExtraScreenshotQueue();
                if (mainWindow) {
                    mainWindow.webContents.send("processing-status", {
                        message: "解决方案生成成功",
                        progress: 100
                    });
                }
                return { success: true, data: solutionsResult.data };
            }
            else {
                // 生成解决方案失败，退款积分
                try {
                    await this.refundCredits(operationId, 0, "生成解决方案失败: " + (solutionsResult.error || "未知错误"));
                }
                catch (refundError) {
                    console.error("退款失败:", refundError);
                    // 继续处理，不中断流程
                }
                throw new Error(solutionsResult.error || "生成解决方案失败");
            }
        }
        catch (error) {
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: "处理已被用户取消"
                };
            }
            console.error("AI处理错误:", error);
            return {
                success: false,
                error: error.message || "AI处理失败，请重试"
            };
        }
    }
    /**
     * 生成解决方案
     */
    async generateSolutions(userConfig, language, problemInfo, signal) {
        try {
            if (!this.ismaqueClient) {
                return {
                    success: false,
                    error: "AI客户端未初始化"
                };
            }
            // 根据题目类型选择处理方式
            if (problemInfo.type === 'multiple_choice') {
                return await this.generateMultipleChoiceSolutions(userConfig, problemInfo, signal);
            }
            else {
                return await this.generateProgrammingSolutions(userConfig, language, problemInfo, signal);
            }
        }
        catch (error) {
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: "处理已被用户取消"
                };
            }
            console.error("生成解决方案错误:", error);
            return { success: false, error: error.message || "生成解决方案失败" };
        }
    }
    /**
     * 生成编程题解决方案
     */
    async generateProgrammingSolutions(userConfig, language, problemInfo, signal) {
        const operationId = `prog_${(0, crypto_1.randomUUID)()}`;
        let deductionInfo = null;
        try {
            const model = userConfig.programmingModel || userConfig.aiModel || 'claude-sonnet-4-20250514';
            deductionInfo = await this.checkAndDeductCredits(model, 'programming', operationId);
            if (!deductionInfo.success) {
                return {
                    success: false,
                    error: deductionInfo.message || "积分检查失败"
                };
            }
            const promptText = `
请为以下编程题目提供最优解决方案：

【题目描述】
${problemInfo.problem_statement}

【约束条件】
${problemInfo.constraints || "未提供具体约束条件"}

【示例输入】
${problemInfo.example_input || "未提供示例输入"}

【示例输出】  
${problemInfo.example_output || "未提供示例输出"}

【编程语言】${language}

**解决方案要求：**
1. 仔细分析题目要求，确保理解正确
2. 选择最合适的算法和数据结构
3. 代码必须能正确处理所有边界情况
4. 优化时间和空间复杂度

**回复格式：**

**解题思路：**
- [分析思路1]
- [分析思路2]
- [核心算法]

**代码实现：**
\`\`\`${language}
[完整的ACM竞赛格式代码]
\`\`\`

**复杂度分析：**
时间复杂度：O(X) - [详细解释]
空间复杂度：O(X) - [详细解释]

**代码要求：**
- 完整的ACM竞赛格式（包含main函数和输入输出处理）
- Java语言使用"public class Main"
- 严格按照题目的输入输出格式
- 包含必要的导入语句
- 代码可直接运行，无需修改`;
            let solutionResponse;
            try {
                solutionResponse = await this.ismaqueClient.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: "你是一位资深的算法竞赛专家和编程面试官。你的任务是提供准确、高效、可直接运行的编程解决方案。请确保代码质量高、逻辑清晰、性能最优。" },
                        { role: "user", content: promptText }
                    ],
                    max_tokens: 6000,
                    temperature: 0.1
                }, { signal });
                console.log('✅ 编程题AI调用成功');
            }
            catch (error) {
                console.error('❌ 编程题AI调用失败:', error);
                // AI调用失败，退还积分
                if (deductionInfo.requiredPoints) {
                    await this.refundCredits(operationId, deductionInfo.requiredPoints, '编程题AI调用失败');
                }
                throw error;
            }
            const responseContent = solutionResponse.choices[0].message.content;
            // 解析响应内容
            const codeMatch = responseContent.match(/```(?:\w+)?\s*([\s\S]*?)```/);
            const code = codeMatch ? codeMatch[1].trim() : responseContent;
            // 提取思路
            const thoughtsRegex = /(?:解题思路|思路|关键洞察|推理|方法)[:：]([\s\S]*?)(?:时间复杂度|$)/i;
            const thoughtsMatch = responseContent.match(thoughtsRegex);
            let thoughts = [];
            if (thoughtsMatch && thoughtsMatch[1]) {
                const bulletPoints = thoughtsMatch[1].match(/(?:^|\n)\s*(?:[-*•]|\d+\.)\s*(.*)/g);
                if (bulletPoints) {
                    thoughts = bulletPoints.map(point => point.replace(/^\s*(?:[-*•]|\d+\.)\s*/, '').trim()).filter(Boolean);
                }
                else {
                    thoughts = thoughtsMatch[1].split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean);
                }
            }
            // 提取复杂度信息
            const timeComplexityPattern = /时间复杂度[:：]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:空间复杂度|$))/i;
            const spaceComplexityPattern = /空间复杂度[:：]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:[A-Z]|$))/i;
            let timeComplexity = "O(n) - 线性时间复杂度，因为我们只需要遍历数组一次。";
            let spaceComplexity = "O(n) - 线性空间复杂度，因为我们在哈希表中存储元素。";
            const timeMatch = responseContent.match(timeComplexityPattern);
            if (timeMatch && timeMatch[1]) {
                timeComplexity = timeMatch[1].trim();
            }
            const spaceMatch = responseContent.match(spaceComplexityPattern);
            if (spaceMatch && spaceMatch[1]) {
                spaceComplexity = spaceMatch[1].trim();
            }
            const formattedResponse = {
                type: 'programming',
                code: code,
                thoughts: thoughts.length > 0 ? thoughts : ["基于效率和可读性的解决方案方法"],
                time_complexity: timeComplexity,
                space_complexity: spaceComplexity
            };
            // 🆕 AI调用成功，完成积分操作
            await this.completeCreditsOperation(operationId);
            console.log('💰 编程题积分操作完成');
            return { success: true, data: formattedResponse };
        }
        catch (error) {
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: "处理已被用户取消"
                };
            }
            console.error("AI处理错误:", error);
            return {
                success: false,
                error: error.message || "AI处理失败，请重试"
            };
        }
    }
    /**
     * 生成选择题解决方案（支持多题）
     */
    async generateMultipleChoiceSolutions(userConfig, problemInfo, signal) {
        const operationId = `mcq_${(0, crypto_1.randomUUID)()}`;
        let deductionInfo = null;
        try {
            const model = userConfig.multipleChoiceModel || userConfig.aiModel || 'claude-sonnet-4-20250514';
            deductionInfo = await this.checkAndDeductCredits(model, 'multiple_choice', operationId);
            if (!deductionInfo.success) {
                return {
                    success: false,
                    error: deductionInfo.message || "积分检查失败"
                };
            }
            console.log('🎯 开始生成选择题解决方案...');
            const questions = problemInfo.multiple_choice_questions || [];
            console.log('📝 处理题目数量:', questions.length);
            if (questions.length === 0) {
                console.log('❌ 没有找到选择题题目');
                return {
                    success: false,
                    error: "没有找到选择题题目"
                };
            }
            // 构建问题文本
            const questionsText = questions.map((q, index) => `
题目${q.question_number || (index + 1)}：
${q.question_text}

选项：
${q.options.join('\n')}
`).join('\n---\n');
            const promptText = `
请分析以下选择题并给出答案：

${questionsText}

**重要要求：**
1. 必须严格按照指定格式回复
2. 答案部分必须包含所有题目的答案
3. 每个答案必须明确标注题号和选项字母

**回复格式（请严格遵循）：**

**答案：**
题目1 - A
题目2 - B
题目3 - C
(继续列出所有题目的答案...)

**解题思路：**
题目1分析：[详细分析过程]
题目2分析：[详细分析过程]
题目3分析：[详细分析过程]
(继续列出所有题目的分析...)

**整体思路：**
- 关键知识点1
- 关键知识点2
- 解题方法总结
`;
            console.log('🔄 发送选择题请求到AI...');
            let solutionResponse;
            try {
                solutionResponse = await this.ismaqueClient.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: "你是一位专业的选择题分析助手。仔细分析每道题目，提供准确的答案和详细的解题思路。" },
                        { role: "user", content: promptText }
                    ],
                    max_tokens: 4000,
                    temperature: 0.2
                }, { signal });
                console.log('✅ 选择题AI调用成功');
            }
            catch (error) {
                console.error('❌ 选择题AI调用失败:', error);
                // AI调用失败，退还积分
                if (deductionInfo.requiredPoints) {
                    await this.refundCredits(operationId, deductionInfo.requiredPoints, '选择题AI调用失败');
                }
                throw error;
            }
            const responseContent = solutionResponse.choices[0].message.content;
            console.log('✅ 选择题AI响应完成');
            console.log('📝 AI原始响应内容:');
            console.log('='.repeat(50));
            console.log(responseContent);
            console.log('='.repeat(50));
            // 解析答案
            console.log('🔍 开始解析选择题答案...');
            const answers = [];
            // 提取答案部分 - 改进的解析逻辑
            const answerMatch = responseContent.match(/答案[:：]?\s*([\s\S]*?)(?=\n\s*(?:解题思路|整体思路|$))/i);
            if (answerMatch) {
                const answerLines = answerMatch[1].split('\n').filter(line => line.trim());
                for (const line of answerLines) {
                    // 支持多种答案格式的正则表达式
                    const patterns = [
                        /题目(\d+)\s*[-－:：]\s*([A-D])/i,
                        /(\d+)\s*[-－:：]\s*([A-D])/i,
                        /题(\d+)\s*[-－:：]\s*([A-D])/i,
                        /第?(\d+)题?\s*[-－:：]?\s*答案?\s*[:：]?\s*([A-D])/i,
                        /(\d+)\.\s*([A-D])/i
                    ];
                    let match = null;
                    for (const pattern of patterns) {
                        match = line.match(pattern);
                        if (match)
                            break;
                    }
                    if (match) {
                        const questionNumber = match[1];
                        const answer = match[2].toUpperCase();
                        // 尝试从解题思路中提取对应的推理过程
                        let reasoning = `题目${questionNumber}的解答分析`;
                        const reasoningPattern = new RegExp(`题目${questionNumber}[分析：:]*([^\\n]*(?:\\n(?!\\d+\\.|题目|第)[^\\n]*)*)`, 'i');
                        const reasoningMatch = responseContent.match(reasoningPattern);
                        if (reasoningMatch && reasoningMatch[1]) {
                            reasoning = reasoningMatch[1].trim().replace(/^[：:]\s*/, '');
                        }
                        answers.push({
                            question_number: questionNumber,
                            answer: answer,
                            reasoning: reasoning
                        });
                    }
                }
            }
            // 如果没有解析到答案，尝试备用方案：从整个响应中查找答案模式
            if (answers.length === 0) {
                console.log('⚠️ 主要解析未找到答案，尝试备用解析...');
                // 在整个响应中搜索答案模式
                const fullTextPatterns = [
                    /(?:题目|第)?(\d+)(?:题)?[：:\s]*([A-D])(?:\s|$|\.)/gi,
                    /(\d+)\s*[-)]\s*([A-D])/gi,
                    /[（(](\d+)[）)]\s*([A-D])/gi
                ];
                for (const pattern of fullTextPatterns) {
                    const matches = [...responseContent.matchAll(pattern)];
                    for (const match of matches) {
                        const questionNumber = match[1];
                        const answer = match[2].toUpperCase();
                        // 避免重复添加
                        if (!answers.find(a => a.question_number === questionNumber)) {
                            answers.push({
                                question_number: questionNumber,
                                answer: answer,
                                reasoning: `从AI回复中提取的答案`
                            });
                        }
                    }
                    if (answers.length > 0)
                        break;
                }
            }
            console.log('🎯 解析到的答案数量:', answers.length);
            console.log('📋 答案详情:', answers);
            // 提取解题思路
            const thoughtsMatch = responseContent.match(/解题思路[:：]?\s*([\s\S]*?)(?=\n\s*(?:整体思路|$))/i);
            let thoughts = [];
            if (thoughtsMatch && thoughtsMatch[1]) {
                thoughts = thoughtsMatch[1].split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean);
            }
            // 如果没有找到解题思路，尝试提取整体思路
            if (thoughts.length === 0) {
                const overallMatch = responseContent.match(/整体思路[:：]?\s*([\s\S]*?)$/i);
                if (overallMatch && overallMatch[1]) {
                    thoughts = overallMatch[1].split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean);
                }
            }
            // 如果还是没有，使用整个响应内容
            if (thoughts.length === 0) {
                thoughts = responseContent.split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .slice(0, 10); // 只取前10行
            }
            const formattedResponse = {
                type: 'multiple_choice',
                answers: answers,
                thoughts: thoughts
            };
            // 🆕 AI调用成功，完成积分操作
            await this.completeCreditsOperation(operationId);
            console.log('💰 选择题积分操作完成');
            console.log('✅ 选择题解决方案生成完成');
            console.log('📊 最终响应:', JSON.stringify(formattedResponse, null, 2));
            return { success: true, data: formattedResponse };
        }
        catch (error) {
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: "处理已被用户取消"
                };
            }
            console.error("AI处理错误:", error);
            return {
                success: false,
                error: error.message || "AI处理失败，请重试"
            };
        }
    }
    /**
     * 处理额外队列截图（调试功能）
     */
    async processExtraQueue(userConfig, language) {
        const mainWindow = this.deps.getMainWindow();
        if (!mainWindow)
            return;
        console.log('🔧 开始处理调试截图...');
        const extraScreenshotQueue = this.screenshotHelper.getExtraScreenshotQueue();
        if (!extraScreenshotQueue || extraScreenshotQueue.length === 0) {
            console.log("❌ 额外队列中没有截图");
            mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
            return;
        }
        const existingExtraScreenshots = extraScreenshotQueue.filter(path => node_fs_1.default.existsSync(path));
        if (existingExtraScreenshots.length === 0) {
            console.log("❌ 额外截图文件不存在");
            mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
            return;
        }
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START);
        // 初始化AbortController
        this.currentExtraProcessingAbortController = new AbortController();
        const { signal } = this.currentExtraProcessingAbortController;
        try {
            // 获取所有截图（主要和额外的）
            const allPaths = [
                ...this.screenshotHelper.getScreenshotQueue(),
                ...existingExtraScreenshots
            ];
            const screenshots = await Promise.all(allPaths.map(async (path) => {
                try {
                    if (!node_fs_1.default.existsSync(path)) {
                        console.warn(`截图文件不存在: ${path}`);
                        return null;
                    }
                    return {
                        path,
                        preview: await this.screenshotHelper.getImagePreview(path),
                        data: node_fs_1.default.readFileSync(path).toString('base64')
                    };
                }
                catch (err) {
                    console.error(`读取截图错误 ${path}:`, err);
                    return null;
                }
            }));
            const validScreenshots = screenshots.filter(Boolean);
            if (validScreenshots.length === 0) {
                throw new Error("加载调试截图数据失败");
            }
            console.log("🔧 合并截图进行调试处理:", validScreenshots.map((s) => s.path));
            const result = await this.processExtraScreenshotsWithAI(validScreenshots, userConfig, language, signal);
            if (result.success) {
                this.deps.setHasDebugged(true);
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS, result.data);
            }
            else {
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, result.error);
            }
        }
        catch (error) {
            if (error.name === 'AbortError') {
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, "调试处理已被用户取消");
            }
            else {
                mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, error.message);
            }
        }
        finally {
            this.currentExtraProcessingAbortController = null;
        }
    }
    /**
     * 使用AI处理额外截图（调试功能）
     */
    async processExtraScreenshotsWithAI(screenshots, userConfig, language, signal) {
        try {
            const problemInfo = this.deps.getProblemInfo();
            const mainWindow = this.deps.getMainWindow();
            if (!problemInfo) {
                throw new Error("没有可用的题目信息");
            }
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: "正在处理调试截图...",
                    progress: 30
                });
            }
            const imageDataList = screenshots.map(screenshot => screenshot.data);
            if (!this.ismaqueClient) {
                return {
                    success: false,
                    error: "AI客户端未初始化"
                };
            }
            // 固定使用 gemini-2.5-flash-preview-04-17 进行调试截图处理
            const debuggingModel = 'gemini-2.5-flash-preview-04-17';
            console.log('🔍 使用固定模型进行调试截图处理:', debuggingModel);
            const messages = [
                {
                    role: "system",
                    content: `你是一位编程面试助手，帮助调试和改进解决方案。分析这些包含错误信息、错误输出或测试用例的截图，并提供详细的调试帮助。

请按照以下格式提供回复：
1. 代码：修正后的完整ACM竞赛模式的${language}实现
2. 解题思路：关键修改和改进的要点列表
3. 时间复杂度：O(X)格式，并提供详细解释（至少2句话）
4. 空间复杂度：O(X)格式，并提供详细解释（至少2句话）
5. 修改说明：详细说明相比原代码进行了哪些修改和为什么需要这些修改`
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

我需要调试或改进我的解决方案的帮助。这里是我的代码、错误或测试用例的截图。请提供详细分析。`
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
            }, { signal });
            const debugContent = debugResponse.choices[0].message.content;
            if (mainWindow) {
                mainWindow.webContents.send("processing-status", {
                    message: "调试分析完成",
                    progress: 100
                });
            }
            // 解析调试响应（与生成解决方案类似的逻辑）
            const codeMatch = debugContent.match(/```(?:\w+)?\s*([\s\S]*?)```/);
            const code = codeMatch ? codeMatch[1].trim() : debugContent;
            // 提取思路
            const thoughtsRegex = /(?:解题思路|思路|关键洞察|推理|方法|修改|改进)[:：]([\s\S]*?)(?:时间复杂度|$)/i;
            const thoughtsMatch = debugContent.match(thoughtsRegex);
            let thoughts = [];
            if (thoughtsMatch && thoughtsMatch[1]) {
                const bulletPoints = thoughtsMatch[1].match(/(?:^|\n)\s*(?:[-*•]|\d+\.)\s*(.*)/g);
                if (bulletPoints) {
                    thoughts = bulletPoints.map(point => point.replace(/^\s*(?:[-*•]|\d+\.)\s*/, '').trim()).filter(Boolean);
                }
                else {
                    thoughts = thoughtsMatch[1].split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean);
                }
            }
            // 提取复杂度信息
            const timeComplexityPattern = /时间复杂度[:：]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:空间复杂度|$))/i;
            const spaceComplexityPattern = /空间复杂度[:：]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:[A-Z]|$))/i;
            let timeComplexity = "O(n) - 线性时间复杂度";
            let spaceComplexity = "O(n) - 线性空间复杂度";
            const timeMatch = debugContent.match(timeComplexityPattern);
            if (timeMatch && timeMatch[1]) {
                timeComplexity = timeMatch[1].trim();
            }
            const spaceMatch = debugContent.match(spaceComplexityPattern);
            if (spaceMatch && spaceMatch[1]) {
                spaceComplexity = spaceMatch[1].trim();
            }
            // 提取修改说明
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
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: "调试处理已被用户取消"
                };
            }
            console.error("调试处理错误:", error);
            return { success: false, error: error.message || "处理调试请求失败" };
        }
    }
    /**
     * 检查是否是认证错误
     */
    isAuthError(error) {
        const authErrorKeywords = ['401', 'unauthorized', 'invalid token', 'authentication failed', '认证失败', '登录失败'];
        return authErrorKeywords.some(keyword => error.toLowerCase().includes(keyword.toLowerCase()));
    }
    /**
     * 识别题目类型（编程题 vs 选择题）
     */
    async identifyQuestionType(imageDataList, userConfig, signal) {
        try {
            if (!this.ismaqueClient) {
                throw new Error("AI客户端未初始化");
            }
            // 固定使用 gemini-2.5-flash-preview-04-17 进行截图识别
            const model = 'gemini-2.5-flash-preview-04-17';
            console.log('🔍 使用固定模型进行截图识别:', model);
            const messages = [
                {
                    role: "system",
                    content: `你是一个题目类型识别专家。请分析截图中的题目类型。

**重要要求：**
1. 只返回一个单词：programming 或 multiple_choice
2. 不要任何解释或额外文字
3. programming = 编程题（需要写代码的题目）
4. multiple_choice = 选择题（有A、B、C、D等选项的题目）

**判断标准：**
- 如果看到选项A、B、C、D或类似的选择项 → multiple_choice
- 如果看到"输入格式"、"输出格式"、"示例"等编程题特征 → programming
- 如果看到代码输入输出要求 → programming
- 如果看到多个选择项排列 → multiple_choice`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "请识别这些截图中的题目类型，只返回：programming 或 multiple_choice"
                        },
                        ...imageDataList.map(data => ({
                            type: "image_url",
                            image_url: { url: `data:image/png;base64,${data}` }
                        }))
                    ]
                }
            ];
            const response = await this.ismaqueClient.chat.completions.create({
                model: model,
                messages: messages,
                max_tokens: 10,
                temperature: 0.0
            }, { signal });
            const result = response.choices[0].message.content.trim().toLowerCase();
            if (result.includes('multiple_choice')) {
                return 'multiple_choice';
            }
            else {
                return 'programming'; // 默认为编程题
            }
        }
        catch (error) {
            console.warn("题目类型识别失败，默认为编程题:", error);
            return 'programming'; // 默认情况
        }
    }
    /**
     * 根据题目类型提取题目信息
     */
    async extractProblemInfo(imageDataList, questionType, userConfig, language, signal) {
        try {
            if (!this.ismaqueClient) {
                return {
                    success: false,
                    error: "AI客户端未初始化"
                };
            }
            // 固定使用 gemini-2.5-flash-preview-04-17 进行截图识别和题目信息提取
            const model = 'gemini-2.5-flash-preview-04-17';
            console.log(`🔍 使用固定模型提取${questionType === 'programming' ? '编程题' : '选择题'}信息:`, model);
            if (questionType === 'programming') {
                return await this.extractProgrammingProblem(imageDataList, model, language, signal);
            }
            else {
                return await this.extractMultipleChoiceProblems(imageDataList, model, signal);
            }
        }
        catch (error) {
            return {
                success: false,
                error: `提取题目信息失败：${error.message}`
            };
        }
    }
    /**
     * 提取编程题信息
     */
    async extractProgrammingProblem(imageDataList, model, language, signal) {
        try {
            const messages = [
                {
                    role: "system",
                    content: `你是一个专业的编程题目分析专家。请仔细阅读截图中的每一个字，准确提取编程题目的完整信息。

**核心要求：**
1. 必须逐字逐句地仔细阅读截图中的所有文字内容
2. 题目描述必须完整准确，不能遗漏任何重要信息
3. 必须严格按照截图中的原文提取，不要自己编造或修改
4. 如果截图模糊或文字不清楚，请在相应字段中说明"截图不清楚，无法准确识别"

**提取字段说明：**
- problem_statement: 完整的题目描述，包括问题背景、要求解决的问题等
- constraints: 所有约束条件，包括数据范围、时间限制、空间限制等
- example_input: 示例输入的具体内容
- example_output: 示例输出的具体内容

**质量要求：**
1. 题目描述必须包含足够的信息让程序员理解要解决什么问题
2. 约束条件必须包含所有数据范围和限制
3. 示例必须与题目描述完全对应
4. 不要添加任何截图中没有的信息

**输出格式：**
必须只返回纯JSON格式，不要任何额外文字或markdown标记：
{"type":"programming","problem_statement":"完整准确的题目描述","constraints":"完整的约束条件","example_input":"示例输入","example_output":"示例输出"}`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `请仔细分析这些编程题目截图，准确提取以下信息：

1. 完整的题目描述（不要遗漏任何细节）
2. 所有约束条件和数据范围
3. 完整的示例输入和输出

**重要提醒：**
- 必须逐字阅读截图内容，确保提取的题目描述完整且准确
- 不要根据常见算法题自行补充内容
- 严格按照截图中的原文提取，保持题目的原始表述
- 如果截图中有多个部分，请确保都被正确识别和提取

目标编程语言：${language}
请以纯JSON格式返回结果，不要任何其他文本。`
                        },
                        ...imageDataList.map(data => ({
                            type: "image_url",
                            image_url: { url: `data:image/png;base64,${data}` }
                        }))
                    ]
                }
            ];
            const response = await this.ismaqueClient.chat.completions.create({
                model: model,
                messages: messages,
                max_tokens: 6000,
                temperature: 0.0
            }, { signal });
            const responseText = response.choices[0].message.content;
            console.log("编程题AI提取响应:", responseText);
            let jsonText = responseText.trim();
            jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const jsonStart = jsonText.indexOf('{');
            const jsonEnd = jsonText.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
            }
            const problemInfo = JSON.parse(jsonText);
            return {
                success: true,
                data: {
                    type: 'programming',
                    problem_statement: problemInfo.problem_statement || "无法从截图中提取题目描述",
                    constraints: problemInfo.constraints || "无法从截图中提取约束条件",
                    example_input: problemInfo.example_input || "无法从截图中提取示例输入",
                    example_output: problemInfo.example_output || "无法从截图中提取示例输出"
                }
            };
        }
        catch (error) {
            console.error("解析编程题AI响应失败:", error);
            return {
                success: false,
                error: `解析编程题信息失败：${error.message}`
            };
        }
    }
    /**
     * 提取选择题信息（支持多题）
     */
    async extractMultipleChoiceProblems(imageDataList, model, signal) {
        try {
            const messages = [
                {
                    role: "system",
                    content: `你是一个选择题识别专家。请分析截图中的所有选择题，提取完整信息。

**重要要求：**
1. 必须只返回纯JSON格式，不要任何额外的文字、解释或markdown标记
2. JSON必须包含：type, problem_statement, multiple_choice_questions
3. type 必须设为 "multiple_choice"
4. multiple_choice_questions 是数组，包含所有识别到的选择题
5. 每个选择题包含：question_number, question_text, options
6. question_number 是题号（如"1", "2", "A", "B"等）
7. options 是选项数组（如["A. 选项A", "B. 选项B", ...]）
8. 确保返回的是有效的JSON格式

**示例输出格式：**
{
  "type": "multiple_choice",
  "problem_statement": "选择题集合",
  "multiple_choice_questions": [
    {
      "question_number": "1",
      "question_text": "第一题的题目内容",
      "options": ["A. 选项A", "B. 选项B", "C. 选项C", "D. 选项D"]
    },
    {
      "question_number": "2", 
      "question_text": "第二题的题目内容",
      "options": ["A. 选项A", "B. 选项B", "C. 选项C", "D. 选项D"]
    }
  ]
}`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "请识别这些截图中的所有选择题，按题号顺序提取题目和选项信息，以严格的JSON格式返回。请确保识别出所有完整的题目。"
                        },
                        ...imageDataList.map(data => ({
                            type: "image_url",
                            image_url: { url: `data:image/png;base64,${data}` }
                        }))
                    ]
                }
            ];
            const response = await this.ismaqueClient.chat.completions.create({
                model: model,
                messages: messages,
                max_tokens: 6000,
                temperature: 0.1
            }, { signal });
            const responseText = response.choices[0].message.content;
            console.log("选择题AI提取响应:", responseText);
            let jsonText = responseText.trim();
            jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const jsonStart = jsonText.indexOf('{');
            const jsonEnd = jsonText.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
            }
            const problemInfo = JSON.parse(jsonText);
            return {
                success: true,
                data: {
                    type: 'multiple_choice',
                    problem_statement: problemInfo.problem_statement || "选择题集合",
                    multiple_choice_questions: problemInfo.multiple_choice_questions || []
                }
            };
        }
        catch (error) {
            console.error("解析选择题AI响应失败:", error);
            return {
                success: false,
                error: `解析选择题信息失败：${error.message}`
            };
        }
    }
    /**
     * 取消所有进行中的请求
     */
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
    // 🆕 积分管理辅助方法
    /**
     * 检查积分是否足够
     */
    async checkCredits(modelName, questionType) {
        try {
            const mainWindow = this.deps.getMainWindow();
            if (!mainWindow) {
                return { sufficient: false, currentCredits: 0, requiredCredits: 0, error: '主窗口不可用' };
            }
            const result = await mainWindow.webContents.executeJavaScript(`
        window.electronAPI.creditsCheck({ modelName: '${modelName}', questionType: '${questionType}' })
      `);
            if (result.success) {
                return {
                    sufficient: result.sufficient,
                    currentCredits: result.currentCredits,
                    requiredCredits: result.requiredCredits
                };
            }
            else {
                return { sufficient: false, currentCredits: 0, requiredCredits: 0, error: result.error };
            }
        }
        catch (error) {
            console.error('检查积分失败:', error);
            return { sufficient: false, currentCredits: 0, requiredCredits: 0, error: error.message };
        }
    }
    /**
     * 扣除积分
     */
    async deductCredits(modelName, questionType) {
        try {
            const mainWindow = this.deps.getMainWindow();
            if (!mainWindow) {
                return { success: false, error: '主窗口不可用' };
            }
            const operationId = `ai_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const result = await mainWindow.webContents.executeJavaScript(`
        window.electronAPI.creditsDeduct({ 
          modelName: '${modelName}', 
          questionType: '${questionType}',
          operationId: '${operationId}'
        })
      `);
            if (result.success) {
                // 记录待处理的积分操作，以便失败时退款
                this.pendingCreditOperations.set(operationId, {
                    modelName,
                    questionType,
                    amount: result.deductedAmount
                });
                return {
                    success: true,
                    operationId: result.operationId,
                    deductedAmount: result.deductedAmount
                };
            }
            else {
                return { success: false, error: result.error };
            }
        }
        catch (error) {
            console.error('扣除积分失败:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * 退还积分（AI调用失败时）
     */
    async refundCredits(operationId, amount, reason) {
        const token = SimpleAuthManager_1.simpleAuthManager.getToken();
        if (!token)
            return; // 如果没有token，无法退款
        const BASE_URL = 'http://localhost:3001';
        await (0, node_fetch_1.default)(`${BASE_URL}/api/client/credits/refund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Session-Id': token },
            body: JSON.stringify({ operationId, amount, reason }),
        });
    }
    /**
     * 完成积分操作（AI调用成功时）
     */
    async completeCreditsOperation(operationId) {
        // 移除待处理的操作记录，表示操作成功完成
        this.pendingCreditOperations.delete(operationId);
        console.log('✅ 积分操作完成:', operationId);
    }
    /**
     * 🆕 获取用户积分余额(带缓存)
     */
    async getUserCredits(forceRefresh = false) {
        // 如果有缓存且未过期，直接返回缓存数据
        const now = Date.now();
        if (!forceRefresh && this.userCredits !== null && (now - this.lastCreditsFetchTime) < this.CREDITS_CACHE_TTL) {
            return this.userCredits;
        }
        try {
            const token = SimpleAuthManager_1.simpleAuthManager.getToken();
            if (!token)
                return null;
            const BASE_URL = 'http://localhost:3001';
            const response = await (0, node_fetch_1.default)(`${BASE_URL}/api/client/credits`, {
                method: 'GET',
                headers: {
                    'X-Session-Id': token,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                // 更新缓存
                this.userCredits = data.credits;
                this.lastCreditsFetchTime = now;
                return data.credits;
            }
            return null;
        }
        catch (error) {
            console.error('获取积分失败:', error);
            return null;
        }
    }
    /**
     * 🆕 检查并扣除积分（使用合并API，一次网络请求完成）
     */
    async checkAndDeductCredits(modelName, questionType, operationId) {
        try {
            const token = SimpleAuthManager_1.simpleAuthManager.getToken();
            if (!token) {
                return { success: false, message: '未登录，无法获取积分' };
            }
            console.time('credits-check-and-deduct-api');
            const BASE_URL = 'http://localhost:3001';
            const response = await (0, node_fetch_1.default)(`${BASE_URL}/api/client/credits/check-and-deduct`, {
                method: 'POST',
                headers: {
                    'X-Session-Id': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    modelName,
                    questionType,
                    operationId
                })
            });
            console.timeEnd('credits-check-and-deduct-api');
            const data = await response.json();
            // 更新本地缓存
            if (data.success && data.newBalance !== undefined) {
                this.userCredits = data.newBalance;
                this.lastCreditsFetchTime = Date.now();
            }
            return {
                success: data.success,
                sufficient: data.sufficient,
                currentPoints: data.currentPoints,
                newBalance: data.newBalance,
                requiredPoints: data.requiredPoints,
                message: data.message
            };
        }
        catch (error) {
            console.error('检查并扣除积分失败:', error);
            return { success: false, message: '检查并扣除积分失败' };
        }
    }
    /**
     * 处理选择题搜索
     */
    async processMultipleChoiceSearch(window, params) {
        try {
            if (!await SimpleAuthManager_1.simpleAuthManager.isAuthenticated()) {
                window.webContents.send('multiple-choice-search-error', { error: '请先登录' });
                return;
            }
            // 图片存在性检查
            if (!node_fs_1.default.existsSync(params.screenshot_path)) {
                window.webContents.send('multiple-choice-search-error', { error: '截图文件不存在' });
                return;
            }
            const operationId = (0, crypto_1.randomUUID)();
            window.webContents.send('processing-start', { type: 'multiple_choice' });
            this.currentProcessingAbortController = new AbortController();
            // 模型名称 - 使用默认值
            const modelName = 'gpt-4o';
            // 🆕 使用合并的API进行积分检查和扣除
            const creditResult = await this.checkAndDeductCredits(modelName, 'multiple_choice', operationId);
            if (!creditResult.success || !creditResult.sufficient) {
                window.webContents.send('multiple-choice-search-error', {
                    error: creditResult.message || '积分检查失败',
                    credits: creditResult.currentPoints || 0,
                    requiredCredits: creditResult.requiredPoints || 0
                });
                return;
            }
            // 积分检查通过，继续处理
            window.webContents.send('processing-credits-check-passed', {
                credits: creditResult.newBalance || 0
            });
            // ... [现有的处理逻辑]
        }
        catch (error) {
            console.error("选择题搜索处理错误:", error);
            window.webContents.send('multiple-choice-search-error', { error: '处理失败:' + error.message });
        }
    }
    /**
     * 处理编程题搜索
     */
    async processProgrammingSearch(window, params) {
        try {
            if (!await SimpleAuthManager_1.simpleAuthManager.isAuthenticated()) {
                window.webContents.send('programming-search-error', { error: '请先登录' });
                return;
            }
            // 图片存在性检查
            if (!node_fs_1.default.existsSync(params.screenshot_path)) {
                window.webContents.send('programming-search-error', { error: '截图文件不存在' });
                return;
            }
            const operationId = (0, crypto_1.randomUUID)();
            window.webContents.send('processing-start', { type: 'programming' });
            this.currentProcessingAbortController = new AbortController();
            // 模型名称 - 使用默认值
            const modelName = 'gpt-4o';
            // 🆕 使用合并的API进行积分检查和扣除
            const creditResult = await this.checkAndDeductCredits(modelName, 'programming', operationId);
            if (!creditResult.success || !creditResult.sufficient) {
                window.webContents.send('programming-search-error', {
                    error: creditResult.message || '积分检查失败',
                    credits: creditResult.currentPoints || 0,
                    requiredCredits: creditResult.requiredPoints || 0
                });
                return;
            }
            // 积分检查通过，继续处理
            window.webContents.send('processing-credits-check-passed', {
                credits: creditResult.newBalance || 0
            });
            // ... [现有的处理逻辑]
        }
        catch (error) {
            console.error("编程题搜索处理错误:", error);
            window.webContents.send('programming-search-error', { error: '处理失败:' + error.message });
        }
    }
}
exports.SimpleProcessingHelper = SimpleProcessingHelper;
SimpleProcessingHelper.instance = null;
