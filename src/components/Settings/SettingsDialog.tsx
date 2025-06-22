import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useWebAuth } from '../../hooks/useWebAuth';
import { ExternalLink, User, Settings, CheckCircle, AlertCircle, Loader2, Sparkles, Shield } from 'lucide-react';

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
  const { 
    authenticated, 
    user, 
    connectionStatus, 
    login: webLogin,
    logout: webLogout,
    loading
  } = useWebAuth();

  const [userConfig, setUserConfig] = useState<any>(null);

  useEffect(() => {
    if (authenticated && isOpen) {
      // 模拟获取用户配置
      setUserConfig({
        aiModel: 'Claude Sonnet（智能推荐）',
        language: 'Python',
        plan: '免费版',
        usage: '本月已使用 45/100 次'
      });
    }
  }, [authenticated, isOpen]);

  const handleWebLogin = async () => {
    try {
      await webLogin();
    } catch (error) {
      console.error('登录失败:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // 先调用登出API
      await webLogout();
      // 然后打开web退出页面
      window.electronAPI?.openLink('http://localhost:3001/logout');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const handleOpenConfig = () => {
    window.electronAPI?.openLink('http://localhost:3000/dashboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-blue-600" />
            设置中心
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* 账户状态卡片 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-5">
            {loading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">检查登录状态...</span>
              </div>
            ) : authenticated ? (
              <div className="space-y-4">
                {/* 用户信息 */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{user?.username}</div>
                    <div className="text-sm text-gray-600">{user?.email}</div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                </div>

                {/* 配置状态 */}
                {userConfig && (
                  <div className="bg-white/60 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      当前配置
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-600">AI模型</div>
                        <div className="font-medium">{userConfig.aiModel}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">编程语言</div>
                        <div className="font-medium">{userConfig.language}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500">{userConfig.usage}</div>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleOpenConfig}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    管理配置
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    登出
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">登录账户</div>
                  <div className="text-sm text-gray-600 mb-4">
                    登录后可以使用AI智能分析功能
                  </div>
                </div>
                <Button 
                  onClick={handleWebLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <User className="h-4 w-4 mr-2" />
                  )}
                  立即登录
                </Button>
              </div>
            )}
          </div>

          {/* 连接状态（仅在有问题时显示） */}
          {!connectionStatus.connected && !connectionStatus.checking && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">连接问题</span>
              </div>
              <p className="text-sm text-amber-700 mb-3">
                无法连接到服务器，请检查网络连接
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
              >
                重试连接
              </Button>
            </div>
          )}

          {/* 应用信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between">
                <span>应用版本</span>
                <span className="font-medium">v2.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>配置方式</span>
                <span className="font-medium text-blue-600">云端同步</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
          {authenticated && (
            <Button onClick={handleOpenConfig} className="bg-blue-600 hover:bg-blue-700">
              <ExternalLink className="h-4 w-4 mr-2" />
              打开配置中心
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
