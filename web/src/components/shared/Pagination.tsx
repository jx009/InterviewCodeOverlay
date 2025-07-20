import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  loading?: boolean;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  loading = false,
  className = ''
}) => {
  // 始终显示分页组件，即使只有一页数据（显示页面大小选择器和统计信息）
  const showNavigationButtons = totalPages > 1;

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 5);
      } else if (currentPage >= totalPages - 2) {
        pages.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2);
      }
    }

    return pages.map((page) => (
      <button
        key={page}
        onClick={() => onPageChange(page)}
        disabled={loading}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          currentPage === page
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {page}
      </button>
    ));
  };

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 ${className}`}>
      {/* 页面大小选择器 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">每页显示</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={loading}
          className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} 条
            </option>
          ))}
        </select>
        {totalItems && (
          <span className="text-sm text-gray-400">
            共 {totalItems} 条数据
          </span>
        )}
      </div>

      {/* 页面信息和导航 */}
      <div className="flex items-center gap-2">
        <div className="text-sm text-gray-400">
          第 {currentPage} 页，共 {totalPages} 页
        </div>
        
        {showNavigationButtons && (
          <div className="flex gap-1">
            {/* 首页 */}
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              首页
            </button>
            
            {/* 上一页 */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              上一页
            </button>
            
            {/* 页码 */}
            {renderPageNumbers()}
            
            {/* 下一页 */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              下一页
            </button>
            
            {/* 末页 */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages || loading}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              末页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 