// Solutions.tsx
import React, { useState, useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

import ScreenshotQueue from "../components/Queue/ScreenshotQueue"

import { ProblemStatementData, SolutionData, MultipleChoiceAnswer } from "../types/solutions"
import SolutionCommands from "../components/Solutions/SolutionCommands"
import Debug from "./Debug"
import { useToast } from "../contexts/toast"
import { COMMAND_KEY } from "../utils/platform"
import { useLanguageConfig } from "../hooks/useLanguageConfig"
import { parseStreamedSolution, shouldStartDisplaying } from "../utils/streamParser"

export const ContentSection = ({
  title,
  content,
  isLoading
}: {
  title: string
  content: React.ReactNode
  isLoading: boolean
}) => (
  <div className="space-y-2">
    <h2 className="text-[13px] font-medium text-white tracking-wide">
      {title}
    </h2>
    {isLoading ? (
      <div className="mt-4 flex">
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
          提取问题描述中...
        </p>
      </div>
    ) : (
      <div className="text-[13px] leading-[1.4] text-gray-100 max-w-[600px]">
        {content}
      </div>
    )}
  </div>
)
const SolutionSection = ({
  title,
  content,
  isLoading,
  currentLanguage,
  // 🆕 流式相关属性
  isStreaming,
  streamingContent,
  streamingProgress
}: {
  title: string
  content: React.ReactNode
  isLoading: boolean
  currentLanguage: string
  // 🆕 流式相关属性类型
  isStreaming?: boolean
  streamingContent?: string
  streamingProgress?: number
}) => {
  const [copied, setCopied] = useState(false)
  const [showCopyButton, setShowCopyButton] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await window.electronAPI.getConfig()
        setShowCopyButton(config.showCopyButton !== false)
      } catch (error) {
        console.error("Failed to load copy button config:", error)
      }
    }
    fetchConfig()
  }, [])

  const copyToClipboard = () => {
    // 🆕 优先复制流式内容，否则复制最终内容
    const textToCopy = (isStreaming && streamingContent) ? streamingContent : content
    if (typeof textToCopy === "string") {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  // 🆕 决定显示什么内容：流式内容 > 最终内容
  let displayContent = content
  
  if (isStreaming && streamingContent) {
    // 🔧 从流式内容中提取代码部分进行显示
    const codeMatch = streamingContent.match(/```[\w]*\n?([\s\S]*?)(?:```|$)/)
    if (codeMatch && codeMatch[1]) {
      // 找到代码块，显示代码内容
      displayContent = codeMatch[1]
    } else {
      // 没有找到完整代码块，尝试查找部分代码
      const partialCodeMatch = streamingContent.match(/```[\w]*\n?([\s\S]*)$/)
      if (partialCodeMatch && partialCodeMatch[1]) {
        displayContent = partialCodeMatch[1]
      } else {
        // 如果没有代码块标记，检查是否包含代码关键字，如果是则显示原始内容
        if (streamingContent.includes('def ') || streamingContent.includes('function') || 
            streamingContent.includes('class ') || streamingContent.includes('import') ||
            streamingContent.includes('public ') || streamingContent.includes('#include') ||
            streamingContent.includes('var ') || streamingContent.includes('let ') ||
            streamingContent.includes('const ') || streamingContent.includes('int main')) {
          displayContent = streamingContent
        } else {
          // 如果当前内容不像代码，则保持显示已有的内容或空
          displayContent = content || ""
        }
      }
    }
  }
  
  const showStreamingIndicator = isStreaming && streamingProgress !== undefined
  
  return (
    <div className="space-y-2 relative">
      <h2 className="text-[13px] font-medium text-white tracking-wide flex items-center gap-2">
        {title}
        {/* 🆕 流式状态指示器 */}
        {showStreamingIndicator && (
          <div className="flex items-center gap-1 text-xs text-blue-400">
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
            <span>正在生成... {streamingProgress}%</span>
          </div>
        )}
      </h2>
      {isLoading && !isStreaming ? (
        <div className="space-y-1.5">
          <div className="mt-4 flex">
            <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
              加载解决方案中...
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full relative pointer-events-none">
          {showCopyButton && (
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 text-xs text-white bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition pointer-events-auto z-10"
            >
              {copied ? "已复制!" : "复制"}
            </button>
          )}
          <div>
            <SyntaxHighlighter
              key={isStreaming ? `streaming-${streamingContent?.length || 0}` : 'static'}
              showLineNumbers
              language={
                currentLanguage === "Go" || currentLanguage === "Golang" ? "go" : 
                currentLanguage === "JavaScript" ? "javascript" :
                currentLanguage === "TypeScript" ? "typescript" :
                currentLanguage === "Cpp" || currentLanguage === "C++" ? "cpp" :
                currentLanguage === "Csharp" || currentLanguage === "C#" ? "csharp" :
                currentLanguage === "Java" ? "java" :
                currentLanguage === "Python" ? "python" :
                currentLanguage === "Swift" ? "swift" :
                currentLanguage === "Kotlin" ? "kotlin" :
                currentLanguage === "Ruby" ? "ruby" :
                currentLanguage === "Php" || currentLanguage === "PHP" ? "php" :
                currentLanguage === "Scala" ? "scala" :
                currentLanguage === "Rust" ? "rust" :
                currentLanguage === "Sql" || currentLanguage === "SQL" ? "sql" :
                currentLanguage === "R" ? "r" :
                currentLanguage.toLowerCase()
              }
              style={dracula}
              customStyle={{
                maxWidth: "100%",
                margin: 0,
                padding: "1rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                backgroundColor: "rgba(22, 27, 34, 0.5)",
                userSelect: "none",
                // 🆕 流式模式的视觉效果
                ...(isStreaming && {
                  borderRight: "2px solid #3b82f6",
                  animation: "pulse 1.5s ease-in-out infinite"
                })
              }}
              wrapLongLines={true}
              className={`pointer-events-none ${isStreaming ? 'streaming-code' : ''}`}
            >
              {displayContent as string}
            </SyntaxHighlighter>
            
            {/* 🆕 流式模式下的光标效果 */}
            {isStreaming && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-blue-400 bg-black/50 px-2 py-1 rounded">
                <div className="w-1 h-3 bg-blue-400 animate-pulse"></div>
                <span>生成中...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const ComplexitySection = ({
  timeComplexity,
  spaceComplexity,
  isLoading
}: {
  timeComplexity: string | null
  spaceComplexity: string | null
  isLoading: boolean
}) => {
  // Helper to ensure we have proper complexity values
  const formatComplexity = (complexity: string | null): string => {
    // Default if no complexity returned by LLM
    if (!complexity || complexity.trim() === "") {
      return "复杂度不可用";
    }

    const bigORegex = /O\([^)]+\)/i;
    // Return the complexity as is if it already has Big O notation
    if (bigORegex.test(complexity)) {
      return complexity;
    }
    
    // Concat Big O notation to the complexity
    return `O(${complexity})`;
  };
  
  const formattedTimeComplexity = formatComplexity(timeComplexity);
  const formattedSpaceComplexity = formatComplexity(spaceComplexity);
  
  return (
    <div className="space-y-2">
      <h2 className="text-[13px] font-medium text-white tracking-wide">
        复杂度
      </h2>
      {isLoading ? (
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
          计算复杂度中...
        </p>
      ) : (
        <div className="space-y-3">
          <div className="text-[13px] leading-[1.4] text-gray-100 bg-white/5 rounded-md p-3">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
              <div>
                <strong>Time:</strong> {formattedTimeComplexity}
              </div>
            </div>
          </div>
          <div className="text-[13px] leading-[1.4] text-gray-100 bg-white/5 rounded-md p-3">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
              <div>
                <strong>Space:</strong> {formattedSpaceComplexity}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 选择题答案显示组件
export const MultipleChoiceSection = ({
  answers,
  isLoading
}: {
  answers: Array<{
    question_number: string;
    answer: string;
    reasoning?: string;
  }> | null;
  isLoading: boolean;
}) => {
  return (
    <div className="space-y-2">
      <h2 className="text-[13px] font-medium text-white tracking-wide">
        答案
      </h2>
      {isLoading ? (
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
          分析选择题中...
        </p>
      ) : (
        <div className="space-y-3">
          {answers?.map((answer, index) => (
            <div key={index} className="text-[13px] leading-[1.4] text-gray-100 bg-white/5 rounded-md p-3">
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-green-400/80 mt-2 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <strong>题目 {answer.question_number}:</strong>
                    <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs font-semibold">
                      {answer.answer}
                    </span>
                  </div>
                  {answer.reasoning && (
                    <div className="text-gray-300 text-xs mt-1">
                      {answer.reasoning}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface SolutionsProps {
  setView: (view: "queue" | "solutions" | "debug") => void
  credits: number
}
const Solutions: React.FC<SolutionsProps> = ({
  setView,
  credits
}) => {
  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)
  const { language: currentLanguage } = useLanguageConfig()

  const [debugProcessing, setDebugProcessing] = useState(false)
  const [problemStatementData, setProblemStatementData] =
    useState<ProblemStatementData | null>(null)
  const [solutionData, setSolutionData] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<string[] | null>(null)
  const [timeComplexityData, setTimeComplexityData] = useState<string | null>(
    null
  )
  const [spaceComplexityData, setSpaceComplexityData] = useState<string | null>(
    null
  )
  const [multipleChoiceAnswers, setMultipleChoiceAnswers] = useState<MultipleChoiceAnswer[] | null>(null)

  // 🆕 流式输出状态管理
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [streamingProgress, setStreamingProgress] = useState<number>(0)
  const [streamingParsedData, setStreamingParsedData] = useState<any>(null)

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)

  const [isResetting, setIsResetting] = useState(false)

  interface Screenshot {
    id: string
    path: string
    preview: string
    timestamp: number
  }

  const [extraScreenshots, setExtraScreenshots] = useState<Screenshot[]>([])

  useEffect(() => {
    const fetchScreenshots = async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        console.log("Raw screenshot data:", existing)
        const screenshots = (Array.isArray(existing) ? existing : []).map(
          (p) => ({
            id: p.path,
            path: p.path,
            preview: p.preview,
            timestamp: Date.now()
          })
        )
        console.log("Processed screenshots:", screenshots)
        setExtraScreenshots(screenshots)
      } catch (error) {
        console.error("Error loading extra screenshots:", error)
        setExtraScreenshots([])
      }
    }

    fetchScreenshots()
  }, [solutionData])

  const { showToast } = useToast()

  useEffect(() => {
    // Height update logic
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    // Initialize resize observer
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(async () => {
        try {
          const existing = await window.electronAPI.getScreenshots()
          const screenshots = (Array.isArray(existing) ? existing : []).map(
            (p) => ({
              id: p.path,
              path: p.path,
              preview: p.preview,
              timestamp: Date.now()
            })
          )
          setExtraScreenshots(screenshots)
        } catch (error) {
          console.error("Error loading extra screenshots:", error)
        }
      }),
      window.electronAPI.onResetView(() => {
        // Set resetting state first
        setIsResetting(true)

        // Remove queries
        queryClient.removeQueries({
          queryKey: ["solution"]
        })
        queryClient.removeQueries({
          queryKey: ["new_solution"]
        })

        // Reset screenshots
        setExtraScreenshots([])

        // After a small delay, clear the resetting state
        setTimeout(() => {
          setIsResetting(false)
        }, 0)
      }),
      window.electronAPI.onSolutionStart(() => {
        // Every time processing starts, reset relevant states
        setSolutionData(null)
        setThoughtsData(null)
        setTimeComplexityData(null)
        setSpaceComplexityData(null)
        
        // 🆕 重置流式状态，但不设置为false，让流式事件自己控制
        // setIsStreaming(false) - 移除这行，让流式事件自己管理
        setStreamingContent('')
        setStreamingProgress(0)
        setStreamingParsedData(null)
      }),
      window.electronAPI.onProblemExtracted((data) => {
        queryClient.setQueryData(["problem_statement"], data)
      }),
      //if there was an error processing the initial solution
      window.electronAPI.onSolutionError((error: string) => {
        showToast("处理失败", error, "error")
        // Reset solutions in the cache (even though this shouldn't ever happen) and complexities to previous states
        const solution = queryClient.getQueryData(["solution"]) as {
          code: string
          thoughts: string[]
          time_complexity: string
          space_complexity: string
        } | null
        if (!solution) {
          setView("queue")
        }
        setSolutionData(solution?.code || null)
        setThoughtsData(solution?.thoughts || null)
        setTimeComplexityData(solution?.time_complexity || null)
        setSpaceComplexityData(solution?.space_complexity || null)
        console.error("Processing error:", error)
      }),
      //when the initial solution is generated, we'll set the solution data to that
      window.electronAPI.onSolutionSuccess((data) => {
        if (!data) {
          console.warn("Received empty or invalid solution data")
          return
        }
        console.log("📨 Received solution data:", { data })

        // Save original data to query cache, including type information
        queryClient.setQueryData(["solution"], data)

        // Set state based on data type
        if (data.type === 'multiple_choice') {
          // Multiple choice data processing
          console.log("🎯 Processing multiple choice data")
          setSolutionData(null) // Multiple choice doesn't show code
          setThoughtsData(data.thoughts || null)
          setTimeComplexityData(null) // Multiple choice doesn't show complexity
          setSpaceComplexityData(null)
          setMultipleChoiceAnswers(data.answers || null)
        } else {
          // Programming problem data processing
          console.log("💻 Processing programming problem data")
          setSolutionData(data.code || null)
          setThoughtsData(data.thoughts || null)
          setTimeComplexityData(data.time_complexity || null)
          setSpaceComplexityData(data.space_complexity || null)
          setMultipleChoiceAnswers(null)
        }

        // Fetch latest screenshots when solution is successful
        const fetchScreenshots = async () => {
          try {
            const existing = await window.electronAPI.getScreenshots()
            const screenshots =
              existing.previews?.map((p) => ({
                id: p.path,
                path: p.path,
                preview: p.preview,
                timestamp: Date.now()
              })) || []
            setExtraScreenshots(screenshots)
          } catch (error) {
            console.error("Error loading extra screenshots:", error)
            setExtraScreenshots([])
          }
        }
        fetchScreenshots()
      }),

      //########################################################
      //DEBUG EVENTS
      //########################################################
      window.electronAPI.onDebugStart(() => {
        //we'll set the debug processing state to true and use that to render a little loader
        setDebugProcessing(true)
      }),
      //the first time debugging works, we'll set the view to debug and populate the cache with the data
      window.electronAPI.onDebugSuccess((data) => {
        queryClient.setQueryData(["new_solution"], data)
        setDebugProcessing(false)
      }),
      //when there was an error in the initial debugging, we'll show a toast and stop the little generating pulsing thing.
      window.electronAPI.onDebugError(() => {
        showToast(
          "处理失败",
          "调试代码时发生错误",
          "error"
        )
        setDebugProcessing(false)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "无截图",
          "没有额外的截图需要处理",
          "neutral"
        )
      }),
      // 代码复制快捷键监听器 - 使用主进程clipboard API
      window.electronAPI.onRequestCodeForCopy(() => {
        console.log("📥 Received request-code-for-copy event, executing copy logic...")
        
        // 获取当前 solution 数据
        const solution = queryClient.getQueryData(["solution"]) as any
        
        // 检查是否有编程题代码
        if (solution?.code && typeof solution.code === "string") {
          console.log("✅ Found code, copying to clipboard via main process...")
          
          // 使用主进程的clipboard API
          window.electronAPI.copyCodeToClipboard(solution.code).then((result) => {
            if (result.success) {
              console.log("✅ Code copied successfully via main process")
              showToast(
                "复制成功",
                "代码已复制到剪贴板",
                "success"
              )
            } else {
              console.error("❌ Main process copy failed:", result.error)
              showToast(
                "复制失败",
                "无法复制代码到剪贴板",
                "error"
              )
            }
          }).catch((error) => {
            console.error("❌ Copy operation failed:", error)
            showToast(
              "复制失败",
              "无法复制代码到剪贴板",
              "error"
            )
          })
        } else {
          console.log("❌ No valid code found to copy")
          showToast(
            "复制失败",
            "没有找到可复制的代码",
            "error"
          )
        }
      }),
      // Removed out of credits handler - unlimited credits in this version
      
      // 🆕 流式输出事件监听器
      window.electronAPI.onSolutionStreamChunk((data) => {
        console.log('📥 收到流式数据块:', {
          deltaLength: data.delta?.length || 0,
          fullContentLength: data.fullContent?.length || 0,
          progress: data.progress,
          isComplete: data.isComplete
        })
        
        console.log('🔍 当前前端状态:', {
          isStreaming,
          streamingContent: streamingContent.substring(0, 50) + '...',
          solutionData: solutionData?.substring(0, 50) + '...' || 'null'
        })

        // 🆕 处理流式传输开始信号
        if (data.streamingStarted) {
          console.log('🚀 收到流式传输开始信号，激活流式模式')
          setIsStreaming(true)
          setStreamingContent('')
          setStreamingProgress(0)
          return
        }

        if (data.isComplete) {
          // 流式传输完成
          console.log('✅ 流式传输完成，最终内容长度:', data.fullContent?.length)
          
          // 🔧 保持流式内容显示更长时间，然后逐渐切换到最终状态
          setTimeout(() => {
            setIsStreaming(false)
            // 不要立即清空流式内容，让它自然切换到最终解析的内容
            // setStreamingContent('')
            setStreamingProgress(100)
          }, 1500) // 延迟1500ms切换，让用户充分看到流式完成效果
          
          // 解析完整内容并设置最终状态
          if (data.fullContent && shouldStartDisplaying(data.fullContent)) {
            const parsed = parseStreamedSolution(data.fullContent)
            console.log('📊 解析完成的流式内容:', parsed)
            
            // 根据类型设置相应的状态
            if (parsed.type === 'programming') {
              setSolutionData(parsed.code)
              setThoughtsData(parsed.thoughts)
              setTimeComplexityData(parsed.timeComplexity)
              setSpaceComplexityData(parsed.spaceComplexity)
              setMultipleChoiceAnswers(null)
            } else {
              setSolutionData(null)
              setThoughtsData(parsed.thoughts)
              setTimeComplexityData(null)
              setSpaceComplexityData(null)
              setMultipleChoiceAnswers(parsed.answers || null)
            }
            
            // 缓存到queryClient
            queryClient.setQueryData(["solution"], {
              type: parsed.type,
              code: parsed.code,
              thoughts: parsed.thoughts,
              time_complexity: parsed.timeComplexity,
              space_complexity: parsed.spaceComplexity,
              answers: parsed.answers
            })
          }
        } else if (data.fullContent && shouldStartDisplaying(data.fullContent)) {
          // 接收流式数据块
          console.log('📝 处理流式数据块，设置流式状态为true')
          setIsStreaming(true)
          setStreamingContent(data.fullContent)
          setStreamingProgress(data.progress || 0)
          
          // 实时解析内容用于预览
          const parsed = parseStreamedSolution(data.fullContent)
          setStreamingParsedData(parsed)
          
          console.log(`📝 流式内容更新: ${data.fullContent.length} 字符, 进度: ${data.progress}%`)
          console.log(`📄 流式内容预览: "${data.fullContent.substring(0, 100)}..."`)
        } else if (data.fullContent && data.fullContent.length > 0) {
          // 即使内容不满足shouldStartDisplaying，但有内容就开始流式显示
          console.log('📝 收到流式内容，强制开始流式显示')
          setIsStreaming(true)
          setStreamingContent(data.fullContent)
          setStreamingProgress(data.progress || 0)
        }
      }),

      window.electronAPI.onSolutionStreamError((error: string) => {
        console.error('❌ 流式传输错误:', error)
        setIsStreaming(false)
        setStreamingContent('')
        setStreamingProgress(0)
        setStreamingParsedData(null)
        
        showToast("流式处理失败", error, "error")
      }),
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [isTooltipVisible, tooltipHeight])

  useEffect(() => {
    setProblemStatementData(
      queryClient.getQueryData(["problem_statement"]) || null
    )
    
    // 正确处理初始解决方案数据
    const initialSolution = queryClient.getQueryData(["solution"]) as SolutionData | null
    if (initialSolution?.type === 'multiple_choice') {
      // 选择题：不设置代码数据
      setSolutionData(null)
      setMultipleChoiceAnswers(initialSolution?.answers ?? null)
    } else if (initialSolution) {
      // 编程题：设置代码数据
      setSolutionData(initialSolution?.code ?? null)
      setMultipleChoiceAnswers(null)
    } else {
      setSolutionData(null)
      setMultipleChoiceAnswers(null)
    }

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === "problem_statement") {
        setProblemStatementData(
          queryClient.getQueryData(["problem_statement"]) || null
        )
      }
      if (event?.query.queryKey[0] === "solution") {
        const solution = queryClient.getQueryData(["solution"]) as SolutionData | null

        // 根据解决方案类型处理不同的数据
        if (solution?.type === 'multiple_choice') {
          // 选择题：不显示代码，显示答案
          setSolutionData(null)
          setThoughtsData(solution?.thoughts ?? null)
          setTimeComplexityData(null)
          setSpaceComplexityData(null)
          setMultipleChoiceAnswers(solution?.answers ?? null)
        } else {
          // 编程题：显示代码和复杂度
          setSolutionData(solution?.code ?? null)
          setThoughtsData(solution?.thoughts ?? null)
          setTimeComplexityData(solution?.time_complexity ?? null)
          setSpaceComplexityData(solution?.space_complexity ?? null)
          setMultipleChoiceAnswers(null)
        }
      }
    })
    return () => unsubscribe()
  }, [queryClient])

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = extraScreenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        // Fetch and update screenshots after successful deletion
        const existing = await window.electronAPI.getScreenshots()
        const screenshots = (Array.isArray(existing) ? existing : []).map(
          (p) => ({
            id: p.path,
            path: p.path,
            preview: p.preview,
            timestamp: Date.now()
          })
        )
        setExtraScreenshots(screenshots)
      } else {
        console.error("Failed to delete extra screenshot:", response.error)
        showToast("错误", "删除截图失败", "error")
      }
    } catch (error) {
      console.error("Error deleting extra screenshot:", error)
      showToast("Error", "Failed to delete the screenshot", "error")
    }
  }

  return (
    <>
      {!isResetting && queryClient.getQueryData(["new_solution"]) ? (
        <Debug
          isProcessing={debugProcessing}
          setIsProcessing={setDebugProcessing}
        />
      ) : (
        <div ref={contentRef} className="relative">
          <div className="space-y-3 px-4 py-3">
          {/* Conditionally render the screenshot queue if solutionData is available */}
          {(solutionData || multipleChoiceAnswers) && (
            <div className="bg-transparent w-fit top-area">
              <div className="pb-3">
                <div className="space-y-3 w-fit">
                  <ScreenshotQueue
                    isLoading={debugProcessing}
                    screenshots={extraScreenshots}
                    onDeleteScreenshot={handleDeleteExtraScreenshot}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navbar of commands with the SolutionsHelper */}
          <div className="top-area">
            <SolutionCommands
              onTooltipVisibilityChange={handleTooltipVisibilityChange}
              isProcessing={!problemStatementData || (!solutionData && !multipleChoiceAnswers && !isStreaming)}
              extraScreenshots={extraScreenshots}
              credits={credits}
            />
          </div>

          {/* Main Content - Modified width constraints */}
          <div className="w-full text-sm text-black opacity-controlled-bg rounded-md pointer-events-none main-content">
            <div className="rounded-lg overflow-hidden">
              <div className="px-4 py-3 space-y-4 max-w-full">
                {!solutionData && !multipleChoiceAnswers && !isStreaming && (
                  <>
                    <ContentSection
                      title="问题描述"
                      content={problemStatementData?.problem_statement}
                      isLoading={!problemStatementData}
                    />
                    {problemStatementData && (
                      <div className="mt-4 flex">
                        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
                          生成解决方案中...
                        </p>
                      </div>
                    )}
                  </>
                )}

                {(solutionData || multipleChoiceAnswers || isStreaming) && (
                  <>
                    <ContentSection
                      title={`我的思路 (${COMMAND_KEY} + 方向键滚动)${isStreaming ? ' - 正在生成...' : ''}`}
                      content={
                        // 🆕 优先显示流式解析的思路，否则显示最终思路
                        (isStreaming && streamingParsedData?.thoughts?.length ? streamingParsedData.thoughts : thoughtsData) && (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              {(isStreaming && streamingParsedData?.thoughts?.length ? streamingParsedData.thoughts : thoughtsData || []).map((thought, index) => (
                                <div
                                  key={index}
                                  className={`flex items-start gap-2 ${isStreaming ? 'animate-fadeIn' : ''}`}
                                >
                                  <div className={`w-1 h-1 rounded-full mt-2 shrink-0 ${
                                    isStreaming ? 'bg-blue-400 animate-pulse' : 'bg-blue-400/80'
                                  }`} />
                                  <div className={isStreaming ? 'text-blue-100' : ''}>{thought}</div>
                                </div>
                              ))}
                              
                              {/* 🆕 流式模式下的思路生成提示 */}
                              {isStreaming && (
                                <div className="flex items-start gap-2 opacity-60">
                                  <div className="w-1 h-1 rounded-full bg-blue-400 mt-2 shrink-0 animate-ping" />
                                  <div className="text-blue-300 text-xs italic">思路分析中...</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      }
                      isLoading={!thoughtsData && !isStreaming}
                    />

                    {/* 编程题显示代码和复杂度 */}
                    {(solutionData || (isStreaming && streamingContent)) && (
                      <>
                        <SolutionSection
                          title="解决方案"
                          content={solutionData}
                          isLoading={!solutionData && !isStreaming}
                          currentLanguage={currentLanguage}
                          // 🆕 传递流式相关属性
                          isStreaming={isStreaming}
                          streamingContent={streamingContent} // 直接传递原始流式内容
                          streamingProgress={streamingProgress}
                        />

                        <ComplexitySection
                          timeComplexity={timeComplexityData}
                          spaceComplexity={spaceComplexityData}
                          isLoading={!timeComplexityData || !spaceComplexityData}
                        />
                      </>
                    )}

                    {/* 选择题显示答案 */}
                    {multipleChoiceAnswers && multipleChoiceAnswers.length > 0 && (
                      <MultipleChoiceSection
                        answers={multipleChoiceAnswers}
                        isLoading={!multipleChoiceAnswers}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  )
}

export default Solutions
