import React from 'react';

interface BaiduPanModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: 'windows' | 'macos';
}

const BaiduPanModal: React.FC<BaiduPanModalProps> = ({ isOpen, onClose, platform }) => {
  if (!isOpen) return null;

  const platformText = platform === 'windows' ? 'Windows版' : 'macOS版';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 弹窗内容 */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">下载 QuizCoze {platformText}</h2>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">通过网盘分享的文件：QZ</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">链接:</label>
                <div className="bg-white border rounded-md p-2">
                  <code className="text-sm text-blue-600 break-all">
                    https://pan.baidu.com/s/1doYK5YhyiSaOc3dCVvy4jw?pwd=pbgk
                  </code>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">提取码:</label>
                <div className="bg-white border rounded-md p-2">
                  <code className="text-sm font-bold text-red-600">pbgk</code>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <a
              href="https://pan.baidu.com/s/1doYK5YhyiSaOc3dCVvy4jw?pwd=pbgk"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-md hover:bg-blue-700 transition-colors text-center"
            >
              打开百度网盘
            </a>
            
            <button
              onClick={onClose}
              className="w-full bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaiduPanModal;