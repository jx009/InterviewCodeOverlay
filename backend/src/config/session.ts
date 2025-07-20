import { SessionManager } from './redis-simple';

export interface SessionData {
  userId: number;
  username: string;
  email: string;
  lastActivity: string;
  createdAt: string;
}

// 会话验证函数 - 增强版本，统一认证逻辑
export const validateSession = async (sessionId: string): Promise<SessionData | null> => {
  try {
    console.log('🔍 会话验证开始:', sessionId ? `${sessionId.substring(0, 10)}...` : '无');
    
    if (!sessionId || sessionId.trim() === '') {
      console.log('⚠️ 会话ID为空或无效');
      return null;
    }

    const sessionManager = new SessionManager();
    
    // 验证会话是否存在且有效
    const sessionValidation = await sessionManager.validateSession(sessionId);
    
    if (!sessionValidation.valid) {
      console.log('⚠️ 会话验证失败: 会话无效');
      return null;
    }

    if (!sessionValidation.userId) {
      console.log('⚠️ 会话中不存在用户ID');
      return null;
    }

    // 获取完整的会话数据
    const sessionData = await sessionManager.getSession(sessionId);
    
    if (!sessionData) {
      console.log('⚠️ 无法获取会话数据');
      return null;
    }

    // 检查会话是否过期
    const now = new Date();
    const lastActivity = new Date(sessionData.lastActivity || sessionData.createdAt);
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24小时
    
    if (now.getTime() - lastActivity.getTime() > sessionTimeout) {
      console.log('⚠️ 会话已过期');
      // 清理过期会话
      await sessionManager.deleteSession(sessionId);
      return null;
    }

    // 如果会话数据中缺少用户信息，从数据库获取
    let userData = {
      username: sessionData.username,
      email: sessionData.email
    };

    if (!userData.username || !userData.email) {
      console.log('🔄 从数据库获取用户信息...');
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const user = await prisma.user.findUnique({
          where: { id: sessionValidation.userId },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isActive: true
          }
        });

        if (!user) {
          console.log('⚠️ 用户不存在');
          await sessionManager.deleteSession(sessionId);
          return null;
        }

        if (!user.isActive) {
          console.log('⚠️ 用户账户已禁用');
          await sessionManager.deleteSession(sessionId);
          return null;
        }

        userData = {
          username: user.username,
          email: user.email
        };

        // 注意: 当前SessionManager不支持更新会话数据
        // 这里可以考虑重新创建会话或扩展SessionManager

        console.log('✅ 用户信息已更新到会话');
      } catch (dbError: any) {
        console.error('❌ 数据库查询失败:', dbError);
        return null;
      }
    } else {
      // 注意: 当前SessionManager不支持更新最后活动时间
      // 这里可以考虑扩展SessionManager或重新设计会话管理
    }

    const result: SessionData = {
      userId: sessionValidation.userId,
      username: userData.username,
      email: userData.email,
      lastActivity: new Date().toISOString(),
      createdAt: sessionData.createdAt || new Date().toISOString()
    };

    console.log('✅ 会话验证成功:', {
      userId: result.userId,
      username: result.username,
      sessionAge: now.getTime() - new Date(result.createdAt).getTime()
    });
    
    return result;
    
  } catch (error: any) {
    console.error('❌ 会话验证失败:', error);
    
    // 如果是严重错误，尝试清理会话
    if (sessionId && error.message?.includes('network') === false) {
      try {
        const sessionManager = new SessionManager();
        await sessionManager.deleteSession(sessionId);
        console.log('🗑️ 已清理异常会话');
      } catch (cleanupError) {
        console.error('❌ 清理会话失败:', cleanupError);
      }
    }
    
    return null;
  }
};

// 创建会话数据
export const createSession = async (
  userId: number,
  username: string,
  email: string,
  additionalData: Record<string, any> = {}
): Promise<string | null> => {
  try {
    console.log('🔄 创建会话:', { userId, username });
    
    const sessionManager = new SessionManager();
    const sessionId = await sessionManager.createSession(userId);
    
    if (sessionId) {
      console.log('✅ 会话创建成功:', sessionId.substring(0, 10) + '...');
      return sessionId;
    } else {
      console.error('❌ 会话创建失败');
      return null;
    }
    
  } catch (error: any) {
    console.error('❌ 创建会话异常:', error);
    return null;
  }
};

// 销毁会话
export const destroySession = async (sessionId: string): Promise<boolean> => {
  try {
    console.log('🗑️ 销毁会话:', sessionId ? sessionId.substring(0, 10) + '...' : '无');
    
    if (!sessionId) {
      return true;
    }
    
    const sessionManager = new SessionManager();
    await sessionManager.deleteSession(sessionId);
    
    console.log('✅ 会话已销毁');
    return true;
    
  } catch (error: any) {
    console.error('❌ 销毁会话失败:', error);
    return false;
  }
};

// 获取会话信息（不进行验证）
export const getSessionInfo = async (sessionId: string): Promise<SessionData | null> => {
  try {
    if (!sessionId) {
      return null;
    }
    
    const sessionManager = new SessionManager();
    const sessionData = await sessionManager.getSession(sessionId);
    
    if (!sessionData) {
      return null;
    }
    
    return {
      userId: sessionData.userId,
      username: sessionData.username || '',
      email: sessionData.email || '',
      lastActivity: sessionData.lastActivity || new Date().toISOString(),
      createdAt: sessionData.createdAt || new Date().toISOString()
    };
    
  } catch (error: any) {
    console.error('❌ 获取会话信息失败:', error);
    return null;
  }
}; 