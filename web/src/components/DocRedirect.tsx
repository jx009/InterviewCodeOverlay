import { useEffect } from 'react';

const DocRedirect = () => {
  useEffect(() => {
    // 立即重定向到语雀文档
    window.location.href = 'https://www.yuque.com/shuaidi-1le9i/fgolgo/cw0hvhlxu0w130gq?singleDoc#';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg mb-2">正在跳转到文档...</p>
        <p className="text-sm text-gray-400">
          如果没有自动跳转，请
          <a 
            href="https://www.yuque.com/shuaidi-1le9i/fgolgo/cw0hvhlxu0w130gq?singleDoc#" 
            className="text-blue-400 hover:text-blue-300 underline ml-1"
          >
            点击这里
          </a>
        </p>
      </div>
    </div>
  );
};

export default DocRedirect;