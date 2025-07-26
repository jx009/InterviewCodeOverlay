import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 强制设置HTML元素为深色主题
document.documentElement.classList.add('dark');
document.documentElement.style.backgroundColor = '#0a0a0a';
document.documentElement.style.color = '#ffffff';
document.body.style.backgroundColor = '#0a0a0a';
document.body.style.color = '#ffffff';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 