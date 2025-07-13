import React, { useState, useEffect, useRef } from "react"
import { createRoot } from "react-dom/client"

import { useToast } from "../../contexts/toast"
import { LanguageSelector } from "../shared/LanguageSelector"
import { COMMAND_KEY } from "../../utils/platform"
import { useWebAuth } from "../../hooks/useWebAuth"

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  screenshotCount?: number
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
                                                       onTooltipVisibilityChange,
                                                       screenshotCount = 0,
                                                       credits,
                                                       currentLanguage,
                                                       setLanguage
                                                     }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  // 🆕 使用增强认证
  const { 
    authenticated, 
    user, 
    login: webLogin, 
    logout: webLogout, 
    loading: authLoading,
    connectionStatus 
  } = useWebAuth()

  // Extract the repeated language selection logic into a separate function
  const extractLanguagesAndUpdate = (direction?: 'next' | 'prev') => {
    // Create a hidden instance of LanguageSelector to extract languages
    const hiddenRenderContainer = document.createElement('div');
    hiddenRenderContainer.style.position = 'absolute';
    hiddenRenderContainer.style.left = '-9999px';
    document.body.appendChild(hiddenRenderContainer);

    // Create a root and render the LanguageSelector temporarily
    const root = createRoot(hiddenRenderContainer);
    root.render(
        <LanguageSelector
            currentLanguage={currentLanguage}
            setLanguage={() => {}}
        />
    );

    // Use a small delay to ensure the component has rendered
    // 50ms is generally enough for React to complete a render cycle
    setTimeout(() => {
      // Extract options from the rendered select element
      const selectElement = hiddenRenderContainer.querySelector('select');
      if (selectElement) {
        const options = Array.from(selectElement.options);
        const values = options.map(opt => opt.value);

        // Find current language index
        const currentIndex = values.indexOf(currentLanguage);
        let newIndex = currentIndex;

        if (direction === 'prev') {
          // Go to previous language
          newIndex = (currentIndex - 1 + values.length) % values.length;
        } else {
          // Default to next language
          newIndex = (currentIndex + 1) % values.length;
        }

        if (newIndex !== currentIndex) {
          setLanguage(values[newIndex]);
          window.electronAPI.updateConfig({ language: values[newIndex] });
        }
      }

      // Clean up
      root.unmount();
      document.body.removeChild(hiddenRenderContainer);
    }, 50);
  };

  useEffect(() => {
    let tooltipHeight = 0
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
  }, [isTooltipVisible])

  // 🆕 修改为使用增强认证的退出登录
  const handleSignOut = async () => {
    console.log('🚪 QueueCommands handleSignOut 被调用');
    try {
      showToast('正在登出...', '请稍等', 'loading');
      console.log('📞 调用 webLogout...');
      const result = await webLogout();
      console.log('📋 webLogout 结果:', result);

      if (result.success) {
        console.log('✅ 登出成功');
        showToast('登出成功', '已成功退出登录', 'success');
        // 不需要手动刷新，App.tsx会自动处理界面切换
      } else {
        console.log('❌ 登出失败:', result.error);
        showToast('登出失败', result.error || '请重试', 'error');
      }
    } catch (error) {
      console.error('❌ 登出异常:', error);
      showToast('登出失败', '网络错误，请重试', 'error');
    }
  }

  // 🆕 添加登录处理方法
  const handleLogin = async () => {
    console.log('🔐 QueueCommands handleLogin 被调用');
    try {
      showToast('正在登录...', '请稍等', 'loading');
      console.log('📞 调用 webLogin...');
      const result = await webLogin();
      console.log('📋 webLogin 结果:', result);

      if (result.success) {
        console.log('✅ 登录成功');
        showToast('登录成功', '已成功登录', 'success');
        // 不需要手动刷新，App.tsx会自动处理界面切换
      } else {
        console.log('❌ 登录失败:', result.error);
        showToast('登录失败', result.error || '请重试', 'error');
      }
    } catch (error) {
      console.error('❌ 登录异常:', error);
      showToast('登录失败', '网络错误，请重试', 'error');
    }
  }

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
            {/* Screenshot */}
            <div
                className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                onClick={async () => {
                  try {
                    const result = await window.electronAPI.triggerScreenshot()
                    if (!result.success) {
                      // 减少控制台输出
                      showToast("错误", "截屏失败", "error")
                    }
                  } catch (error) {
                    // 减少控制台输出
                    showToast("错误", "截屏失败", "error")
                  }
                }}
            >
            <span className="text-[11px] leading-none truncate">
              {screenshotCount === 0
                  ? "截取第一张截图"
                  : screenshotCount === 1
                      ? "截取第二张截图"
                      : screenshotCount === 2
                          ? "截取第三张截图"
                          : screenshotCount === 3
                              ? "截取第四张截图"
                              : screenshotCount === 4
                                  ? "截取第五张截图"
                                  : "下一张将替换第一张截图"}
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

            {/* Solve Command */}
            {screenshotCount > 0 && (
                <div
                    className={`flex flex-col cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors ${
                        credits <= 0 ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={async () => {

                      try {
                        const result =
                            await window.electronAPI.triggerProcessScreenshots()
                        if (!result.success) {
                          // 减少控制台输出
                          showToast("错误", "处理截图失败", "error")
                        }
                      } catch (error) {
                        // 减少控制台输出
                        showToast("错误", "处理截图失败", "error")
                      }
                    }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] leading-none">解决 </span>
                    <div className="flex gap-1 ml-2">
                      <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                        {COMMAND_KEY}
                      </button>
                      <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                        ↵
                      </button>
                    </div>
                  </div>
                </div>
            )}

            {/* Separator */}
            <div className="mx-2 h-4 w-px bg-white/20" />

            {/* Settings with Tooltip */}
            <div
                className="relative inline-block top-area"
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
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>

              {/* Tooltip Content */}
              {isTooltipVisible && (
                  <div
                      ref={tooltipRef}
                      className="absolute top-full left-0 mt-2 w-80 transform -translate-x-[calc(50%-12px)]"
                      style={{ zIndex: 100 }}
                  >
                    {/* Add transparent bridge */}
                    <div className="absolute -top-2 right-0 w-full h-2" />
                    <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
                      <div className="space-y-4">
                        <h3 className="font-medium truncate">键盘快捷键</h3>
                        <div className="space-y-3">
                          {/* Toggle Command */}
                          <div
                              className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                              onClick={async () => {
                                try {
                                  const result =
                                      await window.electronAPI.toggleMainWindow()
                                  if (!result.success) {
                                    // 减少控制台输出
                                    showToast(
                                        "错误",
                                        "切换窗口失败",
                                        "error"
                                    )
                                  }
                                } catch (error) {
                                  // 减少控制台输出
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

                          {/* Screenshot Command */}
                          <div
                              className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                              onClick={async () => {
                                try {
                                  const result =
                                      await window.electronAPI.triggerScreenshot()
                                  if (!result.success) {
                                    // 减少控制台输出
                                    showToast(
                                        "错误",
                                        "截屏失败",
                                        "error"
                                    )
                                  }
                                } catch (error) {
                                  // 减少控制台输出
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
                              截取问题描述的截图。
                            </p>
                          </div>

                          {/* Solve Command */}
                          <div
                              className={`cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors ${
                                  screenshotCount > 0
                                      ? ""
                                      : "opacity-50 cursor-not-allowed"
                              }`}
                              onClick={async () => {
                                if (screenshotCount === 0) return

                                try {
                                  const result =
                                      await window.electronAPI.triggerProcessScreenshots()
                                  if (!result.success) {
                                    // 减少控制台输出
                                    showToast(
                                        "错误",
                                        "处理截图失败",
                                        "error"
                                    )
                                  }
                                } catch (error) {
                                  // 减少控制台输出
                                  showToast(
                                      "错误",
                                      "处理截图失败",
                                      "error"
                                  )
                                }
                              }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">解决</span>
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
                              {screenshotCount > 0
                                  ? "根据当前问题生成解决方案。"
                                  : "请先截屏然后生成解决方案。"}
                            </p>
                          </div>

                          {/* Delete Last Screenshot Command */}
                          <div
                              className={`cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors ${
                                  screenshotCount > 0
                                      ? ""
                                      : "opacity-50 cursor-not-allowed"
                              }`}
                              onClick={async () => {
                                if (screenshotCount === 0) return

                                try {
                                  const result = await window.electronAPI.deleteLastScreenshot()
                                  if (!result.success) {
                                    // 减少控制台输出
                                    showToast(
                                        "错误",
                                        result.error || "删除截图失败",
                                        "error"
                                    )
                                  }
                                } catch (error) {
                                  // 减少控制台输出
                                  showToast(
                                      "错误",
                                      "删除截图失败",
                                      "error"
                                  )
                                }
                              }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">删除最后一张截图</span>
                              <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              {COMMAND_KEY}
                            </span>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              L
                            </span>
                              </div>
                            </div>
                            <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                              {screenshotCount > 0
                                  ? "删除最近截取的截图。"
                                  : "没有截图可删除。"}
                            </p>
                          </div>
                        </div>

                        {/* Separator and Log Out */}
                        <div className="pt-3 mt-3 border-t border-white/10">
                          {/* 语言选择器 - 可点击切换 */}
                          <div className="mb-3 px-2">
                            <div className="flex items-center justify-between cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors">
                              <span className="text-[11px] text-white/70">语言</span>
                              <div className="flex items-center gap-2">
                                <select
                                    className="bg-transparent border-none text-[11px] text-white/90 cursor-pointer focus:outline-none"
                                    value={currentLanguage}
                                    onChange={(e) => {
                                      const newLang = e.target.value;
                                      setLanguage(newLang);
                                      window.electronAPI.updateConfig({ language: newLang });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                                        extractLanguagesAndUpdate('prev');
                                      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                                        extractLanguagesAndUpdate('next');
                                      }
                                    }}
                                >
                                  <option value="python">Python</option>
                                  <option value="javascript">JavaScript</option>
                                  <option value="java">Java</option>
                                  <option value="cpp">C++</option>
                                  <option value="csharp">C#</option>
                                  <option value="go">Go</option>
                                  <option value="rust">Rust</option>
                                  <option value="typescript">TypeScript</option>
                                  <option value="kotlin">Kotlin</option>
                                  <option value="swift">Swift</option>
                                  <option value="php">PHP</option>
                                  <option value="ruby">Ruby</option>
                                  <option value="scala">Scala</option>
                                </select>
                              </div>
                            </div>
                          </div>

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
                          ) : (
                            /* 未登录状态 - 显示登录按钮 */
                            <div className="mb-3 px-2">
                              <button
                                  onClick={handleLogin}
                                  disabled={authLoading || !connectionStatus?.connected}
                                  className={`flex items-center gap-2 w-full text-[11px] font-medium transition-colors px-3 py-2 rounded ${
                                      authLoading || !connectionStatus?.connected
                                          ? 'bg-green-600/20 text-green-400/50 cursor-not-allowed'
                                          : 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                                  }`}
                              >
                                <div className="w-4 h-4 flex items-center justify-center">
                                  {authLoading ? (
                                      <div className="w-3 h-3 border border-green-400/50 border-t-green-400 rounded-full animate-spin"></div>
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
                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                        <polyline points="10 17 15 12 10 7" />
                                        <line x1="15" y1="12" x2="3" y2="12" />
                                      </svg>
                                  )}
                                </div>
                                {authLoading ? '登录中...' : (
                                  !connectionStatus?.connected ? '离线' : '登录'
                                )}
                              </button>
                            </div>
                          )}
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

export default QueueCommands
