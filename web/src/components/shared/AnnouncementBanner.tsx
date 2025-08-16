import React, { useEffect, useState } from 'react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  isActive: boolean;
  priority: number;
  showStyle: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

const AnnouncementBanner: React.FC = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchCurrentAnnouncement = async () => {
      try {
        const response = await fetch('/api/announcements/current');
        
        if (!response.ok) {
          throw new Error('Failed to fetch announcement');
        }

        const data = await response.json();
        
        if (data.success && data.data.announcement) {
          setAnnouncement(data.data.announcement);
        }
      } catch (error) {
        console.error('Error fetching announcement:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentAnnouncement();
  }, []);

  // 如果正在加载或没有公告或用户主动隐藏了公告，则不显示
  if (isLoading || !announcement || !isVisible) {
    return null;
  }

  // 根据样式类型设置颜色
  const getStyleClasses = (style: string) => {
    switch (style) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 border';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 border';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 border';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800 border';
    }
  };

  return (
    <div className={`relative w-full ${getStyleClasses(announcement.showStyle)}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div 
            className="flex-1 text-center text-sm font-medium"
            dangerouslySetInnerHTML={{ __html: announcement.content }}
          />
          <button
            onClick={() => setIsVisible(false)}
            className="ml-4 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="关闭公告"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;