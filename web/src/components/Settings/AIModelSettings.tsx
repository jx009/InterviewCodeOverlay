import React, { useState, useEffect } from 'react';
import { configApi } from '../../services/api';

type AIModel = {
  id: string | number;
  name: string;
  displayName: string;
  provider: string;
  description?: string;
};

type AIModelSettingsProps = {
  onClose: () => void;
  onSave: (modelId: string) => void;
};

export default function AIModelSettings({ onClose, onSave }: AIModelSettingsProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const modelsData = await configApi.getAIModels();
        setModels(modelsData);
        
        // 获取当前配置
        const config = await configApi.getConfig();
        setSelectedModel(config.aiModel || (modelsData.length > 0 ? modelsData[0].name : ''));
        
        setLoading(false);
      } catch (err) {
        console.error('获取AI模型失败', err);
        setError('无法加载AI模型，请检查网络连接或服务状态');
        setLoading(false);
        
        // 使用本地模拟数据
        const mockModels = [
          { id: 1, name: 'gpt-4o', displayName: 'GPT-4o', provider: 'openai', description: '最新的GPT-4o模型' },
          { id: 2, name: 'claude-3-opus', displayName: 'Claude 3 Opus', provider: 'anthropic', description: 'Anthropic的高级模型' },
          { id: 3, name: 'claude-3-sonnet', displayName: 'Claude 3 Sonnet', provider: 'anthropic', description: '平衡能力和速度' },
          { id: 4, name: 'gemini-pro', displayName: 'Gemini Pro', provider: 'google', description: 'Google的高级AI模型' },
        ];
        setModels(mockModels);
        setSelectedModel('gpt-4o');
      }
    };
    
    fetchModels();
  }, []);

  const handleSave = () => {
    onSave(selectedModel);
  };

  const getProviderLogo = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return (
          <div className="w-6 h-6 mr-2 rounded-full bg-green-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">OA</span>
          </div>
        );
      case 'anthropic':
        return (
          <div className="w-6 h-6 mr-2 rounded-full bg-purple-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">AN</span>
          </div>
        );
      case 'google':
        return (
          <div className="w-6 h-6 mr-2 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">G</span>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 mr-2 rounded-full bg-gray-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">AI</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col">
        <div className="text-lg font-semibold mb-4">AI模型配置</div>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col max-h-[80vh] overflow-auto">
      <div className="text-lg font-semibold mb-4">AI模型配置</div>
      
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          选择用于代码生成和解析的AI模型。不同模型有不同的能力和特点。
        </p>
      </div>
      
      <div className="space-y-2 mb-6">
        {models.map(model => (
          <div 
            key={model.id}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              selectedModel === model.name 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
            onClick={() => setSelectedModel(model.name)}
          >
            <div className="flex items-center">
              {getProviderLogo(model.provider)}
              <div className="flex-1">
                <div className="font-medium">{model.displayName}</div>
                <div className="text-xs text-gray-500">{model.provider}</div>
              </div>
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border ${
                  selectedModel === model.name 
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-gray-300'
                }`}>
                  {selectedModel === model.name && (
                    <div className="flex items-center justify-center h-full">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {model.description && (
              <div className="mt-1 text-sm text-gray-600">{model.description}</div>
            )}
          </div>
        ))}
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