import React from 'react';

const DownloadPage: React.FC = () => {
  const version = 'v2.1.0';
  const releaseDate = '2024-01-15';

  return (
    <div className="min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            下载 Interview Code Overlay
          </h1>
          <p className="text-xl text-gray-400 mb-2">
            最新版本 {version} • 发布于 {releaseDate}
          </p>
          <p className="text-gray-500">
            免费下载，立即开始你的面试准备之旅
          </p>
        </div>

        {/* 下载按钮 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Windows 下载 */}
          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M0 3.449L9.75 2.1v9.451H0V3.449zm10.949-1.31L24 0v11.4H10.949V2.139zM0 12.6h9.75v9.451L0 20.699V12.6zm10.949 0H24V24l-13.051-1.339V12.6z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Windows</h3>
                <p className="text-gray-400">支持 Windows 10/11</p>
              </div>
            </div>
            
            <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 mb-4">
              下载 Windows 版本
            </button>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p>• 文件大小: ~85 MB</p>
              <p>• 支持 x64 架构</p>
              <p>• 自动更新功能</p>
            </div>
          </div>

          {/* macOS 下载 */}
          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">macOS</h3>
                <p className="text-gray-400">支持 macOS 10.15+</p>
              </div>
            </div>
            
            <button className="w-full bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-600 transition-all duration-200 mb-4">
              下载 macOS 版本
            </button>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p>• 文件大小: ~90 MB</p>
              <p>• 支持 Intel & Apple Silicon</p>
              <p>• 已签名和公证</p>
            </div>
          </div>
        </div>

        {/* 系统要求 */}
        <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700 mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">系统要求</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M0 3.449L9.75 2.1v9.451H0V3.449zm10.949-1.31L24 0v11.4H10.949V2.139zM0 12.6h9.75v9.451L0 20.699V12.6zm10.949 0H24V24l-13.051-1.339V12.6z"/>
                </svg>
                Windows
              </h3>
              <ul className="text-gray-400 space-y-2">
                <li>• Windows 10 (版本 1903) 或更高版本</li>
                <li>• 4GB RAM (推荐 8GB)</li>
                <li>• 500MB 可用磁盘空间</li>
                <li>• 网络连接</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                macOS
              </h3>
              <ul className="text-gray-400 space-y-2">
                <li>• macOS 10.15 (Catalina) 或更高版本</li>
                <li>• 4GB RAM (推荐 8GB)</li>
                <li>• 500MB 可用磁盘空间</li>
                <li>• 网络连接</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 安装指南 */}
        <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700 mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">安装指南</h2>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">下载安装包</h3>
                <p className="text-gray-400">选择适合你操作系统的版本并下载</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">运行安装程序</h3>
                <p className="text-gray-400">双击下载的文件，按照提示完成安装</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">首次启动</h3>
                <p className="text-gray-400">启动应用程序，完成初始设置和登录</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                4
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">开始使用</h3>
                <p className="text-gray-400">配置你的偏好设置，开始你的面试准备</p>
              </div>
            </div>
          </div>
        </div>

        {/* 更新日志 */}
        <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">更新日志</h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center mb-3">
                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium mr-3">
                  {version}
                </span>
                <span className="text-gray-400">{releaseDate}</span>
              </div>
              <ul className="text-gray-300 space-y-2 ml-4">
                <li>• 新增多种AI模型支持，提升回答准确性</li>
                <li>• 优化用户界面，提升使用体验</li>
                <li>• 修复已知问题，提升稳定性</li>
                <li>• 增加快捷键自定义功能</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage; 