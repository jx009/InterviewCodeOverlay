import React, { useState, useEffect } from 'react';
import { configApi } from '../../services/api';

type Shortcut = {
  name: string;
  key: string;
  description: string;
};

type ShortcutSettingsProps = {
  onClose: () => void;
  onSave: (shortcuts: Record<string, string>) => void;
};

export default function ShortcutSettings({ onClose, onSave }: ShortcutSettingsProps) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [activeEdit, setActiveEdit] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShortcuts = async () => {
      try {
        setLoading(true);
        const config = await configApi.getConfig();
        
        // 使用配置中的快捷键，或者使用默认值
        const defaultShortcuts: Shortcut[] = [
          { name: 'takeScreenshot', key: config.shortcuts?.takeScreenshot || 'Alt+S', description: '截取当前屏幕' },
          { name: 'openQueue', key: config.shortcuts?.openQueue || 'Alt+Q', description: '打开截图队列' },
          { name: 'openSettings', key: config.shortcuts?.openSettings || 'Alt+,', description: '打开设置面板' },
        ];
        
        setShortcuts(defaultShortcuts);
        setLoading(false);
      } catch (err) {
        console.error('获取快捷键配置失败', err);
        // 使用默认配置
        const defaultShortcuts: Shortcut[] = [
          { name: 'takeScreenshot', key: 'Alt+S', description: '截取当前屏幕' },
          { name: 'openQueue', key: 'Alt+Q', description: '打开截图队列' },
          { name: 'openSettings', key: 'Alt+,', description: '打开设置面板' },
        ];
        setShortcuts(defaultShortcuts);
        setLoading(false);
      }
    };
    
    fetchShortcuts();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, shortcut: Shortcut) => {
    e.preventDefault();
    
    let key = '';
    
    // 收集修饰键
    if (e.ctrlKey) key += 'Ctrl+';
    if (e.altKey) key += 'Alt+';
    if (e.shiftKey) key += 'Shift+';
    if (e.metaKey) key += 'Meta+'; // Windows键或Mac的Command键
    
    // 添加主键
    if (e.key.length === 1) {
      key += e.key.toUpperCase();
    } else if (e.key === 'ArrowUp') {
      key += '↑';
    } else if (e.key === 'ArrowDown') {
      key += '↓';
    } else if (e.key === 'ArrowLeft') {
      key += '←';
    } else if (e.key === 'ArrowRight') {
      key += '→';
    } else if (['Backspace', 'Delete', 'Enter', 'Escape', 'Tab', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
      key += e.key;
    } else if (e.key.startsWith('F') && e.key.length <= 3) {
      // F1-F12键
      key += e.key;
    }
    
    // 如果只按了修饰键，则不更新
    if (key.endsWith('+')) return;
    
    const updatedShortcuts = shortcuts.map(s => 
      s.name === shortcut.name ? { ...s, key } : s
    );
    
    setShortcuts(updatedShortcuts);
    setActiveEdit(null);
  };

  const handleSave = () => {
    const shortcutsObj = shortcuts.reduce((acc, shortcut) => {
      acc[shortcut.name] = shortcut.key;
      return acc;
    }, {} as Record<string, string>);
    
    onSave(shortcutsObj);
  };

  const resetToDefault = () => {
    const defaultShortcuts: Shortcut[] = [
      { name: 'takeScreenshot', key: 'Alt+S', description: '截取当前屏幕' },
      { name: 'openQueue', key: 'Alt+Q', description: '打开截图队列' },
      { name: 'openSettings', key: 'Alt+,', description: '打开设置面板' },
    ];
    
    setShortcuts(defaultShortcuts);
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col">
        <div className="text-lg font-semibold mb-4">快捷键设置</div>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="text-lg font-semibold mb-4">快捷键设置</div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          自定义应用程序的快捷键。点击键绑定进行编辑，然后按下您想要的组合键。
        </p>
      </div>
      
      <div className="space-y-4 mb-6">
        {shortcuts.map(shortcut => (
          <div key={shortcut.name} className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{shortcut.description}</div>
                <div className="text-xs text-gray-500 mt-1">功能标识: {shortcut.name}</div>
              </div>
              <div>
                {activeEdit === shortcut.name ? (
                  <button
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded border border-blue-300 focus:outline-none min-w-[80px] text-center"
                    onKeyDown={(e) => handleKeyDown(e, shortcut)}
                    onBlur={() => setActiveEdit(null)}
                    autoFocus
                  >
                    按下快捷键
                  </button>
                ) : (
                  <button
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 focus:outline-none min-w-[80px] text-center"
                    onClick={() => setActiveEdit(shortcut.name)}
                  >
                    {shortcut.key}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between space-x-2 mt-auto">
        <button 
          onClick={resetToDefault}
          className="px-4 py-2 text-blue-600 font-medium text-sm hover:text-blue-800"
        >
          重置为默认值
        </button>
        
        <div className="flex space-x-2">
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
    </div>
  );
} 