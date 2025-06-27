import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuthContext();
  
  // 检查本地存储的sessionId
  const hasSessionId = !!localStorage.getItem('sessionId');
  const hasValidSession = isAuthenticated || hasSessionId;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">验证登录状态...</span>
      </div>
    );
  }

  if (!hasValidSession) {
    // 保存当前URL以便登录后跳回
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 