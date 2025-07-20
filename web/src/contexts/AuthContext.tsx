import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthContextType {
  user: any;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (params: any) => Promise<any>;
  register: (params: any) => Promise<any>;
  logout: () => Promise<void>;
  enhancedLogout: () => Promise<void>;
  checkSessionStatus: () => Promise<boolean>;
  clearError: () => void;
  sendResetCode: (email: string) => Promise<any>;
  verifyResetCode: (token: string, code: string) => Promise<any>;
  resetPassword: (resetToken: string, newPassword: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 使用现有的 useAuth 钩子，但在全局层面提供
  const auth = useAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}; 