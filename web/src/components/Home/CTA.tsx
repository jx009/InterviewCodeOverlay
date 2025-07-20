import React from 'react';
import { Link } from 'react-router-dom';

const CTA: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
          准备好提升你的笔试表现了吗？
        </h2>
        
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          加入数万名开发者的行列，使用AI助手在技术笔试中脱颖而出
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link
            to="/download"
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            免费下载
          </Link>
          <Link
            to="/recharge"
            className="px-8 py-4 bg-transparent border-2 border-gray-600 text-white font-semibold rounded-lg hover:border-gray-400 hover:bg-gray-800/50 transition-all duration-200"
          >
            查看定价
          </Link>
        </div>

        {/* 使用步骤 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">下载安装</h3>
            <p className="text-gray-400">快速下载并安装客户端</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">配置设置</h3>
            <p className="text-gray-400">简单配置，个性化你的助手</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">开始笔试</h3>
            <p className="text-gray-400">在笔试中获得实时AI帮助</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA; 