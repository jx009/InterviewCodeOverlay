import React, { useState, useEffect, useRef } from "react"
import { useToast } from "../../contexts/toast"
import { Screenshot } from "../../types/screenshots"
import { COMMAND_KEY } from "../../utils/platform"
import { useWebAuth } from "../../hooks/useWebAuth"

export interface SolutionCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  isProcessing: boolean
  screenshots?: Screenshot[]
  extraScreenshots?: Screenshot[]
  credits: number
}


const SolutionCommands: React.FC<SolutionCommandsProps> = ({
  onTooltipVisibilityChange,
  isProcessing,
  extraScreenshots = [],
  credits
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()
  
  // 🆕 使用增强认证
  const { 
    authenticated, 
    user, 
    logout: webLogout, 
    loading: authLoading 
  } = useWebAuth()

  // 🆕 增强认证登出处理
  const handleSignOut = async () => {
    try {
      showToast('正在登出...', '请稍等', 'loading');
      const result = await webLogout();
      
      if (result.success) {
        showToast('登出成功', '已成功退出登录', 'success');
      } else {
        showToast('登出失败', result.error || '请重试', 'error');
      }
    } catch (error) {
      console.error('登出错误:', error);
      showToast('登出失败', '网络错误，请重试', 'error');
    }
  }

  useEffect(() => {
    if (onTooltipVisibilityChange) {
      let tooltipHeight = 0
      if (tooltipRef.current && isTooltipVisible) {
        tooltipHeight = tooltipRef.current.offsetHeight + 10 // Adjust if necessary
      }
      onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
    }
  }, [isTooltipVisible, onTooltipVisibilityChange])

  const handleMouseEnter = () => {
    setIsTooltipVisible(true)
  }

  const handleMouseLeave = () => {
    setIsTooltipVisible(false)
  }

  return (
    <div>
      <div className="pt-2 w-fit">
        <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-4">
          {/* Show/Hide - Always visible */}
          <div
            className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
            onClick={async () => {
              try {
                const result = await window.electronAPI.toggleMainWindow()
                if (!result.success) {
                  console.error("Failed to toggle window:", result.error)
                  showToast("错误", "切换窗口失败", "error")
                }
              } catch (error) {
                console.error("Error toggling window:", error)
                showToast("错误", "切换窗口失败", "error")
              }
            }}
          >
            <span className="text-[11px] leading-none">显示/隐藏</span>
            <div className="flex gap-1">
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                {COMMAND_KEY}
              </button>
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                B
              </button>
            </div>
          </div>

          {/* Screenshot and Debug commands - Only show if not processing */}
          {!isProcessing && (
            <>
              <div
                className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                onClick={async () => {
                  try {
                    const result = await window.electronAPI.triggerScreenshot()
                    if (!result.success) {
                      console.error("Failed to take screenshot:", result.error)
                      showToast("错误", "截屏失败", "error")
                    }
                  } catch (error) {
                    console.error("Error taking screenshot:", error)
                    showToast("错误", "截屏失败", "error")
                  }
                }}
              >
                <span className="text-[11px] leading-none truncate">
                  {extraScreenshots.length === 0
                    ? "截取你的代码"
                    : "截屏"}
                </span>
                <div className="flex gap-1">
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    {COMMAND_KEY}
                  </button>
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    H
                  </button>
                </div>
              </div>

              {extraScreenshots.length > 0 && (
                <div
                  className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                  onClick={async () => {
                    try {
                      const result =
                        await window.electronAPI.triggerProcessScreenshots()
                      if (!result.success) {
                        console.error(
                          "Failed to process screenshots:",
                          result.error
                        )
                        showToast(
                          "错误",
                          "处理截图失败",
                          "error"
                        )
                      }
                    } catch (error) {
                      console.error("Error processing screenshots:", error)
                      showToast(
                        "错误",
                        "处理截图失败",
                        "error"
                      )
                    }
                  }}
                >
                  <span className="text-[11px] leading-none">调试</span>
                  <div className="flex gap-1">
                    <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                      {COMMAND_KEY}
                    </button>
                    <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                      ↵
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Start Over - Always visible */}
          <div
            className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
            onClick={async () => {
              try {
                const result = await window.electronAPI.triggerReset()
                if (!result.success) {
                  console.error("Failed to reset:", result.error)
                  showToast("错误", "重置失败", "error")
                }
              } catch (error) {
                console.error("Error resetting:", error)
                showToast("错误", "重置失败", "error")
              }
            }}
          >
            <span className="text-[11px] leading-none">重新开始</span>
            <div className="flex gap-1">
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                {COMMAND_KEY}
              </button>
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                R
              </button>
            </div>
          </div>

          {/* Separator */}
          <div className="mx-2 h-4 w-px bg-white/20" />

          {/* Settings with Tooltip */}
          <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Gear icon */}
            <div className="w-4 h-4 flex items-center justify-center cursor-pointer text-white/70 hover:text-white/90 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>

            {/* Tooltip Content */}
            {isTooltipVisible && (
              <div
                ref={tooltipRef}
                className="absolute top-full right-0 mt-2 w-80"
                style={{ zIndex: 100 }}
              >
                {/* Add transparent bridge */}
                <div className="absolute -top-2 right-0 w-full h-2" />
                <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
                  <div className="space-y-4">
                    <h3 className="font-medium whitespace-nowrap">
                      键盘快捷键
                    </h3>
                    <div className="space-y-3">
                      {/* Show/Hide - Always visible */}
                      <div
                        className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                        onClick={async () => {
                          try {
                            const result =
                              await window.electronAPI.toggleMainWindow()
                            if (!result.success) {
                              console.error(
                                "Failed to toggle window:",
                                result.error
                              )
                              showToast(
                                "错误",
                                "切换窗口失败",
                                "error"
                              )
                            }
                          } catch (error) {
                            console.error("Error toggling window:", error)
                            showToast(
                              "错误",
                              "切换窗口失败",
                              "error"
                            )
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">切换窗口</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              B
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          显示或隐藏此窗口。
                        </p>
                      </div>

                      {/* Screenshot and Debug commands - Only show if not processing */}
                      {!isProcessing && (
                        <>
                          <div
                            className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                            onClick={async () => {
                              try {
                                const result =
                                  await window.electronAPI.triggerScreenshot()
                                if (!result.success) {
                                  console.error(
                                    "Failed to take screenshot:",
                                    result.error
                                  )
                                  showToast(
                                    "错误",
                                    "截屏失败",
                                    "error"
                                  )
                                }
                              } catch (error) {
                                console.error("Error taking screenshot:", error)
                                showToast(
                                  "错误",
                                  "截屏失败",
                                  "error"
                                )
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">截屏</span>
                              <div className="flex gap-1 flex-shrink-0">
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                  {COMMAND_KEY}
                                </span>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                  H
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                              截取问题或解决方案的额外部分以帮助调试。
                            </p>
                          </div>

                          {extraScreenshots.length > 0 && (
                            <div
                              className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                              onClick={async () => {
                                try {
                                  const result =
                                    await window.electronAPI.triggerProcessScreenshots()
                                  if (!result.success) {
                                    console.error(
                                      "Failed to process screenshots:",
                                      result.error
                                    )
                                    showToast(
                                      "错误",
                                      "处理截图失败",
                                      "error"
                                    )
                                  }
                                } catch (error) {
                                  console.error(
                                    "Error processing screenshots:",
                                    error
                                  )
                                  showToast(
                                    "错误",
                                    "处理截图失败",
                                    "error"
                                  )
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="truncate">调试</span>
                                <div className="flex gap-1 flex-shrink-0">
                                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                    {COMMAND_KEY}
                                  </span>
                                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                    ↵
                                  </span>
                                </div>
                              </div>
                              <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                                基于所有之前和新添加的截图生成新的解决方案。
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Start Over - Always visible */}
                      <div
                        className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                        onClick={async () => {
                          try {
                            const result =
                              await window.electronAPI.triggerReset()
                            if (!result.success) {
                              console.error("Failed to reset:", result.error)
                              showToast("错误", "重置失败", "error")
                            }
                          } catch (error) {
                            console.error("Error resetting:", error)
                            showToast("错误", "重置失败", "error")
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">重新开始</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              R
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          从一个新问题重新开始。
                        </p>
                      </div>
                    </div>

                    {/* Separator and Log Out */}
                    <div className="pt-3 mt-3 border-t border-white/10">
                      {/* 用户欢迎信息和认证按钮 */}
                      {authenticated && user ? (
                        /* 已登录状态 - 显示欢迎信息和登出按钮 */
                        <>
                          {/* 用户欢迎信息 */}
                          <div className="mb-3 px-2">
                            <div className="flex items-center gap-2 w-full text-[11px] px-3 py-2 rounded bg-green-600/10 border border-green-600/20">
                              <div className="w-4 h-4 flex items-center justify-center">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-3 h-3 text-green-400"
                                >
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                              </div>
                              <span className="text-green-400 font-medium">欢迎，{user.username}</span>
                            </div>
                          </div>
                          
                          {/* 登出按钮 */}
                          <div className="mb-3 px-2">
                            <button
                                onClick={handleSignOut}
                                disabled={authLoading}
                                className={`flex items-center gap-2 w-full text-[11px] font-medium transition-colors px-3 py-2 rounded ${
                                    authLoading
                                        ? 'bg-red-600/20 text-red-400/50 cursor-not-allowed'
                                        : 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                                }`}
                            >
                              <div className="w-4 h-4 flex items-center justify-center">
                                {authLoading ? (
                                    <div className="w-3 h-3 border border-red-400/50 border-t-red-400 rounded-full animate-spin"></div>
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="w-3 h-3"
                                    >
                                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                      <polyline points="16 17 21 12 16 7" />
                                      <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                )}
                              </div>
                              {authLoading ? '登出中...' : '登出'}
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SolutionCommands
