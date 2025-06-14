import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate: (config: any) => void;
  config: any;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  onConfigUpdate,
  config
}) => {
  const [formData, setFormData] = useState({
    apiProvider: config.apiProvider || 'openai',
    extractionModel: config.extractionModel || '',
    solutionModel: config.solutionModel || '',
    debuggingModel: config.debuggingModel || '',
    language: config.language || 'python',
    opacity: config.opacity || 1.0,
    showCopyButton: config.showCopyButton !== false // 默认为true
  });

  const [isDirty, setIsDirty] = useState(false);

  // 更新formData当config变化时
  useEffect(() => {
    setFormData({
      apiProvider: config.apiProvider || 'openai',
      extractionModel: config.extractionModel || '',
      solutionModel: config.solutionModel || '',
      debuggingModel: config.debuggingModel || '',
      language: config.language || 'python',
      opacity: config.opacity || 1.0,
      showCopyButton: config.showCopyButton !== false // 默认为true
    });
  }, [config]);

  // 根据API提供商获取可用模型
  const getAvailableModels = (provider: string): { value: string; label: string }[] => {
    switch (provider) {
      case 'openai':
        return [
          { value: 'gpt-4o', label: 'GPT-4o (推荐)' },
          { value: 'gpt-4o-mini', label: 'GPT-4o mini (快速)' },
          { value: 'gpt-4', label: 'GPT-4 (经典)' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (高效)' }
        ];
      case 'gemini':
        return [
          { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (推荐)' },
          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (专业)' },
          { value: 'gemini-pro', label: 'Gemini Pro (经典)' }
        ];
      case 'anthropic':
        return [
          { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet (推荐)' },
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (稳定)' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (最强)' }
        ];
      default:
        return [];
    }
  };

  const handleProviderChange = (provider: string) => {
    const models = getAvailableModels(provider);
    const defaultModel = models[0]?.value || '';
    
    setFormData(prev => ({
      ...prev,
      apiProvider: provider,
      extractionModel: defaultModel,
      solutionModel: defaultModel,
      debuggingModel: defaultModel
    }));
    setIsDirty(true);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleToggleCopyButton = (show: boolean) => {
    setFormData(prev => ({
      ...prev,
      showCopyButton: show
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onConfigUpdate(formData);
    setIsDirty(false);
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      apiProvider: config.apiProvider || 'openai',
      extractionModel: config.extractionModel || '',
      solutionModel: config.solutionModel || '',
      debuggingModel: config.debuggingModel || '',
      language: config.language || 'python',
      opacity: config.opacity || 1.0,
      showCopyButton: config.showCopyButton !== false // 默认为true
    });
    setIsDirty(false);
    onClose();
  };

  const programLanguages = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'swift', label: 'Swift' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'scala', label: 'Scala' }
  ];

  const availableModels = getAvailableModels(formData.apiProvider);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>应用设置</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* API服务商选择 */}
          <div className="space-y-3">
            <label className="text-sm font-medium block">AI 服务商</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'openai', label: 'OpenAI', badge: 'GPT系列' },
                { value: 'gemini', label: 'Google Gemini', badge: 'Gemini系列' },
                { value: 'anthropic', label: 'Anthropic', badge: 'Claude系列' }
              ].map(provider => (
                <div
                  key={provider.value}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                    formData.apiProvider === provider.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleProviderChange(provider.value)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          formData.apiProvider === provider.value ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className="font-medium">{provider.label}</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                      {provider.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>内置API密钥：</strong>应用已集成AI服务，无需额外配置。只需选择您偏好的AI服务商和模型即可开始使用。
              </p>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* 模型选择 */}
          <div className="space-y-4">
            <label className="text-sm font-medium block">模型配置</label>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <label htmlFor="extractionModel" className="text-xs text-gray-600 block">
                  题目识别模型
                </label>
                <select
                  value={formData.extractionModel}
                  onChange={(e) => handleInputChange('extractionModel', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="solutionModel" className="text-xs text-gray-600 block">
                  解题生成模型
                </label>
                <select
                  value={formData.solutionModel}
                  onChange={(e) => handleInputChange('solutionModel', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="debuggingModel" className="text-xs text-gray-600 block">
                  调试分析模型
                </label>
                <select
                  value={formData.debuggingModel}
                  onChange={(e) => handleInputChange('debuggingModel', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* 编程语言选择 */}
          <div className="space-y-3">
            <label htmlFor="language" className="text-sm font-medium block">
              首选编程语言
            </label>
            <select
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {programLanguages.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <hr className="border-gray-200" />

          {/* 显示设置 */}
          <div className="space-y-3">
            <label className="text-sm font-medium block">显示设置</label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">显示代码复制按钮</span>
              <input
                type="checkbox"
                checked={formData.showCopyButton !== false}
                onChange={(e) => handleInputChange('showCopyButton', e.target.checked)}
                className="w-4 h-4"
              />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* 窗口透明度 */}
          <div className="space-y-3">
            <label htmlFor="opacity" className="text-sm font-medium block">
              窗口透明度: {Math.round(formData.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={formData.opacity}
              onChange={(e) => handleInputChange('opacity', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
          >
            取消
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isDirty}
          >
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
