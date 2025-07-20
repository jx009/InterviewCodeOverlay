import { PrismaClient } from '@prisma/client';
import { PointService } from './PointService';
import crypto from 'crypto';

export interface InviteRecord {
  id: number;
  inviterId: number;
  inviteeId: number;
  inviteCode: string;
  status: string;
  firstRechargeAmount: number;
  commissionAmount: number;
  commissionStatus: string;
  createdAt: Date;
  updatedAt: Date;
  invitee: {
    id: number;
    username: string;
    email: string | null;
    createdAt: Date;
  };
}

export interface InviteStats {
  totalInvites: number;
  registeredInvites: number;
  activatedInvites: number;
  totalCommission: number;
  pendingCommission: number;
}

export class InviteService {
  private prisma: PrismaClient;
  private pointService: PointService;

  // 邀请奖励配置
  private static readonly INVITE_REWARDS = {
    REGISTER: 10,           // 邀请注册奖励：10积分
    FIRST_RECHARGE: 0.05,   // 首次充值佣金：5%
    ONGOING_COMMISSION: 0.02 // 持续佣金：2%
  };

  constructor() {
    this.prisma = new PrismaClient();
    this.pointService = new PointService();
  }

  /**
   * 生成邀请码（现在直接返回用户ID）
   */
  async generateInviteCode(userId: number): Promise<string> {
    console.log('🎯 生成邀请码（基于用户ID）:', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 直接返回用户ID作为邀请标识
    const inviteIdentifier = userId.toString();
    
    console.log('✅ 生成邀请标识（用户ID）:', inviteIdentifier);
    return inviteIdentifier;
  }

  /**
   * 生成邀请链接（基于用户ID）
   */
  async generateInviteUrl(userId: number): Promise<string> {
    console.log('🎯 生成邀请链接（基于用户ID）:', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    const baseUrl = process.env.WEB_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/?aff=${userId}`;
    
    console.log('✅ 邀请链接生成成功:', { userId, inviteUrl });
    return inviteUrl;
  }

  /**
   * 处理邀请注册（支持用户ID作为邀请标识）
   */
  async handleInviteRegistration(inviteIdentifier: string, newUserId: number): Promise<boolean> {
    console.log('🎯 处理邀请注册:', { inviteIdentifier, newUserId });

    try {
      // 首先尝试按用户ID查找邀请人
      if (!/^\d+$/.test(inviteIdentifier)) {
        console.log('❌ 邀请标识格式无效:', inviteIdentifier);
        return false;
      }

      const inviterId = parseInt(inviteIdentifier);
      const inviter = await this.prisma.user.findUnique({
        where: { id: inviterId },
        select: { id: true, username: true }
      });

      if (!inviter) {
        console.log('❌ 邀请人不存在:', inviterId);
        return false;
      }

      // 检查被邀请用户是否已经有邀请人
      const invitee = await this.prisma.user.findUnique({
        where: { id: newUserId },
        select: { id: true, username: true }
      });

      if (!invitee) {
        console.log('❌ 被邀请用户不存在:', newUserId);
        return false;
      }

      console.log('✅ 邀请关系建立成功:', { inviterId: inviter.id, inviteeId: newUserId });
      
      // 发放注册奖励
      await this.grantRegisterReward(inviterId, newUserId);
      
      return true;
    } catch (error) {
      console.error('❌ 处理邀请注册失败:', error);
      return false;
    }
  }

  /**
   * 处理首次充值佣金
   */
  async handleFirstRechargeCommission(userId: number, rechargeAmount: number): Promise<void> {
    console.log('🎯 处理首次充值佣金:', { userId, rechargeAmount });
    
    try {
      // 从积分交易记录中查找是否有邀请关系
      const inviteTransaction = await this.prisma.pointTransaction.findFirst({
        where: {
          description: {
            contains: `邀请用户ID:${userId}注册`
          }
        },
        select: { userId: true }
      });

      if (!inviteTransaction) {
        console.log('❌ 用户无邀请人，跳过佣金处理');
        return;
      }

      const inviterId = inviteTransaction.userId;

      // 检查是否已经发放过首充佣金
      const existingCommission = await this.prisma.pointTransaction.findFirst({
        where: {
          userId: inviterId,
          description: {
            contains: `首次充值佣金 - 被邀请人ID:${userId}`
          }
        }
      });

      if (existingCommission) {
        console.log('❌ 已经发放过首充佣金，跳过');
        return;
      }

      // 计算佣金
      const commissionAmount = rechargeAmount * InviteService.INVITE_REWARDS.FIRST_RECHARGE;
      const commissionPoints = Math.floor(commissionAmount * 10); // 1元=10积分

      // 发放积分奖励
      await this.pointService.rechargePoints(
        inviterId,
        commissionPoints,
        `首次充值佣金 - 被邀请人ID:${userId}充值${rechargeAmount}元`
      );

      console.log('✅ 首次充值佣金发放成功:', { 
        inviterId, 
        commission: commissionPoints,
        originalAmount: rechargeAmount 
      });
    } catch (error) {
      console.error('❌ 处理首次充值佣金失败:', error);
      throw error;
    }
  }

  /**
   * 获取邀请记录（基于积分交易记录）
   */
  async getInviteRecords(userId: number, page: number = 1, limit: number = 10): Promise<{
    records: InviteRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    console.log('🎯 获取邀请记录:', { userId, page, limit });

    const offset = (page - 1) * limit;

    // 从积分交易记录中查找邀请注册相关的记录
    const [transactions, total] = await Promise.all([
      this.prisma.pointTransaction.findMany({
        where: {
          userId: userId,
          description: {
            contains: '邀请注册奖励'
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.pointTransaction.count({
        where: {
          userId: userId,
          description: {
            contains: '邀请注册奖励'
          }
        }
      })
    ]);

    // 从描述中提取被邀请用户ID，并查询用户信息
    const records: InviteRecord[] = [];
    
    for (const transaction of transactions) {
      const match = transaction.description?.match(/用户ID:(\d+)注册/);
      if (match) {
        const inviteeId = parseInt(match[1]);
        const invitee = await this.prisma.user.findUnique({
          where: { id: inviteeId },
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true
          }
        });

        if (invitee) {
          records.push({
            id: transaction.id,
            inviterId: userId,
            inviteeId: inviteeId,
            inviteCode: userId.toString(),
            status: 'REGISTERED',
            firstRechargeAmount: 0,
            commissionAmount: 0,
            commissionStatus: 'PENDING',
            createdAt: transaction.createdAt,
            updatedAt: transaction.createdAt,
            invitee: invitee
          });
        }
      }
    }

    return {
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 获取邀请统计数据（基于积分交易记录）
   */
  async getInviteStats(userId: number): Promise<InviteStats> {
    console.log('🎯 获取邀请统计数据:', { userId });

    const [registerTransactions, commissionTransactions] = await Promise.all([
      // 邀请注册奖励记录
      this.prisma.pointTransaction.findMany({
        where: {
          userId: userId,
          description: {
            contains: '邀请注册奖励'
          }
        }
      }),
      // 首次充值佣金记录
      this.prisma.pointTransaction.findMany({
        where: {
          userId: userId,
          description: {
            contains: '首次充值佣金'
          }
        }
      })
    ]);

    const totalInvites = registerTransactions.length;
    const registeredInvites = totalInvites;
    const activatedInvites = commissionTransactions.length;
    const totalCommission = commissionTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalInvites,
      registeredInvites,
      activatedInvites,
      totalCommission,
      pendingCommission: 0 // 暂时设为0，因为我们没有pending状态
    };
  }

  /**
   * 验证邀请码
   */
  async validateInviteCode(inviteCode: string): Promise<boolean> {
    console.log('🎯 验证邀请码:', { inviteCode });

    if (!/^\d+$/.test(inviteCode)) {
      return false;
    }

    const inviterId = parseInt(inviteCode);
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterId },
      select: { id: true }
    });

    return !!inviter;
  }

  /**
   * 获取邀请奖励记录（基于积分交易记录）
   */
  async getInviteRewards(userId: number, page: number = 1, limit: number = 10): Promise<{
    rewards: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    console.log('🎯 获取邀请奖励记录:', { userId, page, limit });

    // 从积分交易记录中查找邀请相关的奖励
    const offset = (page - 1) * limit;

    const [rewards, total] = await Promise.all([
      this.prisma.pointTransaction.findMany({
        where: {
          userId: userId,
          OR: [
            { description: { contains: '邀请注册奖励' } },
            { description: { contains: '首次充值佣金' } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.pointTransaction.count({
        where: {
          userId: userId,
          OR: [
            { description: { contains: '邀请注册奖励' } },
            { description: { contains: '首次充值佣金' } }
          ]
        }
      })
    ]);

    const formattedRewards = rewards.map(reward => ({
      id: reward.id,
      rewardType: reward.description?.includes('注册') ? 'REGISTER' : 'FIRST_RECHARGE',
      rewardAmount: reward.amount,
      description: reward.description,
      status: 'GRANTED',
      createdAt: reward.createdAt
    }));

    return {
      rewards: formattedRewards,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 发放注册奖励
   */
  private async grantRegisterReward(inviterId: number, newUserId: number): Promise<void> {
    console.log('✅ 发放注册奖励:', { inviterId, newUserId });

    try {
      // 发放积分奖励
      await this.pointService.rechargePoints(
        inviterId,
        InviteService.INVITE_REWARDS.REGISTER,
        `邀请注册奖励 - 成功邀请用户ID:${newUserId}注册`
      );

      console.log('✅ 注册奖励发放成功:', { 
        inviterId, 
        reward: InviteService.INVITE_REWARDS.REGISTER 
      });
    } catch (error) {
      console.error('❌ 发放注册奖励失败:', error);
      throw error;
    }
  }

  /**
   * 获取邀请注册记录（基于积分交易记录）
   */
  async getInviteRegistrations(inviterId: number, page: number = 1, limit: number = 10): Promise<{
    registrations: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    console.log('🎯 获取邀请注册记录:', { inviterId, page, limit });

    // 从积分交易记录中查找邀请注册相关的记录
    const offset = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.pointTransaction.findMany({
        where: {
          userId: inviterId,
          description: {
            contains: '邀请注册奖励'
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.pointTransaction.count({
        where: {
          userId: inviterId,
          description: {
            contains: '邀请注册奖励'
          }
        }
      })
    ]);

    const registrations = [];
    
    for (const transaction of transactions) {
      // 从描述中提取被邀请用户ID
      const match = transaction.description?.match(/用户ID:(\d+)注册/);
      if (match) {
        const inviteeId = parseInt(match[1]);
        const invitee = await this.prisma.user.findUnique({
          where: { id: inviteeId },
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true
          }
        });

        if (invitee) {
          registrations.push({
            id: transaction.id,
            userId: inviteeId,
            email: invitee.email || `user${inviteeId}@example.com`,
            username: invitee.username,
            registrationTime: transaction.createdAt,
            status: 'REGISTERED'
          });
        }
      }
    }

    return {
      registrations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 获取邀请用户的充值记录（基于支付订单表）
   */
  async getInviteRecharges(inviterId: number, page: number = 1, limit: number = 10): Promise<{
    recharges: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    console.log('🎯 获取邀请用户充值记录:', { inviterId, page, limit });

    const offset = (page - 1) * limit;

    // 首先从积分交易记录中找到所有被邀请的用户ID
    const inviteTransactions = await this.prisma.pointTransaction.findMany({
      where: {
        userId: inviterId,
        description: {
          contains: '邀请注册奖励'
        }
      }
    });

    const invitedUserIds: number[] = [];
    for (const transaction of inviteTransactions) {
      const match = transaction.description?.match(/用户ID:(\d+)注册/);
      if (match) {
        invitedUserIds.push(parseInt(match[1]));
      }
    }

    if (invitedUserIds.length === 0) {
      return {
        recharges: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    }

    // 获取这些用户的充值记录（从支付订单表）
    const [rechargeOrders, total] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        where: {
          userId: { in: invitedUserIds },
          paymentStatus: 'PAID' as any // 只获取支付成功的订单
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { paymentTime: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.paymentOrder.count({
        where: {
          userId: { in: invitedUserIds },
          paymentStatus: 'PAID' as any
        }
      })
    ]);

    const formattedRecharges = rechargeOrders.map(order => ({
      id: order.id,
      userId: order.userId,
      email: order.user?.email || '',
      username: order.user?.username || '',
      amount: Number(order.amount),
      points: order.points,
      bonusPoints: order.bonusPoints,
      rechargeTime: order.paymentTime,
      orderNo: order.orderNo
    }));

    return {
      recharges: formattedRecharges,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
} 