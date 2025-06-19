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
  onSave: (config: { programmingModel: string; multipleChoiceModel: string }) => void;
};

export default function AIModelSettings({ onClose, onSave }: AIModelSettingsProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [programmingModel, setProgrammingModel] = useState<string>('');
  const [multipleChoiceModel, setMultipleChoiceModel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'programming' | 'multiple_choice'>('programming');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const modelsData = await configApi.getAIModels();
        setModels(modelsData);
        
        // 获取当前配置
        const config = await configApi.getConfig();
        setProgrammingModel(config.programmingModel || config.aiModel || (modelsData.length > 0 ? modelsData[0].name : ''));
        setMultipleChoiceModel(config.multipleChoiceModel || config.aiModel || (modelsData.length > 0 ? modelsData[0].name : ''));
        
        setLoading(false);
      } catch (err) {
        console.error('获取AI模型失败', err);
        setError('无法加载AI模型，请检查网络连接或服务状态');
        setLoading(false);
        
        // 使用本地模拟数据
        const mockModels = [
          { id: 1, name: 'gpt-4o', displayName: 'GPT-4o', provider: 'openai', description: '最新的GPT-4o模型，适合复杂编程任务' },
          { id: 2, name: 'claude-3-opus', displayName: 'Claude 3 Opus', provider: 'anthropic', description: 'Anthropic的高级模型，逻辑推理能力强' },
          { id: 3, name: 'claude-3-sonnet', displayName: 'Claude 3 Sonnet', provider: 'anthropic', description: '平衡能力和速度，适合选择题分析' },
          { id: 4, name: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet', provider: 'anthropic', description: '最新版Claude，综合能力出色' },
          { id: 5, name: 'gemini-pro', displayName: 'Gemini Pro', provider: 'google', description: 'Google的高级AI模型' },
        ];
        setModels(mockModels);
        setProgrammingModel('claude-3-5-sonnet-20241022');
        setMultipleChoiceModel('claude-3-5-sonnet-20241022');
      }
    };
    
    fetchModels();
  }, []);

  const handleSave = () => {
    onSave({
      programmingModel,
      multipleChoiceModel
    });
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

  const renderModelList = (selectedModel: string, onSelect: (model: string) => void, title: string, description: string) => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      
      <div className="space-y-2">
        {models.map(model => (
          <div 
            key={model.id}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              selectedModel === model.name 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
            onClick={() => onSelect(model.name)}
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
    </div>
  );

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
        <p className="text-sm text-gray-600 mb-4">
          现在支持为编程题和选择题分别选择AI模型，以获得更精准的分析结果。
        </p>
        
        {/* Tab 切换 */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'programming'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('programming')}
          >
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
              </svg>
              编程题模型
            </span>
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'multiple_choice'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('multiple_choice')}
          >
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              选择题模型
            </span>
          </button>
        </div>
      </div>
      
      {/* 模型选择内容 */}
      <div className="flex-1 mb-6">
        {activeTab === 'programming' && renderModelList(
          programmingModel,
          setProgrammingModel,
          '编程题AI模型',
          '用于代码生成、算法分析和编程问题解答。建议选择代码能力强的模型。'
        )}
        
        {activeTab === 'multiple_choice' && renderModelList(
          multipleChoiceModel,
          setMultipleChoiceModel,
          '选择题AI模型',
          '用于选择题识别、分析和答案推理。建议选择逻辑推理能力强的模型。'
        )}
      </div>
      
      {/* 当前选择摘要 */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">当前选择：</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">编程题：</span>
            <span className="font-medium ml-1">
              {models.find(m => m.name === programmingModel)?.displayName || programmingModel}
            </span>
          </div>
          <div>
            <span className="text-gray-600">选择题：</span>
            <span className="font-medium ml-1">
              {models.find(m => m.name === multipleChoiceModel)?.displayName || multipleChoiceModel}
            </span>
          </div>
        </div>
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
          保存配置
        </button>
      </div>
    </div>
  );
} 