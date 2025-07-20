// SessionId保护工具
export class SessionProtection {
  private static readonly SESSION_KEY = 'sessionId';
  private static readonly BACKUP_KEY = 'sessionId_backup';
  private static readonly LAST_ACTIVITY_KEY = 'lastActivity';
  
  // 保存sessionId（同时创建备份）
  static saveSessionId(sessionId: string): void {
    try {
      localStorage.setItem(this.SESSION_KEY, sessionId);
      localStorage.setItem(this.BACKUP_KEY, sessionId);
      localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
      console.log('🔐 SessionId已保存并备份:', sessionId.substring(0, 10) + '...');
    } catch (error) {
      console.error('❌ 保存sessionId失败:', error);
    }
  }
  
  // 获取sessionId（如果主sessionId丢失，尝试从备份恢复）
  static getSessionId(): string | null {
    try {
      let sessionId = localStorage.getItem(this.SESSION_KEY);
      
      if (!sessionId) {
        // 主sessionId丢失，尝试从备份恢复
        const backupSessionId = localStorage.getItem(this.BACKUP_KEY);
        if (backupSessionId) {
          console.log('⚠️ 主sessionId丢失，从备份恢复:', backupSessionId.substring(0, 10) + '...');
          this.saveSessionId(backupSessionId); // 恢复主sessionId
          sessionId = backupSessionId;
        }
      }
      
      if (sessionId) {
        // 更新最后活动时间
        localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
      }
      
      return sessionId;
    } catch (error) {
      console.error('❌ 获取sessionId失败:', error);
      return null;
    }
  }
  
  // 清除sessionId（同时清除备份）
  static clearSessionId(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
      localStorage.removeItem(this.LAST_ACTIVITY_KEY);
      console.log('🗑️ SessionId已清除');
    } catch (error) {
      console.error('❌ 清除sessionId失败:', error);
    }
  }
  
  // 检查sessionId是否有效
  static isSessionValid(): boolean {
    const sessionId = this.getSessionId();
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    
    if (!sessionId) {
      return false;
    }
    
    if (!lastActivity) {
      return true; // 如果没有记录最后活动时间，认为有效
    }
    
    // 检查是否超过2周未活动
    const lastActivityTime = parseInt(lastActivity);
    const now = Date.now();
    const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000; // 2周毫秒数
    
    const isValid = (now - lastActivityTime) < TWO_WEEKS;
    
    if (!isValid) {
      console.log('⏰ SessionId超时，已失效');
      this.clearSessionId();
    }
    
    return isValid;
  }
  
  // 获取会话信息
  static getSessionInfo(): {
    hasSession: boolean;
    sessionId: string | null;
    lastActivity: Date | null;
    isValid: boolean;
  } {
    const sessionId = this.getSessionId();
    const lastActivityStr = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    const lastActivity = lastActivityStr ? new Date(parseInt(lastActivityStr)) : null;
    const isValid = this.isSessionValid();
    
    return {
      hasSession: !!sessionId,
      sessionId,
      lastActivity,
      isValid
    };
  }
} 