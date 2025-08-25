import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 简单的用户ID提取中间件
const getUserId = (req: Request, res: Response, next: any): void => {
  const userId = req.headers['x-user-id'] || req.query.userId;
  if (!userId) {
    res.status(400).json({
      success: false,
      error: '请提供用户ID'
    });
    return;
  }
  (req as any).userId = parseInt(userId as string);
  next();
};

/**
 * 获取邀请注册记录
 * GET /api/invite/registrations?userId=8&page=1&limit=10&startDate=2023-01-01&endDate=2023-12-31&email=test@example.com
 */
router.get('/registrations', getUserId, async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const email = req.query.email as string;
    
    console.log('🎯 获取邀请注册记录:', { userId, page, limit, startDate, endDate, email });

    
    // 构建查询条件
    const whereCondition: any = {
      inviterId: userId // 查找被当前用户邀请的用户
    };
    
    // 日期范围筛选
    if (startDate || endDate) {
      whereCondition.createdAt = {};
      if (startDate) {
        whereCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 包含结束日期的整天，所以设置为下一天的开始
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        whereCondition.createdAt.lt = endDateTime;
      }
    }
    
    // 邮箱搜索
    if (email) {
      whereCondition.email = {
        contains: email,
        mode: 'insensitive'
      };
    }
    
    // 直接查询数据库：查找被该用户邀请的用户
    const invitedUsers = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });
    
    // 获取总数
    const total = await prisma.user.count({
      where: whereCondition
    });
    
    const totalPages = Math.ceil(total / limit);
    
    console.log('✅ 邀请注册记录获取成功:', { total, page, records: invitedUsers.length });
    
    res.json({
      success: true,
      data: {
        registrations: invitedUsers,
        total,
        page,
        limit,
        totalPages
      },
      message: '获取邀请注册记录成功'
    });
  } catch (error: any) {
    console.error('❌ 获取邀请注册记录失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取邀请注册记录失败'
    });
  }
});

/**
 * 获取邀请用户充值记录
 * GET /api/invite/recharges?userId=8&page=1&limit=10&startDate=2023-01-01&endDate=2023-12-31&email=test@example.com
 */
router.get('/recharges', getUserId, async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const email = req.query.email as string;
    
    console.log('🎯 获取邀请用户充值记录:', { userId, page, limit, startDate, endDate, email });
    
    // 构建用户筛选条件
    const userWhereCondition: any = {
      inviterId: userId
    };
    
    // 如果有邮箱搜索，添加到用户查询条件
    if (email) {
      userWhereCondition.email = {
        contains: email,
        mode: 'insensitive'
      };
    }
    
    // 查找被该用户邀请的用户列表
    const invitedUserIds = await prisma.user.findMany({
      where: userWhereCondition,
      select: {
        id: true
      }
    });
    
    const invitedIds = invitedUserIds.map(u => u.id);
    
    // 如果没有找到符合条件的用户，返回空结果
    if (invitedIds.length === 0) {
      return res.json({
        success: true,
        data: {
          recharges: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        },
        message: '获取邀请用户充值记录成功'
      });
    }
    
    // 构建充值记录查询条件
    const rechargeWhereCondition: any = {
      userId: {
        in: invitedIds
      },
      paymentStatus: 'PAID' // 只查询已支付的订单
    };
    
    // 日期范围筛选
    if (startDate || endDate) {
      rechargeWhereCondition.createdAt = {};
      if (startDate) {
        rechargeWhereCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 包含结束日期的整天，所以设置为下一天的开始
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        rechargeWhereCondition.createdAt.lt = endDateTime;
      }
    }
    
    // 查找这些用户的充值记录
    const rechargeRecords = await prisma.paymentOrder.findMany({
      where: rechargeWhereCondition,
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });
    
    // 获取总数
    const total = await prisma.paymentOrder.count({
      where: rechargeWhereCondition
    });
    
    const totalPages = Math.ceil(total / limit);
    
    console.log('✅ 邀请用户充值记录获取成功:', { total, page, records: rechargeRecords.length });
    
    res.json({
      success: true,
      data: {
        recharges: rechargeRecords,
        total,
        page,
        limit,
        totalPages
      },
      message: '获取邀请用户充值记录成功'
    });
    return;
  } catch (error: any) {
    console.error('❌ 获取邀请用户充值记录失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取邀请用户充值记录失败'
    });
    return;
  }
});

/**
 * 获取邀请统计数据
 * GET /api/invite/stats?userId=8&startDate=2023-01-01&endDate=2023-12-31
 */
