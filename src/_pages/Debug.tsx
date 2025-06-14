// Debug.tsx
import { useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useEffect, useRef, useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import SolutionCommands from "../components/Solutions/SolutionCommands"
import { Screenshot } from "../types/screenshots"
import { ComplexitySection, ContentSection } from "./Solutions"

// Import SolutionSection for consistent display
const SolutionSection = ({
  title,
  content,
  isLoading,
  currentLanguage
}: {
  title: string
  content: React.ReactNode
  isLoading: boolean
  currentLanguage: string
}) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    if (typeof content === "string") {
      navigator.clipboard.writeText(content).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <div className="space-y-2 relative">
      <h2 className="text-[13px] font-medium text-white tracking-wide">
        {title}
      </h2>
      {isLoading ? (
        <div className="space-y-1.5">
          <div className="mt-4 flex">
            <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
              Loading solutions...
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full relative">
          <button
            onClick={copyToClipboard}
            className="absolute top-2 right-2 text-xs text-white bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <SyntaxHighlighter
            showLineNumbers
            language={currentLanguage == "golang" ? "go" : currentLanguage}
            style={dracula}
            customStyle={{
              maxWidth: "100%",
              margin: 0,
              padding: "1rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              backgroundColor: "rgba(22, 27, 34, 0.5)"
            }}
            wrapLongLines={true}
          >
            {content as string}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  )
}
import { useToast } from "../contexts/toast"



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

interface DebugProps {
  isProcessing: boolean
  setIsProcessing: (isProcessing: boolean) => void
  currentLanguage: string
  setLanguage: (language: string) => void
}

const Debug: React.FC<DebugProps> = ({
  isProcessing,
  setIsProcessing,
  currentLanguage,
  setLanguage
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const { showToast } = useToast()

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
  const [modifications, setModifications] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Try to get the new solution data from cache first
    const newSolution = queryClient.getQueryData(["new_solution"]) as {
      code: string
      thoughts: string[]
      time_complexity: string
      space_complexity: string
      modifications: string
    } | null

    // If we have cached data, set all state variables to the cached data
    if (newSolution) {
      console.log("Found cached debug solution:", newSolution);
      
      setNewCode(newSolution.code || "// Debug mode - see analysis below");
      setThoughtsData(newSolution.thoughts || ["Debug analysis based on your screenshots"]);
      setTimeComplexityData(newSolution.time_complexity || "N/A - Debug mode");
      setSpaceComplexityData(newSolution.space_complexity || "N/A - Debug mode");
      setModifications(newSolution.modifications || "基于截图分析的代码修改和优化");
      setIsProcessing(false);
    }

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onDebugSuccess((data: any) => {
        console.log("Debug success event received with data:", data);
        queryClient.setQueryData(["new_solution"], data);
        
        // Also update local state for immediate rendering
        setNewCode(data.code || "// Debug mode - see analysis below");
        setThoughtsData(data.thoughts || ["Debug analysis based on your screenshots"]);
        setTimeComplexityData(data.time_complexity || "N/A - Debug mode");
        setSpaceComplexityData(data.space_complexity || "N/A - Debug mode");
        setModifications(data.modifications || "基于截图分析的代码修改和优化");
        
        setIsProcessing(false);
      }),
      
      window.electronAPI.onDebugStart(() => {
        setIsProcessing(true)
      }),
      window.electronAPI.onDebugError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error debugging your code.",
          "error"
        )
        setIsProcessing(false)
        console.error("Processing error:", error)
      })
    ]

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
      <div className="bg-transparent w-fit">
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
      <SolutionCommands
        screenshots={screenshots}
        onTooltipVisibilityChange={handleTooltipVisibilityChange}
        isProcessing={isProcessing}
        extraScreenshots={screenshots}
        credits={window.__CREDITS__}
        currentLanguage={currentLanguage}
        setLanguage={setLanguage}
      />

      {/* Main Content */}
      <div className="w-full text-sm text-black bg-black/60 rounded-md">
        <div className="rounded-lg overflow-hidden">
          <div className="px-4 py-3 space-y-4">
            {newCode && (
              <>
                <ContentSection
                  title={`My Thoughts (${/Mac|iPhone|iPod|iPad/.test(navigator.userAgent) ? 'Cmd' : 'Ctrl'} + Arrow keys to scroll)`}
                  content={
                    thoughtsData && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          {thoughtsData.map((thought, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2"
                            >
                              <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
                              <div>{thought}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  isLoading={!thoughtsData}
                />

                <SolutionSection
                  title="Solution"
                  content={newCode}
                  isLoading={!newCode}
                  currentLanguage={currentLanguage}
                />

                <ComplexitySection
                  timeComplexity={timeComplexityData}
                  spaceComplexity={spaceComplexityData}
                  isLoading={!timeComplexityData || !spaceComplexityData}
                />

                {/* Additional Modifications Section for Debug Mode */}
                <ContentSection
                  title="What I Changed"
                  content={
                    modifications && (
                      <div className="space-y-2">
                        <div className="text-[13px] leading-[1.4] text-gray-100 whitespace-pre-wrap">
                          {modifications}
                        </div>
                      </div>
                    )
                  }
                  isLoading={!modifications}
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
