import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3004,
    host: true,
    allowedHosts: ['quiz.playoffer.cn', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://159.75.174.234:3003',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // 构建配置
  build: {
    // 确保所有路径都回退到index.html
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
}) 