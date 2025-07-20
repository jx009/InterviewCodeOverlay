import React, { useState, useEffect } from 'react';
import { configApi } from '../../services/api';

// 扩展原有类型，添加showCopyButton属性
interface ExtendedDisplayConfig {
  opacity: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoHide: boolean;
  hideDelay: number;
  showCopyButton: boolean;
}

type DisplaySettingsProps = {
  onClose: () => void;
  onSave: (settings: ExtendedDisplayConfig) => void;
};

export default function DisplaySettings({ onClose, onSave }: DisplaySettingsProps) {
  const [settings, setSettings] = useState<ExtendedDisplayConfig>({
    opacity: 0.9,
    position: 'bottom-right',
    autoHide: true,
    hideDelay: 5,
    showCopyButton: true
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const config = await configApi.getConfig();
        
        // 合并服务器配置和默认配置
        setSettings({
          opacity: config.display?.opacity ?? 0.9,
          position: config.display?.position ?? 'bottom-right',
          autoHide: config.display?.autoHide ?? true,
          hideDelay: config.display?.hideDelay ?? 5,
          // 添加showCopyButton属性
          showCopyButton: (config.display as any)?.showCopyButton ?? true
        });
        
        setLoading(false);
      } catch (err) {
        console.error('获取显示设置失败', err);
        setLoading(false);
        // 使用默认设置
      }
    };
    
    fetchSettings();
  }, []);

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(e.target.value);
    setSettings(prev => ({ ...prev, opacity }));
  };

  const handlePositionChange = (position: ExtendedDisplayConfig['position']) => {
    setSettings(prev => ({ ...prev, position }));
  };

  const handleAutoHideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const autoHide = e.target.checked;
    setSettings(prev => ({ ...prev, autoHide }));
  };

  const handleHideDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hideDelay = parseInt(e.target.value);
    setSettings(prev => ({ ...prev, hideDelay }));
  };
  
  const handleCopyButtonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const showCopyButton = e.target.checked;
    setSettings(prev => ({ ...prev, showCopyButton }));
  };

  const handleSave = () => {
    onSave(settings);
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col">
        <div className="text-lg font-semibold mb-4">显示设置</div>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="text-lg font-semibold mb-4">显示设置</div>
      
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-4">
          自定义界面显示方式，包括透明度、位置和其他显示选项。
        </p>
      </div>
      
      {/* 透明度滑块 */}
      <div className="mb-6">
        <label className="block font-medium text-gray-700 mb-2">透明度</label>
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">不透明</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={settings.opacity}
            onChange={handleOpacityChange}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-gray-500">透明</span>
          <span className="ml-2 min-w-[40px] text-center">
            {Math.round(settings.opacity * 100)}%
          </span>
        </div>
        
        {/* 透明度预览 */}
        <div className="mt-2 p-4 rounded border border-gray-300 bg-white relative">
          <div 
            className="absolute inset-0 bg-white rounded" 
            style={{ opacity: 1 - settings.opacity }}
          ></div>
          <div className="relative">
            <div className="text-sm font-medium">透明度效果预览</div>
            <div className="text-xs text-gray-500">这是当前透明度设置的效果</div>
          </div>
        </div>
      </div>
      
      {/* 位置选择 */}
      <div className="mb-6">
        <label className="block font-medium text-gray-700 mb-2">显示位置</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className={`p-3 border rounded-lg flex items-center justify-center ${
              settings.position === 'top-left' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => handlePositionChange('top-left')}
          >
            <span>左上角</span>
          </button>
          
          <button
            type="button"
            className={`p-3 border rounded-lg flex items-center justify-center ${
              settings.position === 'top-right' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => handlePositionChange('top-right')}
          >
            <span>右上角</span>
          </button>
          
          <button
            type="button"
            className={`p-3 border rounded-lg flex items-center justify-center ${
              settings.position === 'bottom-left' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => handlePositionChange('bottom-left')}
          >
            <span>左下角</span>
          </button>
          
          <button
            type="button"
            className={`p-3 border rounded-lg flex items-center justify-center ${
              settings.position === 'bottom-right' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => handlePositionChange('bottom-right')}
          >
            <span>右下角</span>
          </button>
        </div>
      </div>
      
      {/* 自动隐藏开关 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <label className="font-medium text-gray-700">自动隐藏</label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.autoHide}
              onChange={handleAutoHideChange}
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          启用后，界面将在一段时间后自动隐藏
        </p>
        
        {settings.autoHide && (
          <div className="mt-3">
            <label className="block text-sm text-gray-600 mb-1">隐藏延迟 (秒)</label>
            <input
              type="range"
              min="1"
              max="10"
              value={settings.hideDelay}
              onChange={handleHideDelayChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1秒</span>
              <span>{settings.hideDelay}秒</span>
              <span>10秒</span>
            </div>
          </div>
        )}
      </div>
      
      {/* 显示复制按钮 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <label className="font-medium text-gray-700">显示复制按钮</label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.showCopyButton}
              onChange={handleCopyButtonChange}
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          启用后，代码块将显示复制按钮
        </p>
      </div>
      
      <div className="flex justify-end space-x-2 mt-auto">
        <button 
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          取消
        </button>
        <button 
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
        >
          保存
        </button>
      </div>
    </div>
  );
} 