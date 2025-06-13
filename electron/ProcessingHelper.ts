// ProcessingHelper.ts
import fs from "node:fs"
import path from "node:path"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import * as axios from "axios"
import { app, BrowserWindow, dialog } from "electron"
import { OpenAI } from "openai"
import { configHelper } from "./ConfigHelper"

// 统一的API密钥 - 用户无需配置
const ISMAQUE_API_KEY = "sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP";

// 使用ismaque.org API的统一客户端，支持OpenAI、Gemini和Claude
export class ProcessingHelper {
  private deps: IProcessingHelperDeps
  private screenshotHelper: ScreenshotHelper
  private ismaqueClient: OpenAI | null = null

  // AbortControllers for API requests
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    this.screenshotHelper = deps.getScreenshotHelper()
    
    // Initialize AI client
    this.initializeAIClient();
    
    // Listen for config changes to re-initialize the AI client (model changes)
    configHelper.on('config-updated', () => {
      this.initializeAIClient();
    });
  }
  
  /**
   * Initialize the AI client with fixed API key
   */
  private initializeAIClient(): void {
    try {
      // 使用固定的API密钥初始化ismaque.org客户端
      this.ismaqueClient = new OpenAI({ 
        apiKey: ISMAQUE_API_KEY,
        baseURL: "https://ismaque.org/v1", // ismaque.org API endpoint
        timeout: 60000, // 60 second timeout
        maxRetries: 2   // Retry up to 2 times
      });
      console.log("Ismaque.org API client initialized successfully with built-in key");
    } catch (error) {
      console.error("Failed to initialize AI client:", error);
      this.ismaqueClient = null;
    }
  }

  private async waitForInitialization(
    mainWindow: BrowserWindow
  ): Promise<void> {
    let attempts = 0
    const maxAttempts = 50 // 5 seconds total

    while (attempts < maxAttempts) {
      const isInitialized = await mainWindow.webContents.executeJavaScript(
        "window.__IS_INITIALIZED__"
      )
      if (isInitialized) return
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }
    throw new Error("App failed to initialize after 5 seconds")
  }

  private async getCredits(): Promise<number> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return 999 // Unlimited credits in this version

    try {
      await this.waitForInitialization(mainWindow)
      return 999 // Always return sufficient credits to work
    } catch (error) {
      console.error("Error getting credits:", error)
      return 999 // Unlimited credits as fallback
    }
  }

  private async getLanguage(): Promise<string> {
    try {
      // Get language from config
      const config = configHelper.loadConfig();
      if (config.language) {
        return config.language;
      }
      
      // Fallback to window variable if config doesn't have language
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        try {
          await this.waitForInitialization(mainWindow)
          const language = await mainWindow.webContents.executeJavaScript(
            "window.__LANGUAGE__"
          )

          if (
            typeof language === "string" &&
            language !== undefined &&
            language !== null
          ) {
            return language;
          }
        } catch (err) {
          console.warn("Could not get language from window", err);
        }
      }
      
      // Default fallback
      return "python";
    } catch (error) {
      console.error("Error getting language:", error)
      return "python"
    }
  }

  public async processScreenshots(): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    const config = configHelper.loadConfig();
    
    // Verify we have a valid AI client (should always be available now)
    if (!this.ismaqueClient) {
      this.initializeAIClient();
      
      if (!this.ismaqueClient) {
        console.error("Ismaque.org client not initialized");
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.API_KEY_INVALID
        );
        return;
      }
    }

    const view = this.deps.getView()
    console.log("Processing screenshots in view:", view)

    if (view === "queue") {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)
      const screenshotQueue = this.screenshotHelper.getScreenshotQueue()
      console.log("Processing main queue screenshots:", screenshotQueue)
      
      // Check if the queue is empty
      if (!screenshotQueue || screenshotQueue.length === 0) {
        console.log("No screenshots found in queue");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        return;
      }

      // Check that files actually exist
      const existingScreenshots = screenshotQueue.filter(path => fs.existsSync(path));
      if (existingScreenshots.length === 0) {
        console.log("Screenshot files don't exist on disk");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        return;
      }

      try {
        // Initialize AbortController
        this.currentProcessingAbortController = new AbortController()
        const { signal } = this.currentProcessingAbortController

        const screenshots = await Promise.all(
          existingScreenshots.map(async (path) => {
            try {
              return {
                path,
                preview: await this.screenshotHelper.getImagePreview(path),
                data: fs.readFileSync(path).toString('base64')
              };
            } catch (err) {
              console.error(`Error reading screenshot ${path}:`, err);
              return null;
            }
          })
        )

        // Filter out any nulls from failed screenshots
        const validScreenshots = screenshots.filter(Boolean);
        
        if (validScreenshots.length === 0) {
          throw new Error("Failed to load screenshot data");
        }

        const result = await this.processScreenshotsHelper(validScreenshots, signal)

        if (!result.success) {
          console.log("Processing failed:", result.error)
          if (result.error?.includes("401") || result.error?.includes("invalid") || result.error?.includes("unauthorized")) {
            mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.API_KEY_INVALID
            )
          } else {
            mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
              result.error
            )
          }
          // Reset view back to queue on error
          console.log("Resetting view to queue due to error")
          this.deps.setView("queue")
          return
        }

        // Only set view to solutions if processing succeeded
        console.log("Setting view to solutions after successful processing")
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          result.data
        )
        this.deps.setView("solutions")
      } catch (error: any) {
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
          error
        )
        console.error("Processing error:", error)
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "处理已被用户取消。"
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message || "服务器错误，请重试。"
          )
        }
        // Reset view back to queue on error
        console.log("Resetting view to queue due to error")
        this.deps.setView("queue")
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      // view == 'solutions'
      const extraScreenshotQueue =
        this.screenshotHelper.getExtraScreenshotQueue()
      console.log("Processing extra queue screenshots:", extraScreenshotQueue)
      
      // Check if the extra queue is empty
      if (!extraScreenshotQueue || extraScreenshotQueue.length === 0) {
        console.log("No extra screenshots found in queue");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        
        return;
      }

      // Check that files actually exist
      const existingExtraScreenshots = extraScreenshotQueue.filter(path => fs.existsSync(path));
      if (existingExtraScreenshots.length === 0) {
        console.log("Extra screenshot files don't exist on disk");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        return;
      }
      
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START)

      // Initialize AbortController
      this.currentExtraProcessingAbortController = new AbortController()
      const { signal } = this.currentExtraProcessingAbortController

      try {
        // Get all screenshots (both main and extra) for processing
        const allPaths = [
          ...this.screenshotHelper.getScreenshotQueue(),
          ...existingExtraScreenshots
        ];
        
        const screenshots = await Promise.all(
          allPaths.map(async (path) => {
            try {
              if (!fs.existsSync(path)) {
                console.warn(`Screenshot file does not exist: ${path}`);
                return null;
              }
              
              return {
                path,
                preview: await this.screenshotHelper.getImagePreview(path),
                data: fs.readFileSync(path).toString('base64')
              };
            } catch (err) {
              console.error(`Error reading screenshot ${path}:`, err);
              return null;
            }
          })
        )
        
        // Filter out any nulls from failed screenshots
        const validScreenshots = screenshots.filter(Boolean);
        
        if (validScreenshots.length === 0) {
          throw new Error("Failed to load screenshot data for debugging");
        }
        
        console.log(
          "Combined screenshots for processing:",
          validScreenshots.map((s) => s.path)
        )

        const result = await this.processExtraScreenshotsHelper(
          validScreenshots,
          signal
        )

        if (result.success) {
          this.deps.setHasDebugged(true)
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS,
            result.data
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            result.error
          )
        }
      } catch (error: any) {
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            "额外处理已被用户取消。"
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            error.message
          )
        }
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  private async processScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    try {
      const config = configHelper.loadConfig();
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
          role: "system" as const, 
          content: "你是一个编程题目解释助手。分析编程题目的截图，提取所有相关信息。以JSON格式返回信息，包含以下字段：problem_statement（题目描述）, constraints（约束条件）, example_input（示例输入）, example_output（示例输出）。只返回结构化的JSON，不要其他文本。"
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const, 
              text: `从这些截图中提取编程题目详情，以JSON格式返回。我们将使用${language}语言来解决这个问题。`
            },
            ...imageDataList.map(data => ({
              type: "image_url" as const,
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
        temperature: 0.2
      });

      // Parse the response
      try {
        const responseText = extractionResponse.choices[0].message.content;
        // Handle when API might wrap the JSON in markdown code blocks
        const jsonText = responseText.replace(/```json|```/g, '').trim();
        problemInfo = JSON.parse(jsonText);
      } catch (error) {
        console.error("Error parsing API response:", error);
        return {
          success: false,
          error: "解析题目信息失败，请重试或使用更清晰的截图。"
        };
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
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
          problemInfo
        );

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
          
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
            solutionsResult.data
          );
          return { success: true, data: solutionsResult.data };
        } else {
          throw new Error(
            solutionsResult.error || "生成解决方案失败"
          );
        }
      }

      return { success: false, error: "处理截图失败" };
    } catch (error: any) {
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
      } else if (error?.response?.status === 429 || error?.status === 429) {
        return {
          success: false,
          error: "API调用频率限制，请稍后重试。"
        };
      } else if (error?.response?.status === 500 || error?.status === 500) {
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

  private async generateSolutionsHelper(signal: AbortSignal) {
    try {
      const problemInfo = this.deps.getProblemInfo();
      const language = await this.getLanguage();
      const config = configHelper.loadConfig();
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

      // Create prompt for solution generation (in Chinese)
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
1. 代码：一个干净、优化的${language}实现
2. 解题思路：关键洞察和方法推理的要点列表
3. 时间复杂度：O(X)格式，并提供详细解释（至少2句话）
4. 空间复杂度：O(X)格式，并提供详细解释（至少2句话）

对于复杂度解释，请务必详细。例如："时间复杂度：O(n)，因为我们只需要遍历数组一次。这是最优的，因为我们需要至少检查每个元素一次才能找到解决方案。"或者"空间复杂度：O(n)，因为在最坏情况下，我们需要在哈希表中存储所有元素。额外空间使用量与输入规模成线性关系。"

你的解决方案应该高效、有良好注释，并处理边界情况。
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
      let thoughts: string[] = [];
      
      if (thoughtsMatch && thoughtsMatch[1]) {
        // Extract bullet points or numbered items
        const bulletPoints = thoughtsMatch[1].match(/(?:^|\n)\s*(?:[-*•]|\d+\.)\s*(.*)/g);
        if (bulletPoints) {
          thoughts = bulletPoints.map(point => 
            point.replace(/^\s*(?:[-*•]|\d+\.)\s*/, '').trim()
          ).filter(Boolean);
        } else {
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
        } else if (!timeComplexity.includes('-') && !timeComplexity.includes('因为')) {
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
        } else if (!spaceComplexity.includes('-') && !spaceComplexity.includes('因为')) {
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
    } catch (error: any) {
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
      } else if (error?.response?.status === 429 || error?.status === 429) {
        return {
          success: false,
          error: "API调用频率限制，请稍后重试。"
        };
      }
      
      console.error("Solution generation error:", error);
      return { success: false, error: error.message || "生成解决方案失败" };
    }
  }

  private async processExtraScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    try {
      const problemInfo = this.deps.getProblemInfo();
      const language = await this.getLanguage();
      const config = configHelper.loadConfig();
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
          role: "system" as const, 
          content: `你是一位编程面试助手，帮助调试和改进解决方案。分析这些包含错误信息、错误输出或测试用例的截图，并提供详细的调试帮助。

你的回复必须严格按照以下结构和标题格式（使用 ### 作为标题）：
### 发现的问题
- 用清晰解释将每个问题列为要点

### 具体改进和修正
- 将需要的具体代码更改列为要点

### 优化建议
- 如果适用，列出任何性能优化

### 更改解释
在这里提供为什么需要这些更改的清晰解释

### 关键要点
- 最重要要点的总结列表

如果你包含代码示例，请使用正确的markdown代码块和语言规范（例如 \`\`\`java）。`
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const, 
              text: `我正在解决这个编程题目："${problemInfo.problem_statement}"，使用${language}语言。我需要调试或改进我的解决方案的帮助。这里是我的代码、错误或测试用例的截图。请提供详细分析，包括：
1. 你在我的代码中发现的问题
2. 具体的改进和修正
3. 任何能让解决方案更好的优化
4. 为什么需要这些更改的清晰解释` 
            },
            ...imageDataList.map(data => ({
              type: "image_url" as const,
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

      let extractedCode = "// 调试模式 - 请参见下面的分析";
      const codeMatch = debugContent.match(/```(?:[a-zA-Z]+)?([\s\S]*?)```/);
      if (codeMatch && codeMatch[1]) {
        extractedCode = codeMatch[1].trim();
      }

      let formattedDebugContent = debugContent;
      
      if (!debugContent.includes('# ') && !debugContent.includes('## ')) {
        formattedDebugContent = debugContent
          .replace(/发现的问题|问题识别|发现的错误/i, '## 发现的问题')
          .replace(/代码改进|改进|建议的更改/i, '## 代码改进')
          .replace(/优化|性能改进/i, '## 优化建议')
          .replace(/解释|详细分析/i, '## 解释');
      }

      const bulletPoints = formattedDebugContent.match(/(?:^|\n)[ ]*(?:[-*•]|\d+\.)[ ]+([^\n]+)/g);
      const thoughts = bulletPoints 
        ? bulletPoints.map(point => point.replace(/^[ ]*(?:[-*•]|\d+\.)[ ]+/, '').trim()).slice(0, 5)
        : ["基于你的截图的调试分析"];
      
      const response = {
        code: extractedCode,
        debug_analysis: formattedDebugContent,
        thoughts: thoughts,
        time_complexity: "N/A - 调试模式",
        space_complexity: "N/A - 调试模式"
      };

      return { success: true, data: response };
    } catch (error: any) {
      console.error("Debug processing error:", error);
      return { success: false, error: error.message || "处理调试请求失败" };
    }
  }

  /**
   * 根据API提供商和模型配置，获取实际的模型名称
   */
  private getModelName(configModel: string, apiProvider: string): string {
    // 如果没有配置模型，使用默认值
    if (!configModel) {
      switch (apiProvider) {
        case "openai":
          return "gpt-4o";
        case "gemini":
          return "gemini-2.0-flash";
        case "anthropic":
          return "claude-3-7-sonnet-20250219";
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
        } else if (configModel.includes('gemini-2.0-flash')) {
          return 'gemini-2.0-flash';
        }
        return 'gemini-2.0-flash'; // 默认
      case "anthropic":
        // Claude模型在ismaque.org上的对应名称
        if (configModel.includes('claude-3-7-sonnet')) {
          return 'claude-3-7-sonnet-20250219';
        } else if (configModel.includes('claude-3-5-sonnet')) {
          return 'claude-3-5-sonnet-20241022';
        } else if (configModel.includes('claude-3-opus')) {
          return 'claude-3-opus-20240229';
        }
        return 'claude-3-7-sonnet-20250219'; // 默认
      default:
        return configModel;
    }
  }

  public cancelOngoingRequests(): void {
    let wasCancelled = false

    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
      wasCancelled = true
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
      wasCancelled = true
    }

    this.deps.setHasDebugged(false)

    this.deps.setProblemInfo(null)

    const mainWindow = this.deps.getMainWindow()
    if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
    }
  }
}
