import { PrismaClient } from '@prisma/client';
import { PointService } from './PointService';
import { InviteConfigService } from './InviteConfigService';
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
  private configService: InviteConfigService;

  constructor() {
    this.prisma = new PrismaClient();
    this.pointService = new PointService();
    this.configService = new InviteConfigService();
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
      
      // 创建邀请记录到数据库
      const inviteRecord = await this.prisma.inviteRecord.create({
        data: {
          inviterId: inviter.id,
          inviteeId: newUserId,
          inviteCode: inviter.id.toString(),
          status: 'REGISTERED',
          firstRechargeAmount: 0,
          commissionAmount: 0,
          commissionStatus: 'PENDING'
        }
      });
      
      console.log('✅ 邀请记录已创建:', { recordId: inviteRecord.id });
      
      // 发放注册奖励（根据邀请人角色动态配置）
      await this.grantRegisterReward(inviter.id, newUserId);
      
      return true;
    } catch (error) {
      console.error('❌ 处理邀请注册失败:', error);
      return false;
    }
  }

  /**
   * 处理充值佣金（支持动态配置和流量手现金佣金）
   */
  async handleRechargeCommission(userId: number, rechargeAmount: number, paymentOrderId?: string): Promise<void> {
    console.log('🎯 处理充值佣金:', { userId, rechargeAmount, paymentOrderId });
    
    try {
      // 查找邀请关系
      const inviteRecord = await this.prisma.inviteRecord.findUnique({
        where: { inviteeId: userId },
        include: {
          inviter: {
            select: { id: true, username: true, isTrafficAgent: true }
          }
        }
      });

      if (!inviteRecord) {
        console.log('❌ 用户无邀请人，跳过佣金处理');
        return;
      }

      const inviter = inviteRecord.inviter;
      const inviterId = inviter.id;

      console.log('🎯 找到邀请关系:', { 
        inviterId, 
        inviteeId: userId,
        isTrafficAgent: inviter.isTrafficAgent 
      });

      // 检查是否已经处理过这个订单的佣金
      if (paymentOrderId) {
        const existingCommission = await this.prisma.commissionRecord.findFirst({
          where: { paymentOrderId }
        });

        if (existingCommission) {
          console.log('❌ 该订单已处理过佣金，跳过');
          return;
        }
      }

      // 1. 发放积分奖励（所有用户都有）
      const pointCommissionRate = await this.configService.getRechargeCommission(inviter.isTrafficAgent);
      const pointCommission = Math.floor(rechargeAmount * pointCommissionRate * 10); // 1元=10积分

      await this.pointService.rechargePoints(
        inviterId,
        pointCommission,
        `充值积分奖励 - 被邀请人ID:${userId}充值${rechargeAmount}元`
      );

      console.log('✅ 积分佣金发放成功:', { 
        inviterId, 
        pointCommission,
        rate: pointCommissionRate 
      });

      // 2. 如果是流量手，记录现金佣金
      if (inviter.isTrafficAgent) {
        const moneyCommissionRate = await this.configService.getMoneyCommission();
        const moneyCommission = rechargeAmount * moneyCommissionRate;

        await this.prisma.commissionRecord.create({
          data: {
            trafficAgentId: inviterId,
            inviteeId: userId,
            rechargeAmount,
            commissionRate: moneyCommissionRate,
            commissionAmount: moneyCommission,
            paymentOrderId,
            status: 'PENDING'
          }
        });

        console.log('✅ 流量手现金佣金记录成功:', { 
          inviterId,
          moneyCommission,
          rate: moneyCommissionRate 
        });
      }

      // 3. 更新邀请记录状态
      await this.prisma.inviteRecord.update({
        where: { id: inviteRecord.id },
        data: { 
          status: 'ACTIVATED',
          firstRechargeAmount: rechargeAmount
        }
      });

      console.log('✅ 充值佣金处理完成:', { 
        inviterId,
        userType: inviter.isTrafficAgent ? '流量手' : '默认用户',
        pointCommission,
        moneyCommission: inviter.isTrafficAgent ? rechargeAmount * await this.configService.getMoneyCommission() : 0
      });
    } catch (error) {
      console.error('❌ 处理充值佣金失败:', error);
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
   * 发放注册奖励（支持动态配置和角色判断）
   */
  private async grantRegisterReward(inviterId: number, newUserId: number): Promise<void> {
    console.log('✅ 发放注册奖励:', { inviterId, newUserId });

    try {
      // 获取邀请人信息，判断是否为流量手
      const inviter = await this.prisma.user.findUnique({
        where: { id: inviterId },
        select: { id: true, username: true, isTrafficAgent: true }
      });

      if (!inviter) {
        throw new Error('邀请人不存在');
      }

      // 获取注册奖励配置（所有用户统一30积分）
      const rewardAmount = await this.configService.getConfig('REGISTER_REWARD');
      
      console.log('🎯 邀请人角色和奖励:', { 
        inviterId, 
        isTrafficAgent: inviter.isTrafficAgent,
        rewardAmount 
      });

      // 发放积分奖励
      await this.pointService.rechargePoints(
        inviterId,
        rewardAmount,
        `邀请注册奖励 - 成功邀请用户ID:${newUserId}注册`
      );

      console.log('✅ 注册奖励发放成功:', { 
        inviterId, 
        reward: rewardAmount,
        userType: inviter.isTrafficAgent ? '流量手' : '默认用户'
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

  /**
   * 获取流量手佣金记录
   */
  async getCommissionRecords(trafficAgentId: number, page: number = 1, limit: number = 10): Promise<{
    records: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      totalCommission: number;
      pendingCommission: number;
      paidCommission: number;
      monthlyCommission: number;
    };
  }> {
    console.log('🎯 获取流量手佣金记录:', { trafficAgentId, page, limit });

    const offset = (page - 1) * limit;

    // 获取佣金记录
    const [records, total] = await Promise.all([
      this.prisma.commissionRecord.findMany({
        where: { trafficAgentId },
        include: {
          invitee: {
            select: { id: true, username: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.commissionRecord.count({
        where: { trafficAgentId }
      })
    ]);

    // 计算汇总数据
    const allRecords = await this.prisma.commissionRecord.findMany({
      where: { trafficAgentId }
    });

    const totalCommission = allRecords.reduce((sum, record) => sum + Number(record.commissionAmount), 0);
    const pendingCommission = allRecords
      .filter(record => record.status === 'PENDING')
      .reduce((sum, record) => sum + Number(record.commissionAmount), 0);
    const paidCommission = allRecords
      .filter(record => record.status === 'PAID')
      .reduce((sum, record) => sum + Number(record.commissionAmount), 0);

    // 计算本月佣金
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const monthlyRecords = allRecords.filter(record => record.createdAt >= currentMonth);
    const monthlyCommission = monthlyRecords.reduce((sum, record) => sum + Number(record.commissionAmount), 0);

    const formattedRecords = records.map(record => ({
      id: record.id,
      inviteeId: record.inviteeId,
      inviteeUsername: record.invitee.username,
      inviteeEmail: record.invitee.email,
      rechargeAmount: Number(record.rechargeAmount),
      commissionRate: Number(record.commissionRate),
      commissionAmount: Number(record.commissionAmount),
      paymentOrderId: record.paymentOrderId,
      status: record.status,
      createdAt: record.createdAt
    }));

    return {
      records: formattedRecords,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalCommission,
        pendingCommission,
        paidCommission,
        monthlyCommission
      }
    };
  }

  /**
   * 获取用户邀请汇总（区分角色）
   */
  async getUserInviteSummary(userId: number): Promise<{
    userInfo: {
      id: number;
      username: string;
      isTrafficAgent: boolean;
    };
    pointRewards: {
      totalRewards: number;
      registerRewards: number;
      rechargeRewards: number;
    };
    commissionSummary?: {
      totalCommission: number;
      pendingCommission: number;
      paidCommission: number;
      monthlyCommission: number;
    };
  }> {
    console.log('🎯 获取用户邀请汇总:', userId);

    // 获取用户信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isTrafficAgent: true }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 获取积分奖励统计
    const pointTransactions = await this.prisma.pointTransaction.findMany({
      where: {
        userId,
        OR: [
          { description: { contains: '邀请注册奖励' } },
          { description: { contains: '充值积分奖励' } }
        ]
      }
    });

    const totalRewards = pointTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const registerRewards = pointTransactions
      .filter(tx => tx.description?.includes('邀请注册奖励'))
      .reduce((sum, tx) => sum + tx.amount, 0);
    const rechargeRewards = pointTransactions
      .filter(tx => tx.description?.includes('充值积分奖励'))
      .reduce((sum, tx) => sum + tx.amount, 0);

    const result: any = {
      userInfo: user,
      pointRewards: {
        totalRewards,
        registerRewards,
        rechargeRewards
      }
    };

    // 如果是流量手，添加现金佣金汇总
    if (user.isTrafficAgent) {
      const commissionData = await this.getCommissionRecords(userId, 1, 1000); // 获取所有记录计算汇总
      result.commissionSummary = commissionData.summary;
    }

    return result;
  }
} 