const { PrismaClient } = require('@prisma/client');
const { InviteConfigService } = require('./InviteConfigService');

class InviteService {
  constructor() {
    this.prisma = new PrismaClient();
    this.configService = new InviteConfigService();
  }

  /**
   * 生成邀请码（现在直接返回用户ID）
   */
  async generateInviteCode(userId) {
    console.log('🎯 生成邀请码（基于用户ID）:', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    const inviteCode = userId.toString();
    console.log('✅ 邀请码生成成功:', { userId, inviteCode, username: user.username });
    return inviteCode;
  }

  /**
   * 验证邀请码
   */
  async validateInviteCode(inviteCode) {
    console.log('🔍 验证邀请码:', { inviteCode });

    try {
      const inviterId = parseInt(inviteCode);
      if (isNaN(inviterId)) {
        console.warn('⚠️ 邀请码格式无效:', inviteCode);
        return { valid: false, inviterId: null };
      }

      const inviter = await this.prisma.user.findUnique({
        where: { id: inviterId },
        select: { 
          id: true, 
          username: true, 
          email: true,
          isTrafficAgent: true
        }
      });

      if (!inviter) {
        console.warn('⚠️ 邀请人不存在:', inviterId);
        return { valid: false, inviterId: null };
      }

      console.log('✅ 邀请码验证成功:', { 
        inviteCode, 
        inviterId, 
        inviterName: inviter.username,
        isTrafficAgent: inviter.isTrafficAgent 
      });
      
      return { 
        valid: true, 
        inviterId,
        inviter: {
          id: inviter.id,
          username: inviter.username,
          email: inviter.email,
          isTrafficAgent: inviter.isTrafficAgent || false
        }
      };
    } catch (error) {
      console.error('❌ 验证邀请码失败:', error);
      return { valid: false, inviterId: null };
    }
  }

  /**
   * 处理邀请注册（创建邀请记录并发放奖励）
   */
  async handleInviteRegistration(inviterId, inviteeId) {
    console.log('📝 处理邀请注册:', { inviterId, inviteeId, inviterIdType: typeof inviterId, inviteeIdType: typeof inviteeId });

    try {
      const inviterIdNum = parseInt(inviterId);
      const inviteeIdNum = parseInt(inviteeId);

      // 验证邀请人和被邀请人
      const [inviter, invitee] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: inviterIdNum },
          select: { id: true, username: true, isTrafficAgent: true }
        }),
        this.prisma.user.findUnique({
          where: { id: inviteeIdNum },
          select: { id: true, username: true }
        })
      ]);

      if (!inviter) {
        console.log('❌ 邀请人不存在:', inviterIdNum);
        return false;
      }

      if (!invitee) {
        console.log('❌ 被邀请用户不存在:', inviteeIdNum);
        return false;
      }

      // 不允许自己邀请自己
      if (inviterIdNum === inviteeIdNum) {
        console.log('❌ 不允许自己邀请自己');
        return false;
      }

      // 检查是否已存在邀请关系
      const existingInvite = await this.prisma.inviteRecord.findFirst({
        where: {
          inviteeId: inviteeIdNum
        }
      });

      if (existingInvite) {
        console.log('⚠️ 用户已有邀请关系，跳过处理');
        return false;
      }

      // 使用事务创建邀请记录并发放奖励
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. 创建邀请记录
        const inviteRecord = await tx.inviteRecord.create({
          data: {
            inviterId: inviterIdNum,
            inviteeId: inviteeIdNum,
            inviteCode: inviterIdNum.toString(),
            status: 'REGISTERED',
            registeredAt: new Date(),
            firstRechargeAmount: 0,
            commissionAmount: 0,
            commissionStatus: 'PENDING'
          }
        });

        // 2. 获取注册奖励配置并发放奖励
        const registerReward = await this.configService.getConfig('REGISTER_REWARD');
        console.log('📋 获取到的注册奖励配置:', registerReward);
        
        if (registerReward > 0) {
          // 给邀请人发放积分奖励
          const updatedUser = await tx.user.update({
            where: { id: inviterIdNum },
            data: {
              points: {
                increment: registerReward
              }
            },
            select: { points: true }
          });

          // 记录积分交易
          await tx.pointTransaction.create({
            data: {
              userId: inviterIdNum,
              transactionType: 'INVITE_REWARD',
              amount: registerReward,
              balanceAfter: updatedUser.points,
              description: `邀请注册奖励 - 成功邀请用户 ${invitee.username} 注册`,
              metadata: JSON.stringify({
                inviteeId: inviteeIdNum,
                inviteeUsername: invitee.username,
                rewardType: 'REGISTER_REWARD',
                inviteRecordId: inviteRecord.id
              })
            }
          });

          console.log('✅ 注册奖励发放成功:', {
            inviterId: inviterIdNum,
            inviteeId: inviteeIdNum,
            reward: registerReward,
            newBalance: updatedUser.points
          });
        }

        return inviteRecord;
      });

      console.log('✅ 邀请关系建立和奖励发放成功:', { 
        inviteRecordId: result.id,
        inviterId: inviterIdNum, 
        inviteeId: inviteeIdNum 
      });
      
      return true;
    } catch (error) {
      console.error('❌ 处理邀请注册失败:', error);
      return false;
    }
  }


  /**
   * 处理充值佣金（替代原来的首充佣金）
   */
  async handleRechargeCommission(userId, rechargeAmount, orderNo) {
    console.log('💰 处理充值佣金:', { userId, rechargeAmount, orderNo });

    try {
      // 查找用户的邀请记录
      const inviteRecord = await this.prisma.inviteRecord.findFirst({
        where: { 
          inviteeId: parseInt(userId),
          status: 'REGISTERED'
        },
        include: {
          inviter: {
            select: { 
              id: true, 
              username: true, 
              email: true,
              isTrafficAgent: true
            }
          }
        }
      });

      if (!inviteRecord || !inviteRecord.inviter) {
        console.log('💡 用户没有邀请关系，跳过佣金处理');
        return { success: true, message: '无邀请关系' };
      }

      const inviter = inviteRecord.inviter;
      console.log('👤 找到邀请人:', { 
        inviterId: inviter.id, 
        inviterName: inviter.username,
        isTrafficAgent: inviter.isTrafficAgent 
      });

      // 使用事务发放佣金
      await this.prisma.$transaction(async (tx) => {
        // 获取积分佣金比例
        const pointCommissionRate = await this.configService.getConfig('RECHARGE_COMMISSION_RATE');
        const pointCommissionAmount = Math.floor(rechargeAmount * pointCommissionRate / 100);

        // 发放积分佣金
        if (pointCommissionAmount > 0) {
          // 给邀请人发放积分佣金
          const updatedUser = await tx.user.update({
            where: { id: inviter.id },
            data: {
              points: {
                increment: pointCommissionAmount
              }
            },
            select: { points: true }
          });

          // 记录积分交易
          await tx.pointTransaction.create({
            data: {
              userId: inviter.id,
              transactionType: 'INVITE_REWARD',
              amount: pointCommissionAmount,
              balanceAfter: updatedUser.points,
              description: `充值佣金奖励 - 用户充值 ¥${rechargeAmount}`,
              metadata: JSON.stringify({
                inviteeId: parseInt(userId),
                rechargeAmount: rechargeAmount,
                commissionRate: pointCommissionRate,
                orderNo: orderNo,
                rewardType: 'RECHARGE_COMMISSION'
              })
            }
          });

          console.log('✅ 积分佣金发放成功:', {
            inviterId: inviter.id,
            amount: pointCommissionAmount,
            newBalance: updatedUser.points
          });
        }

        // 如果是流量手，还要发放现金佣金
        if (inviter.isTrafficAgent) {
          const moneyCommissionRate = await this.configService.getConfig('MONEY_COMMISSION_RATE');
          const moneyCommissionAmount = (rechargeAmount * moneyCommissionRate / 100);

          if (moneyCommissionAmount > 0) {
            // 创建现金佣金记录
            await tx.commissionRecord.create({
              data: {
                userId: inviter.id,
                inviteeId: parseInt(userId),
                rechargeAmount: rechargeAmount,
                commissionRate: moneyCommissionRate,
                commissionAmount: moneyCommissionAmount,
                orderNo: orderNo,
                status: 'PENDING',
                commissionType: 'RECHARGE',
                description: `充值现金佣金 - 用户充值 ¥${rechargeAmount}`
              }
            });

            console.log('✅ 现金佣金记录创建成功:', {
              inviterId: inviter.id,
              amount: moneyCommissionAmount,
              rate: moneyCommissionRate
            });
          }
        }
      });

      // 更新邀请记录状态
      await this.prisma.inviteRecord.update({
        where: { id: inviteRecord.id },
        data: {
          status: 'ACTIVATED',
          firstRechargeAt: new Date(),
          firstRechargeAmount: rechargeAmount
        }
      });

      return { success: true, message: '佣金处理成功' };

    } catch (error) {
      console.error('❌ 处理充值佣金失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取佣金记录
   */
  async getCommissionRecords(userId, page = 1, limit = 10) {
    console.log('📊 获取佣金记录:', { userId, page, limit });

    try {
      const offset = (page - 1) * limit;

      const [records, total] = await Promise.all([
        this.prisma.commissionRecord.findMany({
          where: { userId: parseInt(userId) },
          include: {
            invitee: {
              select: {
                username: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        this.prisma.commissionRecord.count({
          where: { userId: parseInt(userId) }
        })
      ]);

      return {
        success: true,
        data: {
          records,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };

    } catch (error) {
      console.error('❌ 获取佣金记录失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取邀请汇总数据（简化版本，用于新接口）
   */
  async getInviteSummary(userId) {
    console.log('📊 获取邀请汇总数据:', { userId });

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: { 
          id: true, 
          username: true,
          isTrafficAgent: true
        }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 基础数据结构
      const result = {
        userInfo: {
          userId: user.id,
          username: user.username,
          isTrafficAgent: user.isTrafficAgent || false
        },
        inviteStats: {
          totalInvites: 0,
          registeredInvites: 0,
          activatedInvites: 0
        },
        pointRewards: {
          registerRewards: 0,
          rechargeRewards: 0,
          totalRewards: 0
        },
        commissionSummary: null
      };

      // 安全获取邀请统计
      try {
        const inviteCount = await this.prisma.inviteRecord.count({
          where: { inviterId: parseInt(userId) }
        });
        result.inviteStats.totalInvites = inviteCount;
        result.inviteStats.registeredInvites = inviteCount;

        const activatedCount = await this.prisma.inviteRecord.count({
          where: { 
            inviterId: parseInt(userId),
            status: 'ACTIVATED'
          }
        });
        result.inviteStats.activatedInvites = activatedCount;
      } catch (inviteError) {
        console.warn('⚠️ 获取邀请统计失败，使用默认值:', inviteError.message);
      }

      // 安全获取积分奖励统计
      try {
        const [registerRewards, rechargeRewards] = await Promise.all([
          this.prisma.pointTransaction.aggregate({
            where: {
              userId: parseInt(userId),
              transactionType: 'INVITE_REWARD',
              description: { contains: '注册奖励' }
            },
            _sum: { amount: true }
          }).catch(() => ({ _sum: { amount: 0 } })),
          this.prisma.pointTransaction.aggregate({
            where: {
              userId: parseInt(userId),
              transactionType: 'INVITE_REWARD',
              description: { contains: '充值佣金' }
            },
            _sum: { amount: true }
          }).catch(() => ({ _sum: { amount: 0 } }))
        ]);

        result.pointRewards.registerRewards = registerRewards._sum.amount || 0;
        result.pointRewards.rechargeRewards = rechargeRewards._sum.amount || 0;
        result.pointRewards.totalRewards = result.pointRewards.registerRewards + result.pointRewards.rechargeRewards;
      } catch (pointError) {
        console.warn('⚠️ 获取积分奖励统计失败，使用默认值:', pointError.message);
      }

      // 如果是流量手，获取现金佣金汇总
      if (user.isTrafficAgent) {
        try {
          const cashCommissions = await this.prisma.commissionRecord.aggregate({
            where: { userId: parseInt(userId) },
            _sum: { commissionAmount: true }
          });

          if (cashCommissions._sum.commissionAmount) {
            // 获取本月佣金
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const monthlyCommissionData = await this.prisma.commissionRecord.aggregate({
              where: {
                userId: parseInt(userId),
                createdAt: { gte: startOfMonth }
              },
              _sum: { commissionAmount: true }
            });

            result.commissionSummary = {
              totalCommission: cashCommissions._sum.commissionAmount || 0,
              pendingCommission: cashCommissions._sum.commissionAmount || 0,
              paidCommission: 0,
              monthlyCommission: monthlyCommissionData._sum.commissionAmount || 0
            };
          }
        } catch (commissionError) {
          console.warn('⚠️ 获取现金佣金统计失败，跳过:', commissionError.message);
        }
      }

      console.log('✅ 邀请汇总数据获取成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 获取邀请汇总数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户邀请汇总（区分角色）- 保持向后兼容
   */
  async getUserInviteSummary(userId) {
    console.log('📊 获取用户邀请汇总:', { userId });

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: { 
          id: true, 
          username: true,
          isTrafficAgent: true
        }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 获取邀请统计
      const [inviteCount, totalRechargeAmount, pointCommissions, cashCommissions] = await Promise.all([
        // 邀请人数
        this.prisma.inviteRecord.count({
          where: { inviterId: parseInt(userId) }
        }),
        
        // 累计充值金额
        this.prisma.inviteRecord.aggregate({
          where: { inviterId: parseInt(userId) },
          _sum: { firstRechargeAmount: true }
        }),
        
        // 积分佣金统计
        this.prisma.pointTransaction.aggregate({
          where: {
            userId: parseInt(userId),
            transactionType: 'INVITE_COMMISSION'
          },
          _sum: { amount: true }
        }),
        
        // 现金佣金统计（仅流量手）
        user.isTrafficAgent ? this.prisma.commissionRecord.aggregate({
          where: { userId: parseInt(userId) },
          _sum: { commissionAmount: true }
        }) : null
      ]);

      // 构建前端期望的数据结构
      const result = {
        userInfo: {
          userId: user.id,
          username: user.username,
          isTrafficAgent: user.isTrafficAgent || false
        },
        inviteStats: {
          totalInvites: inviteCount || 0,
          registeredInvites: inviteCount || 0,
          activatedInvites: 0 // 需要查询激活的邀请数量
        },
        pointRewards: {
          registerRewards: 0, // 需要分别统计注册和充值奖励
          rechargeRewards: 0,
          totalRewards: pointCommissions._sum.amount || 0
        },
        commissionSummary: null
      };

      // 获取激活的邀请数量
      const activatedInvites = await this.prisma.inviteRecord.count({
        where: { 
          inviterId: parseInt(userId),
          status: 'ACTIVATED'
        }
      });
      result.inviteStats.activatedInvites = activatedInvites;

      // 分别统计注册奖励和充值奖励
      const [registerRewards, rechargeRewards] = await Promise.all([
        this.prisma.pointTransaction.aggregate({
          where: {
            userId: parseInt(userId),
            transactionType: 'INVITE_REWARD',
            description: { contains: '注册奖励' }
          },
          _sum: { amount: true }
        }),
        this.prisma.pointTransaction.aggregate({
          where: {
            userId: parseInt(userId),
            transactionType: 'INVITE_REWARD',
            description: { contains: '充值佣金' }
          },
          _sum: { amount: true }
        })
      ]);

      result.pointRewards.registerRewards = registerRewards._sum.amount || 0;
      result.pointRewards.rechargeRewards = rechargeRewards._sum.amount || 0;

      // 如果是流量手，添加现金佣金汇总
      if (user.isTrafficAgent && cashCommissions) {
        // 获取本月佣金
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyCommissionData = await this.prisma.commissionRecord.aggregate({
          where: {
            userId: parseInt(userId),
            createdAt: { gte: startOfMonth }
          },
          _sum: { commissionAmount: true }
        });

        result.commissionSummary = {
          totalCommission: cashCommissions._sum.commissionAmount || 0,
          pendingCommission: cashCommissions._sum.commissionAmount || 0, // 假设都是待结算
          paidCommission: 0,
          monthlyCommission: monthlyCommissionData._sum.commissionAmount || 0
        };
      }

      return result;

    } catch (error) {
      console.error('❌ 获取邀请汇总失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取邀请注册记录
   */
  async getInviteRegistrations(filters, page = 1, limit = 10) {
    console.log('📋 获取邀请注册记录:', { filters, page, limit });

    try {
      const offset = (page - 1) * limit;
      const where = {};

      if (filters.inviterUserId) {
        where.inviterId = parseInt(filters.inviterUserId);
      }
      if (filters.inviterEmail) {
        where.inviter = {
          email: { contains: filters.inviterEmail }
        };
      }
      if (filters.inviteeEmail) {
        where.invitee = {
          email: { contains: filters.inviteeEmail }
        };
      }
      if (filters.startDate) {
        where.registeredAt = { gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        where.registeredAt = { ...where.registeredAt, lte: new Date(filters.endDate) };
      }

      const [records, total] = await Promise.all([
        this.prisma.inviteRecord.findMany({
          where,
          include: {
            inviter: {
              select: {
                username: true,
                email: true,
                isTrafficAgent: true
              }
            },
            invitee: {
              select: {
                username: true,
                email: true
              }
            }
          },
          orderBy: { registeredAt: 'desc' },
          take: limit,
          skip: offset
        }),
        this.prisma.inviteRecord.count({ where })
      ]);

      return {
        success: true,
        data: {
          registrations: records,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };

    } catch (error) {
      console.error('❌ 获取邀请注册记录失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取邀请充值记录
   */
  async getInviteRecharges(filters, page = 1, limit = 10) {
    console.log('💳 获取邀请充值记录:', { filters, page, limit });

    try {
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const where = {
        transactionType: 'INVITE_COMMISSION'
      };

      if (filters.inviterUserId) {
        where.userId = parseInt(filters.inviterUserId);
      }
      if (filters.startDate) {
        where.createdAt = { gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
      }

      const [records, total] = await Promise.all([
        this.prisma.pointTransaction.findMany({
          where,
          include: {
            user: {
              select: {
                username: true,
                email: true,
                isTrafficAgent: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        this.prisma.pointTransaction.count({ where })
      ]);

      return {
        success: true,
        data: {
          recharges: records,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };

    } catch (error) {
      console.error('❌ 获取邀请充值记录失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取邀请统计汇总
   */
  async getInviteStatsSummary(filters) {
    console.log('📈 获取邀请统计汇总:', filters);

    try {
      const where = {};
      
      if (filters.inviterUserId) {
        where.inviterId = parseInt(filters.inviterUserId);
      }
      if (filters.startDate) {
        where.registeredAt = { gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        where.registeredAt = { ...where.registeredAt, lte: new Date(filters.endDate) };
      }

      // 按邀请人分组统计
      const summaryData = await this.prisma.inviteRecord.groupBy({
        by: ['inviterId'],
        where,
        _count: { inviteeId: true },
        _sum: { firstRechargeAmount: true }
      });

      // 获取邀请人详细信息
      const summaryWithDetails = await Promise.all(
        summaryData.map(async (summary) => {
          const inviter = await this.prisma.user.findUnique({
            where: { id: summary.inviterId },
            select: { 
              id: true, 
              username: true, 
              email: true,
              isTrafficAgent: true,
              createdAt: true
            }
          });

          // 获取积分佣金统计
          const pointCommissions = await this.prisma.pointTransaction.aggregate({
            where: {
              userId: summary.inviterId,
              transactionType: 'INVITE_COMMISSION'
            },
            _sum: { amount: true }
          });

          // 获取现金佣金统计（仅流量手）
          const cashCommissions = inviter?.isTrafficAgent ? 
            await this.prisma.commissionRecord.aggregate({
              where: { userId: summary.inviterId },
              _sum: { commissionAmount: true }
            }) : null;

          return {
            inviter,
            inviteCount: summary._count.inviteeId,
            totalRechargeAmount: summary._sum.firstRechargeAmount || 0,
            totalPointCommission: pointCommissions._sum.amount || 0,
            totalCashCommission: cashCommissions?._sum.commissionAmount || 0
          };
        })
      );

      return {
        success: true,
        data: { summary: summaryWithDetails }
      };

    } catch (error) {
      console.error('❌ 获取邀请统计汇总失败:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = { InviteService };