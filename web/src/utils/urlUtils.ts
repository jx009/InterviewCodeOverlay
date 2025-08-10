/**
 * URL工具类 - 处理邀请参数和设备绑定
 */
export class UrlUtils {
  private static readonly INVITER_ID_KEY = 'inviter_id';
  private static readonly DEVICE_BOUND_KEY = 'device_bound';
  private static readonly AFF_PARAM = 'aff';

  /**
   * 获取URL中的邀请人ID
   */
  static getInviterIdFromUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(this.AFF_PARAM);
  }

  /**
   * 绑定设备到邀请人
   */
  static bindDeviceToInviter(inviterId: string): void {
    if (!inviterId || !inviterId.trim()) return;

    const cleanInviterId = inviterId.trim();
    
    // 检查是否已经绑定过其他邀请人
    const existingInviter = this.getDeviceBoundInviter();
    if (existingInviter && existingInviter !== cleanInviterId) {
      console.log('💎 设备已绑定其他邀请人:', existingInviter, '不会覆盖');
      return;
    }

    // 保存邀请人ID和绑定状态
    localStorage.setItem(this.INVITER_ID_KEY, cleanInviterId);
    localStorage.setItem(this.DEVICE_BOUND_KEY, 'true');
    
    console.log('💎 设备已绑定邀请人:', cleanInviterId);
    
    // 强制更新当前URL
    this.addAffParam(cleanInviterId);
  }

  /**
   * 获取设备绑定的邀请人ID
   */
  static getDeviceBoundInviter(): string | null {
    const isBound = localStorage.getItem(this.DEVICE_BOUND_KEY);
    if (isBound !== 'true') return null;
    
    return localStorage.getItem(this.INVITER_ID_KEY);
  }

  /**
   * 检查设备是否已绑定
   */
  static isDeviceBound(): boolean {
    return localStorage.getItem(this.DEVICE_BOUND_KEY) === 'true';
  }

  /**
   * 清除设备绑定（仅用于测试或特殊情况）
   */
  static clearDeviceBinding(): void {
    localStorage.removeItem(this.INVITER_ID_KEY);
    localStorage.removeItem(this.DEVICE_BOUND_KEY);
    console.log('💎 设备绑定已清除');
  }

  /**
   * 确保URL中有aff参数（如果设备已绑定）
   */
  static ensureAffParam(): void {
    const boundInviter = this.getDeviceBoundInviter();
    if (boundInviter && !this.hasAffParam()) {
      console.log('💎 恢复设备绑定的邀请人ID到URL:', boundInviter);
      this.addAffParam(boundInviter);
    }
  }

  /**
   * 检查当前URL是否有aff参数
   */
  static hasAffParam(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has(this.AFF_PARAM);
  }

  /**
   * 在URL中添加或更新aff参数
   */
  static addAffParam(inviterId: string): void {
    if (!inviterId) return;

    const url = new URL(window.location.href);
    url.searchParams.set(this.AFF_PARAM, inviterId);
    
    // 使用replaceState避免在历史记录中添加新条目
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * 从URL中移除aff参数
   */
  static removeAffParam(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(this.AFF_PARAM);
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * 初始化邀请处理 - 应在应用启动时调用
   */
  static initInviteHandling(): void {
    console.log('💎 初始化邀请处理和设备绑定');

    // 1. 检查URL中是否有新的邀请人ID
    const urlInviterId = this.getInviterIdFromUrl();
    if (urlInviterId) {
      console.log('💎 检测到URL中的邀请人ID:', urlInviterId);
      // 尝试绑定设备（如果已绑定则不会覆盖）
      this.bindDeviceToInviter(urlInviterId);
    } else {
      // 2. 如果URL中没有aff参数，但设备已绑定，则恢复参数
      this.ensureAffParam();
    }

    // 3. 监听路由变化，保持邀请参数
    this.setupRouteListener();
  }

  /**
   * 设置路由监听器，确保邀请参数不丢失
   */
  private static setupRouteListener(): void {
    const boundInviter = this.getDeviceBoundInviter();
    if (!boundInviter) return;

    // 监听popstate事件（浏览器前进后退）
    const maintainAffParam = () => {
      const currentInviterId = this.getInviterIdFromUrl();
      if (!currentInviterId && boundInviter) {
        console.log('💎 路由变化后恢复邀请参数');
        this.addAffParam(boundInviter);
      }
    };

    window.addEventListener('popstate', maintainAffParam);

    // 拦截pushState和replaceState方法
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      // 延迟执行，确保路由已经更新
      setTimeout(maintainAffParam, 0);
    };

    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      // 延迟执行，确保路由已经更新
      setTimeout(maintainAffParam, 0);
    };
  }

  /**
   * 获取邀请人ID用于注册（优先使用URL中的，其次使用绑定的）
   */
  static getInviterIdForRegistration(): string | null {
    return this.getInviterIdFromUrl() || this.getDeviceBoundInviter();
  }

  /**
   * 生成邀请链接（基于用户ID）
   */
  static generateInviteUrl(userId: string | number, baseUrl?: string): string {
    const base = baseUrl || window.location.origin;
    return `${base}/?aff=${userId}`;
  }

  /**
   * 验证邀请人ID格式（现在是用户ID，应该是数字）
   */
  static validateInviterIdFormat(id: string): boolean {
    if (!id) return false;
    // 用户ID应该是数字
    return /^\d+$/.test(id.trim());
  }

  /**
   * 清理并格式化邀请人ID
   */
  static formatInviterId(id: string): string {
    if (!id) return '';
    return id.trim();
  }

  /**
   * 获取设备绑定状态信息（用于调试）
   */
  static getDeviceBindingInfo(): {
    isBound: boolean;
    inviterId: string | null;
    urlInviterId: string | null;
  } {
    return {
      isBound: this.isDeviceBound(),
      inviterId: this.getDeviceBoundInviter(),
      urlInviterId: this.getInviterIdFromUrl()
    };
  }

  // 兼容性方法（保持向后兼容）
  /**
   * @deprecated 使用 getInviterIdFromUrl 替代
   */
  static getInviteCode(): string | null {
    return this.getInviterIdFromUrl();
  }

  /**
   * @deprecated 使用 getInviterIdForRegistration 替代
   */
  static getInviteCodeForRegistration(): string | null {
    return this.getInviterIdForRegistration();
  }

  /**
   * @deprecated 使用 generateInviteUrl 替代
   */
  static generateInviteUrl_legacy(inviteCode: string, baseUrl?: string): string {
    const base = baseUrl || window.location.origin;
    return `${base}/?aff=${inviteCode}`;
  }
} 