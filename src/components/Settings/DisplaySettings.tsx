import React, { useState, useEffect } from 'react';

interface DisplaySettingsProps {
  onToggleCopyButton: (show: boolean) => void;
}

const DisplaySettings: React.FC<DisplaySettingsProps> = ({ onToggleCopyButton }) => {
  const [showCopyButton, setShowCopyButton] = useState(true);

  // 组件挂载时从配置中读取showCopyButton设置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await window.electronAPI.getConfig();
        setShowCopyButton(config.showCopyButton !== false); // 默认为true
      } catch (error) {
        console.error("Failed to load copy button config:", error);
      }
    };
    fetchConfig();
  }, []);

  // 当showCopyButton状态变化时，通知父组件
  const handleToggleCopyButton = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setShowCopyButton(isChecked);
    onToggleCopyButton(isChecked);
  };

  return (
    <div className="p-4 bg-black/60 rounded-md">
      <h2 className="text-[15px] font-medium text-white mb-3">显示设置</h2>
      
      <div className="flex items-center justify-between">
        <label htmlFor="showCopyButton" className="text-[13px] text-white">
          显示代码复制按钮
        </label>
        <input
          id="showCopyButton"
          type="checkbox"
          checked={showCopyButton}
          onChange={handleToggleCopyButton}
          className="w-4 h-4"
        />
      </div>
    </div>
  );
};

export default DisplaySettings; 