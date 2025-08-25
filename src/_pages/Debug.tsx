// Debug.tsx
import { useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useEffect, useRef, useState } from "react"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import SolutionCommands from "../components/Solutions/SolutionCommands"
import { Screenshot } from "../types/screenshots"
import { ComplexitySection, ContentSection, SolutionSection } from "./Solutions"
import { useToast } from "../contexts/toast"
import { useLanguageConfig } from "../hooks/useLanguageConfig"
import { isMacOS, COMMAND_KEY } from "../utils/platform"


async function fetchScreenshots(): Promise<Screenshot[]> {
  try {
    const existing = await window.electronAPI.getScreenshots()
    console.log("Raw screenshot data in Debug:", existing)
    return (Array.isArray(existing) ? existing : []).map((p) => ({
      id: p.path,
      path: p.path,
      preview: p.preview,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error("Error loading screenshots:", error)
    throw error
  }
}

// 🆕 解析调试内容的函数
function parseDebugContent(fullContent: string) {
  let code = ''
  let thoughts: string[] = []
  let timeComplexity = "基于调试分析"
  let spaceComplexity = "基于调试分析"
  let analysis = fullContent

  // 提取代码实现部分
  const codeImplMatch = fullContent.match(/\*\*代码实现：?\*\*[\s\S]*?```(?:\w+)?\s*([\s\S]*?)```/i)
  if (codeImplMatch) {
    code = codeImplMatch[1].trim()
  } else {
    // 后备方案：提取第一个代码块
    const codeMatch = fullContent.match(/```(?:\w+)?\s*([\s\S]*?)```/)
    if (codeMatch) {
      code = codeMatch[1].trim()
    } else {
      code = '// 调试模式 - 请查看下方的完整分析'
    }
  }

  // 处理Unicode转义序列
  if (code && typeof code === 'string') {
    code = code
      .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
      .trim()
  }

  // 提取思路
  const thoughtsMatch = fullContent.match(/\*\*(?:解题思路|思路|分析思路)：?\*\*\s*([\s\S]*?)(?:\*\*|$)/i)
  if (thoughtsMatch) {
    const thoughtsText = thoughtsMatch[1].trim()
    thoughts = thoughtsText.split(/[-•]\s*/).filter(thought => thought.trim().length > 0).map(thought => thought.trim())
  }
  
  if (thoughts.length === 0) {
    thoughts = ["基于截图的调试分析"]
  }

  // 提取复杂度（去掉详细解释，只保留O(...)部分）
  const timeComplexityMatch = fullContent.match(/时间复杂度[：:]\s*(O\([^)]+\))/i)
  if (timeComplexityMatch) {
    timeComplexity = timeComplexityMatch[1]
  }

  const spaceComplexityMatch = fullContent.match(/空间复杂度[：:]\s*(O\([^)]+\))/i)
  if (spaceComplexityMatch) {
    spaceComplexity = spaceComplexityMatch[1]
  }

  return {
    code,
    thoughts,
    timeComplexity,
    spaceComplexity,
    analysis
  }
}

interface DebugProps {
  isProcessing: boolean
  setIsProcessing: (isProcessing: boolean) => void
}

const Debug: React.FC<DebugProps> = ({
  isProcessing,
  setIsProcessing
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const { showToast } = useToast()
  const { language: currentLanguage } = useLanguageConfig()

  const { data: screenshots = [], refetch } = useQuery<Screenshot[]>({
    queryKey: ["screenshots"],
    queryFn: fetchScreenshots,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false
  })

  const [newCode, setNewCode] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<string[] | null>(null)
  const [timeComplexityData, setTimeComplexityData] = useState<string | null>(
    null
  )
  const [spaceComplexityData, setSpaceComplexityData] = useState<string | null>(
    null
  )
  const [debugAnalysis, setDebugAnalysis] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)

  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Try to get the new solution data from cache first
    const newSolution = queryClient.getQueryData(["new_solution"]) as {
      code: string
      debug_analysis: string
      thoughts: string[]
      time_complexity: string
      space_complexity: string
    } | null

    // If we have cached data, set all state variables to the cached data
    if (newSolution) {
      console.log("Found cached debug solution:", newSolution);
      
      // 🆕 完全复制编程题搜题的代码处理方式，包括字符编码检查
      console.log('🔍 调试模式原始代码数据:', {
        hasCode: !!newSolution.code,
        codeType: typeof newSolution.code,
        originalLength: newSolution.code?.length || 0,
        containsBackslashN: newSolution.code?.includes('\\n') || false,
        containsRealNewlines: newSolution.code?.includes('\n') || false,
        rawPreview: newSolution.code?.substring(0, 150) || ''
      });
      
      // 🆕 完整的字符转义处理，包括Unicode转义序列
      let cleanCode = "// Debug mode - see analysis below";
      if (newSolution.code && typeof newSolution.code === 'string') {
        cleanCode = newSolution.code
          // 1. 处理Unicode转义序列（如 \u003c -> <, \u003e -> >）
          .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
          })
          // 2. 处理转义的换行符
          .replace(/\\n/g, '\n')
          // 3. 处理其他常见转义序列
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, '\\')
          .trim();
      }
      
      console.log('🔧 调试模式代码处理后结果:', {
        processedLength: cleanCode.length,
        hasNewlines: cleanCode.includes('\n'),
        lineCount: cleanCode.split('\n').length,
        firstTwoLines: cleanCode.split('\n').slice(0, 2),
        processedPreview: cleanCode.substring(0, 150).replace(/\n/g, '\\n')
      });
      setNewCode(cleanCode);
      setThoughtsData(newSolution.thoughts || ["Debug analysis based on your screenshots"]);
      setTimeComplexityData(newSolution.time_complexity || "N/A - Debug mode");
      setSpaceComplexityData(newSolution.space_complexity || "N/A - Debug mode");
      
      // 保存完整的调试分析内容供分析区域显示
      if (newSolution.debug_analysis) {
        setDebugAnalysis(newSolution.debug_analysis);
      }
      
      setIsProcessing(false)
    }

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onDebugSuccess((data) => {
        console.log("Debug success event received with data:", data);
        queryClient.setQueryData(["new_solution"], data);
        
        // 🆕 完全复制编程题搜题的代码处理方式，包括字符编码检查
        console.log('🔍 调试模式事件原始代码数据:', {
          hasCode: !!data.code,
          codeType: typeof data.code,
          originalLength: data.code?.length || 0,
          containsBackslashN: data.code?.includes('\\n') || false,
          containsRealNewlines: data.code?.includes('\n') || false,
          rawPreview: data.code?.substring(0, 150) || ''
        });
        
        // 🆕 完整的字符转义处理，包括Unicode转义序列
        let cleanCode = "// Debug mode - see analysis below";
        if (data.code && typeof data.code === 'string') {
          cleanCode = data.code
            // 1. 处理Unicode转义序列（如 \u003c -> <, \u003e -> >）
            .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
              return String.fromCharCode(parseInt(hex, 16));
            })
            // 2. 处理转义的换行符
            .replace(/\\n/g, '\n')
            // 3. 处理其他常见转义序列
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\\/g, '\\')
            .trim();
        }
        
        console.log('🔧 调试模式事件代码处理后结果:', {
          processedLength: cleanCode.length,
          hasNewlines: cleanCode.includes('\n'),
          lineCount: cleanCode.split('\n').length,
          firstTwoLines: cleanCode.split('\n').slice(0, 2),
          processedPreview: cleanCode.substring(0, 150).replace(/\n/g, '\\n')
        });
        setNewCode(cleanCode);
        setThoughtsData(data.thoughts || ["Debug analysis based on your screenshots"]);
        setTimeComplexityData(data.time_complexity || "N/A - Debug mode");
        setSpaceComplexityData(data.space_complexity || "N/A - Debug mode");
        
        // 保存完整的调试分析内容供分析区域显示
        if (data.debug_analysis) {
          setDebugAnalysis(data.debug_analysis);
        }
        
        setIsProcessing(false);
      }),
      
      window.electronAPI.onDebugStart(() => {
        setIsProcessing(true)
        setIsStreaming(true)
        // 🆕 清空前端显示
        setNewCode(null)
        setThoughtsData(null)
        setTimeComplexityData(null)
        setSpaceComplexityData(null)
        setDebugAnalysis(null)
        setStreamingContent('')
      }),
      window.electronAPI.onDebugError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error debugging your code.",
          "error"
        )
        setIsProcessing(false)
        console.error("Processing error:", error)
      }),

      // 🆕 调试模式流式输出监听器
      window.electronAPI.onDebugStreamChunk?.((data: any) => {
        console.log('🌊 收到调试流式数据:', data);
        
        if (data.isComplete) {
          // 流式完成，解析最终内容
          const parsed = parseDebugContent(data.fullContent);
          setNewCode(parsed.code);
          setThoughtsData(parsed.thoughts);
          setTimeComplexityData(parsed.timeComplexity);
          setSpaceComplexityData(parsed.spaceComplexity);
          setDebugAnalysis(parsed.analysis);
          setIsProcessing(false);
          setIsStreaming(false);
          setStreamingContent('');
        } else {
          // 流式进行中，更新显示内容
          setStreamingContent(data.fullContent || '');
        }
      }) || (() => {})
    ]

    // 🆕 监听全局快捷键事件（来自主进程）
    const handleHorizontalScroll = (data: { direction: string }) => {
      console.log('🔄 [Debug] 收到水平滚动事件:', data.direction)
      
      // 查找代码容器并滚动
      const codeContainers = document.querySelectorAll('pre, code')
      
      codeContainers.forEach((container) => {
        if (container instanceof HTMLElement && container.scrollWidth > container.clientWidth) {
          const scrollAmount = 100
          const currentScroll = container.scrollLeft
          
          if (data.direction === 'left') {
            container.scrollLeft = Math.max(0, currentScroll - scrollAmount)
            console.log(`⬅️ [Debug] 左滚动: ${currentScroll} -> ${container.scrollLeft}`)
          } else if (data.direction === 'right') {
            const maxScroll = container.scrollWidth - container.clientWidth
            container.scrollLeft = Math.min(maxScroll, currentScroll + scrollAmount)
            console.log(`➡️ [Debug] 右滚动: ${currentScroll} -> ${container.scrollLeft}`)
          }
        }
      })
    }

    // 监听来自主进程的水平滚动事件
    const unsubscribeScrolling = window.electronAPI.onScrollCodeHorizontal(handleHorizontalScroll)
    cleanupFunctions.push(unsubscribeScrolling)

    // Set up resize observer
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (tooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [queryClient, setIsProcessing])

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setTooltipVisible(visible)
    setTooltipHeight(height)
  }

  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch()
      } else {
        console.error("Failed to delete extra screenshot:", response.error)
      }
    } catch (error) {
      console.error("Error deleting extra screenshot:", error)
    }
  }

  return (
    <div ref={contentRef} className="relative">
      <div className="space-y-3 px-4 py-3">
      {/* Conditionally render the screenshot queue */}
      <div className="bg-transparent w-fit top-area">
        <div className="pb-3">
          <div className="space-y-3 w-fit">
            <ScreenshotQueue
              screenshots={screenshots}
              onDeleteScreenshot={handleDeleteExtraScreenshot}
              isLoading={isProcessing}
            />
          </div>
        </div>
      </div>

      {/* Navbar of commands with the tooltip */}
      <div className="top-area">
        <SolutionCommands
          screenshots={screenshots}
          onTooltipVisibilityChange={handleTooltipVisibilityChange}
          isProcessing={isProcessing}
          extraScreenshots={screenshots}
          credits={window.__CREDITS__}
        />
      </div>

      {/* Main Content */}
      <div className="w-full text-sm text-black opacity-controlled-bg rounded-md pointer-events-none main-content">
        <div className="rounded-lg overflow-hidden">
          <div className="px-4 py-3 space-y-4 max-w-full">
            {/* 完全复制Solutions的结构 */}
            {(newCode || isStreaming) && (
              <>
                <ContentSection
                  title={`我的思路 (${COMMAND_KEY} + 方向键滚动)${isStreaming ? ' - 正在生成...' : ''}`}
                  content={
                    thoughtsData && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          {thoughtsData.map((thought, index) => (
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
                          
                          {/* 流式模式下的思路生成提示 */}
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

                <SolutionSection
                  title={`调试代码 (${COMMAND_KEY} + Shift + ← → 水平滚动)`}
                  content={newCode}
                  isLoading={!newCode && !isStreaming}
                  currentLanguage={currentLanguage}
                  isStreaming={isStreaming}
                  streamingContent={streamingContent}
                />

                <ComplexitySection
                  timeComplexity={timeComplexityData}
                  spaceComplexity={spaceComplexityData}
                  isLoading={!timeComplexityData || !spaceComplexityData}
                />
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Debug
