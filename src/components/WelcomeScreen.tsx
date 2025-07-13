import React from 'react';
import { Button } from './ui/button';

interface WelcomeScreenProps {
  onOpenSettings: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenSettings }) => {
  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-black border border-white/10 rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <span>面试编程助手</span>
          <span className="text-sm font-normal px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md">完整版</span>
        </h1>
        
        <div className="mb-8">
          <h2 className="text-lg font-medium text-white mb-3">欢迎使用面试编程助手</h2>
          <p className="text-white/70 text-sm mb-4">
            这个应用程序通过提供AI驱动的编程问题解决方案，帮助您在技术面试中脱颖而出。
          </p>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
            <h3 className="text-white/90 font-medium mb-2">全局快捷键</h3>
            <ul className="space-y-2">
              <li className="flex justify-between text-sm">
                <span className="text-white/70">切换显示</span>
                <span className="text-white/90">Ctrl+B / Cmd+B</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-white/70">截屏</span>
                <span className="text-white/90">Ctrl+H / Cmd+H</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-white/70">删除最后一张截图</span>
                <span className="text-white/90">Ctrl+L / Cmd+L</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-white/70">处理截图</span>
                <span className="text-white/90">Ctrl+Enter / Cmd+Enter</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-white/70">重置视图</span>
                <span className="text-white/90">Ctrl+R / Cmd+R</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-white/70">退出应用</span>
                <span className="text-white/90">Ctrl+Q / Cmd+Q</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <h3 className="text-white/90 font-medium mb-2">开始使用</h3>
          <p className="text-white/70 text-sm mb-3">
            在使用应用程序之前，您需要配置您的OpenAI API密钥。
          </p>
          <Button 
            className="w-full px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
            onClick={onOpenSettings}
          >
            打开设置
          </Button>
        </div>
        
        <div className="text-white/40 text-xs text-center">
          从截取您的编程问题开始 (Ctrl+H / Cmd+H)
        </div>
      </div>
    </div>
  );
};