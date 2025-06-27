import { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

interface ModelPointConfig {
  id: number;
  modelName: string;
  questionType: 'multiple_choice' | 'programming';
  cost: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface EditingConfig {
  modelName: string;
  questionType: 'multiple_choice' | 'programming';
  cost: number;
  description: string;
}

export default function ManagerPage() {
  const { user, logout } = useAuthContext();
  const [configs, setConfigs] = useState<ModelPointConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EditingConfig>({
    modelName: '',
    questionType: 'multiple_choice',
    cost: 1,
    description: ''
  });

  // 检查管理员权限
  const isAdmin = user?.username === 'admin';

  useEffect(() => {
    console.log('ManagerPage - 用户信息:', user);
    console.log('ManagerPage - 是否为管理员:', isAdmin);
    console.log('ManagerPage - SessionId:', localStorage.getItem('sessionId'));
    
    if (isAdmin) {
      loadConfigs();
    }
  }, [isAdmin]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('sessionId');
      console.log('loadConfigs - SessionId:', sessionId);
      
      const response = await fetch('/api/admin/model-configs', {
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      console.log('loadConfigs - Response status:', response.status);
      console.log('loadConfigs - Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('loadConfigs - Error response:', errorText);
        throw new Error(`Failed to load configs: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('loadConfigs - Response data:', data);
      setConfigs(data.data.configs || []);
      setMessage('配置加载成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('加载配置失败:', error);
      setMessage(`加载配置失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);

      // 验证输入
      if (!editingConfig.modelName.trim()) {
        setMessage('模型名称不能为空');
        return;
      }

      if (editingConfig.cost <= 0) {
        setMessage('积分消耗必须大于0');
        return;
      }

      const response = await fetch('/api/admin/model-configs', {
        method: 'PUT',
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modelName: editingConfig.modelName,
          questionType: editingConfig.questionType,
          cost: editingConfig.cost,
          description: editingConfig.description,
          isActive: true
        })
      });

      if (!response.ok) {
        throw new Error('保存配置失败');
      }

      const data = await response.json();
      if (data.success) {
        setMessage('配置保存成功');
        setShowAddForm(false);
        setEditingConfig({
          modelName: '',
          questionType: 'multiple_choice',
          cost: 1,
          description: ''
        });
        await loadConfigs();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error(data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      setMessage(`保存失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (modelName: string, questionType: string) => {
    if (!confirm('确定要删除这个配置吗？')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/model-configs', {
        method: 'DELETE',
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modelName, questionType })
      });

      if (!response.ok) {
        throw new Error('Failed to delete config');
      }

      setMessage('配置删除成功！');
      await loadConfigs();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('删除配置失败:', error);
      setMessage('删除配置失败');
    }
  };

  const handleEditConfig = (config: ModelPointConfig) => {
    setEditingConfig({
      modelName: config.modelName,
      questionType: config.questionType,
      cost: config.cost,
      description: config.description || ''
    });
    setShowAddForm(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  if (!isAdmin) {
    const handleCheckSession = async () => {
      try {
        const sessionId = localStorage.getItem('sessionId');
        console.log('手动检查session，sessionId:', sessionId);
        
        const response = await fetch('/api/session_status', {
          headers: {
            'X-Session-Id': sessionId || '',
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Session检查响应状态:', response.status);
        const data = await response.json();
        console.log('Session检查响应数据:', data);
        
        if (data.success && data.user) {
          alert(`Session有效！用户: ${data.user.username} (${data.user.email})`);
          // 手动设置用户信息并刷新页面
          window.location.reload();
        } else {
          alert(`Session无效: ${data.message || '未知错误'}`);
        }
      } catch (error) {
        console.error('检查session失败:', error);
        alert(`检查session失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">权限不足</h2>
          <p className="mb-4">只有管理员可以访问此页面</p>
          <div className="text-sm text-gray-400 mb-4">
            <p>当前用户: {user?.username || '未登录'}</p>
            <p>用户邮箱: {user?.email || '无'}</p>
            <p>SessionId: {localStorage.getItem('sessionId') ? '存在' : '不存在'}</p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleCheckSession}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
            >
              检查Session状态
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              返回主页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">积分配置管理</h1>
            <p className="text-gray-400">管理AI模型的积分消耗配置</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => window.open('/', '_blank')}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              返回主页
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('成功') ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {message}
          </div>
        )}

        {/* 添加/编辑表单 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {showAddForm ? '添加/编辑配置' : '配置管理'}
            </h2>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (!showAddForm) {
                  setEditingConfig({
                    modelName: '',
                    questionType: 'multiple_choice',
                    cost: 1,
                    description: ''
                  });
                }
              }}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
            >
              {showAddForm ? '取消' : '添加配置'}
            </button>
          </div>

          {showAddForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">模型名称</label>
                <input
                  type="text"
                  value={editingConfig.modelName}
                  onChange={(e) => setEditingConfig({...editingConfig, modelName: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  placeholder="例如: gpt-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">题目类型</label>
                <select
                  value={editingConfig.questionType}
                  onChange={(e) => setEditingConfig({...editingConfig, questionType: e.target.value as 'multiple_choice' | 'programming'})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="multiple_choice">选择题</option>
                  <option value="programming">编程题</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">积分消耗</label>
                <input
                  type="number"
                  min="1"
                  value={editingConfig.cost}
                  onChange={(e) => setEditingConfig({...editingConfig, cost: parseInt(e.target.value) || 1})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">描述 (可选)</label>
                <input
                  type="text"
                  value={editingConfig.description}
                  onChange={(e) => setEditingConfig({...editingConfig, description: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  placeholder="配置描述"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-4">
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-lg transition-colors"
                >
                  {saving ? '保存中...' : '保存配置'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 配置列表 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold">当前配置 ({configs.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    模型名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    题目类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    积分消耗
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    更新时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {configs.map((config) => (
                  <tr key={`${config.modelName}-${config.questionType}`} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {config.modelName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        config.questionType === 'multiple_choice' 
                          ? 'bg-blue-600 text-blue-100' 
                          : 'bg-green-600 text-green-100'
                      }`}>
                        {config.questionType === 'multiple_choice' ? '选择题' : '编程题'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="bg-orange-600 text-orange-100 px-2 py-1 rounded-full text-xs">
                        {config.cost} 积分
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        config.isActive 
                          ? 'bg-green-600 text-green-100' 
                          : 'bg-red-600 text-red-100'
                      }`}>
                        {config.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                      {config.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(config.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditConfig(config)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(config.modelName, config.questionType)}
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {configs.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>暂无配置数据</p>
                <p className="text-sm mt-2">点击"添加配置"开始添加模型积分配置</p>
              </div>
            )}
          </div>
        </div>

        {/* 预设配置建议 */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">💡 常用配置建议</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-700 rounded p-3">
              <div className="font-medium mb-2">GPT-4 系列</div>
              <div className="text-gray-300">
                • 选择题: 2-3积分<br />
                • 编程题: 5-8积分
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="font-medium mb-2">GPT-3.5 系列</div>
              <div className="text-gray-300">
                • 选择题: 1-2积分<br />
                • 编程题: 3-5积分
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="font-medium mb-2">Claude 系列</div>
              <div className="text-gray-300">
                • 选择题: 2-3积分<br />
                • 编程题: 4-6积分
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 