router.get('/stats', getUserId, async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    console.log('🎯 获取邀请统计数据:', { userId, startDate, endDate });
    
    // 构建用户查询条件
    const userWhereCondition: any = {
      inviterId: userId
    };
    
    // 日期范围筛选 - 针对用户注册时间
    if (startDate || endDate) {
      userWhereCondition.createdAt = {};
      if (startDate) {
        userWhereCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 包含结束日期的整天，所以设置为下一天的开始
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        userWhereCondition.createdAt.lt = endDateTime;
      }
    }
    
    // 1. 统计邀请注册人数
    const totalInvitedUsers = await prisma.user.count({
      where: userWhereCondition
    });
    
    // 2. 获取被邀请用户的ID列表
    const invitedUserIds = await prisma.user.findMany({
      where: userWhereCondition,
      select: {
        id: true
      }
    });
    
    const invitedIds = invitedUserIds.map(u => u.id);
    
    // 构建充值记录查询条件
    const rechargeWhereCondition: any = {
      userId: {
        in: invitedIds
      },
      paymentStatus: 'PAID'
    };
    
    // 日期范围筛选 - 针对充值时间
    if (startDate || endDate) {
      rechargeWhereCondition.createdAt = {};
      if (startDate) {
        rechargeWhereCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 包含结束日期的整天，所以设置为下一天的开始
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        rechargeWhereCondition.createdAt.lt = endDateTime;
      }
    }
    
    // 3. 统计充值用户数量
    const totalRechargeUsers = await prisma.paymentOrder.groupBy({
      by: ['userId'],
      where: rechargeWhereCondition
    });
    
    // 4. 统计累计充值金额
    const totalRechargeAmount = await prisma.paymentOrder.aggregate({
      where: rechargeWhereCondition,
      _sum: {
        amount: true
      }
    });
    
    // 5. 统计充值次数
    const totalRechargeCount = await prisma.paymentOrder.count({
      where: rechargeWhereCondition
    });
    
    const stats = {
      totalInvitedUsers,
      totalRechargeUsers: totalRechargeUsers.length,
      totalRechargeAmount: Number(totalRechargeAmount._sum.amount) || 0,
      totalRechargeCount
    };
    
    console.log('✅ 邀请统计数据获取成功:', stats);
    
    res.json({
      success: true,
      data: stats,
      message: '获取邀请统计数据成功'
    });
  } catch (error: any) {
    console.error('❌ 获取邀请统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取邀请统计数据失败'
    });
  }
});

/**
 * 获取佣金记录（仅流量手）
 * GET /api/invite/commissions?userId=8&page=1&limit=10
 */
router.get('/commissions', getUserId, async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    console.log('💰 获取佣金记录:', { userId, page, limit });
    
    // 首先验证用户是否为流量手
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isTrafficAgent: true }
    });
    
    if (!user || !user.isTrafficAgent) {
      return res.status(403).json({
        success: false,
        message: '仅流量手可查看佣金记录'
      });
    }
    
    // 使用原生SQL查询佣金记录，模仿注册明细的查询方式
    const commissionRecords = await prisma.$queryRaw`
      SELECT 
        cr.id,
        cr.invitee_id as inviteeId,
        cr.recharge_amount as rechargeAmount,
        cr.commission_rate as commissionRate,
        cr.commission_amount as commissionAmount,
        cr.payment_order_id as paymentOrderId,
        cr.status,
        cr.created_at as createdAt,
        u.username as inviteeUsername,
        u.email as inviteeEmail
      FROM commission_records cr
      LEFT JOIN user u ON cr.invitee_id = u.id
      WHERE cr.traffic_agent_id = ${userId}
      ORDER BY cr.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    ` as any[];
    
    // 获取总数
    const totalResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM commission_records
      WHERE traffic_agent_id = ${userId}
    ` as any[];
    
    const total = Number(totalResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);
    
    console.log('✅ 佣金记录获取成功:', { total, page, records: commissionRecords.length });
    
    res.json({
      success: true,
      data: {
        records: commissionRecords.map((record: any) => ({
          id: Number(record.id),
          inviteeId: Number(record.inviteeId),
          inviteeUsername: record.inviteeUsername || '未知用户',
          inviteeEmail: record.inviteeEmail || '未知邮箱',
          rechargeAmount: Number(record.rechargeAmount),
          commissionRate: Number(record.commissionRate),
          commissionAmount: Number(record.commissionAmount),
          paymentOrderId: record.paymentOrderId,
          status: record.status,
          createdAt: record.createdAt
        })),
        total,
        page,
        limit,
        totalPages
      },
      message: '获取佣金记录成功'
    });
  } catch (error: any) {
    console.error('❌ 获取佣金记录失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取佣金记录失败'
    });
  }
});

export default router; 