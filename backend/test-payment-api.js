const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// 中间件
app.use(cors());
app.use(express.json());

// 简单的身份验证中间件（跳过实际验证，仅用于测试）
const simpleAuth = (req, res, next) => {
  console.log('🔍 收到请求:', req.method, req.path);
  console.log('📝 Headers:', req.headers);
  next();
};

app.use('/api/admin', simpleAuth);

// 获取所有充值套餐
app.get('/api/admin/payment-packages', async (req, res) => {
  try {
    console.log('📦 获取充值套餐...');
    const packages = await prisma.paymentPackage.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    console.log(`✅ 成功获取 ${packages.length} 个套餐`);
    res.json({
      success: true,
      data: {
        packages,
        total: packages.length,
        message: '获取充值套餐成功'
      }
    });
  } catch (error) {
    console.error('❌ 获取充值套餐失败:', error);
    res.status(500).json({
      success: false,
      error: '获取充值套餐失败',
      message: error.message
    });
  }
});

// 创建充值套餐
app.post('/api/admin/payment-packages', async (req, res) => {
  try {
    console.log('📝 创建充值套餐:', req.body);
    const { name, description, amount, points, bonusPoints } = req.body;

    // 参数验证
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: '套餐名称不能为空'
      });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: '套餐价格必须是大于0的数字'
      });
    }

    if (!points || isNaN(parseInt(points)) || parseInt(points) <= 0) {
      return res.status(400).json({
        success: false,
        error: '积分数量必须是大于0的整数'
      });
    }

    const bonusPointsValue = bonusPoints ? parseInt(bonusPoints) : 0;
    if (bonusPointsValue < 0) {
      return res.status(400).json({
        success: false,
        error: '奖励积分不能为负数'
      });
    }

    // 创建套餐
    const newPackage = await prisma.paymentPackage.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        amount: parseFloat(amount),
        points: parseInt(points),
        bonusPoints: bonusPointsValue,
        isActive: true,
        sortOrder: 0
      }
    });

    console.log('✅ 套餐创建成功:', newPackage);
    res.json({
      success: true,
      data: {
        package: newPackage,
        message: '创建充值套餐成功'
      }
    });
  } catch (error) {
    console.error('❌ 创建充值套餐失败:', error);
    res.status(500).json({
      success: false,
      error: '创建充值套餐失败',
      message: error.message
    });
  }
});

// 更新充值套餐
app.put('/api/admin/payment-packages/:id', async (req, res) => {
  try {
    const packageId = parseInt(req.params.id);
    const { name, description, amount, points, bonusPoints } = req.body;

    console.log(`📝 更新充值套餐 ID: ${packageId}`, req.body);

    if (isNaN(packageId)) {
      return res.status(400).json({
        success: false,
        error: '套餐ID无效'
      });
    }

    // 参数验证
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: '套餐名称不能为空'
      });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: '套餐价格必须是大于0的数字'
      });
    }

    if (!points || isNaN(parseInt(points)) || parseInt(points) <= 0) {
      return res.status(400).json({
        success: false,
        error: '积分数量必须是大于0的整数'
      });
    }

    const bonusPointsValue = bonusPoints ? parseInt(bonusPoints) : 0;
    if (bonusPointsValue < 0) {
      return res.status(400).json({
        success: false,
        error: '奖励积分不能为负数'
      });
    }

    // 检查套餐是否存在
    const existingPackage = await prisma.paymentPackage.findUnique({
      where: { id: packageId }
    });

    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        error: '套餐不存在'
      });
    }

    // 更新套餐
    const updatedPackage = await prisma.paymentPackage.update({
      where: { id: packageId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        amount: parseFloat(amount),
        points: parseInt(points),
        bonusPoints: bonusPointsValue
      }
    });

    console.log('✅ 套餐更新成功:', updatedPackage);
    res.json({
      success: true,
      data: {
        package: updatedPackage,
        message: '更新充值套餐成功'
      }
    });
  } catch (error) {
    console.error('❌ 更新充值套餐失败:', error);
    res.status(500).json({
      success: false,
      error: '更新充值套餐失败',
      message: error.message
    });
  }
});

// 删除充值套餐
app.delete('/api/admin/payment-packages/:id', async (req, res) => {
  try {
    const packageId = parseInt(req.params.id);

    console.log(`🗑️ 删除充值套餐 ID: ${packageId}`);

    if (isNaN(packageId)) {
      return res.status(400).json({
        success: false,
        error: '套餐ID无效'
      });
    }

    // 检查套餐是否存在
    const existingPackage = await prisma.paymentPackage.findUnique({
      where: { id: packageId }
    });

    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        error: '套餐不存在'
      });
    }

    // 检查是否有关联的订单
    const orderCount = await prisma.paymentOrder.count({
      where: { packageId: packageId }
    });

    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        error: '该套餐已有订单记录，无法删除'
      });
    }

    // 删除套餐
    await prisma.paymentPackage.delete({
      where: { id: packageId }
    });

    console.log('✅ 套餐删除成功');
    res.json({
      success: true,
      data: {
        message: '删除充值套餐成功'
      }
    });
  } catch (error) {
    console.error('❌ 删除充值套餐失败:', error);
    res.status(500).json({
      success: false,
      error: '删除充值套餐失败',
      message: error.message
    });
  }
});

// 获取积分交易明细
app.get('/api/admin/usage-stats/transactions', async (req, res) => {
  try {
    console.log('📊 获取积分交易明细...', req.query);
    
    const { 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate, 
      userEmail, 
      transactionType 
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    // 构建查询条件
    let whereClause = '';
    const params = [];
    
    if (startDate) {
      whereClause += ' AND pt.created_at >= ?';
      params.push(new Date(startDate));
    }
    
    if (endDate) {
      whereClause += ' AND pt.created_at <= ?';
      params.push(new Date(endDate + ' 23:59:59'));
    }
    
    if (userEmail) {
      whereClause += ' AND u.email LIKE ?';
      params.push(`%${userEmail}%`);
    }
    
    if (transactionType) {
      whereClause += ' AND pt.transaction_type = ?';
      params.push(transactionType);
    }
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM point_transactions pt
      JOIN users u ON pt.user_id = u.id
      WHERE 1=1${whereClause}
    `;
    
    const totalResult = await prisma.$queryRawUnsafe(countQuery, ...params);
    const total = Number(totalResult[0].total);
    
    // 查询明细数据
    const query = `
      SELECT 
        pt.id,
        pt.transaction_type,
        pt.amount,
        pt.balance_after,
        pt.model_name,
        pt.question_type,
        pt.description,
        pt.created_at,
        u.username,
        u.email
      FROM point_transactions pt
      JOIN users u ON pt.user_id = u.id
      WHERE 1=1${whereClause}
      ORDER BY pt.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limitNum, offset);
    const transactions = await prisma.$queryRawUnsafe(query, ...params);
    
    // 格式化操作类型
    const formattedTransactions = transactions.map(tx => ({
      ...tx,
      operationType: getOperationType(tx.transaction_type, tx.question_type),
      amount: tx.amount
    }));
    
    console.log(`✅ 成功获取 ${transactions.length} 条交易记录`);
    
    res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: Math.ceil(total / limitNum)
        },
        message: '获取交易明细成功'
      }
    });
  } catch (error) {
    console.error('❌ 获取交易明细失败:', error);
    res.status(500).json({
      success: false,
      error: '获取交易明细失败',
      message: error.message
    });
  }
});

// 获取积分使用统计汇总
app.get('/api/admin/usage-stats/summary', async (req, res) => {
  try {
    console.log('📊 获取积分使用统计汇总...', req.query);
    
    const { 
      startDate, 
      endDate, 
      userEmail,
      groupBy = 'user' // user, type, total
    } = req.query;
    
    // 构建时间范围条件
    let whereClause = '';
    const params = [];
    
    if (startDate) {
      whereClause += ' AND pt.created_at >= ?';
      params.push(new Date(startDate));
    }
    
    if (endDate) {
      whereClause += ' AND pt.created_at <= ?';
      params.push(new Date(endDate + ' 23:59:59'));
    }
    
    if (userEmail) {
      whereClause += ' AND u.email LIKE ?';
      params.push(`%${userEmail}%`);
    }
    
    let query = '';
    let summaryData = [];
    
    if (groupBy === 'user') {
      // 按用户汇总
      query = `
        SELECT 
          u.id as user_id,
          u.username,
          u.email,
          SUM(CASE WHEN pt.transaction_type = 'consume' THEN ABS(pt.amount) ELSE 0 END) as total_consumed,
          SUM(CASE WHEN pt.transaction_type = 'recharge' THEN pt.amount ELSE 0 END) as total_recharged,
          COUNT(CASE WHEN pt.transaction_type = 'consume' THEN 1 END) as consume_count,
          COUNT(CASE WHEN pt.transaction_type = 'recharge' THEN 1 END) as recharge_count,
          SUM(CASE WHEN pt.transaction_type = 'consume' AND pt.question_type = 'programming' THEN ABS(pt.amount) ELSE 0 END) as programming_consumed,
          SUM(CASE WHEN pt.transaction_type = 'consume' AND pt.question_type = 'multiple_choice' THEN ABS(pt.amount) ELSE 0 END) as choice_consumed
        FROM users u
        LEFT JOIN point_transactions pt ON u.id = pt.user_id
        WHERE 1=1${whereClause}
        GROUP BY u.id, u.username, u.email
        HAVING total_consumed > 0 OR total_recharged > 0
        ORDER BY total_consumed DESC
      `;
    } else if (groupBy === 'type') {
      // 按操作类型汇总
      query = `
        SELECT 
          pt.transaction_type,
          pt.question_type,
          COUNT(*) as transaction_count,
          SUM(ABS(pt.amount)) as total_points,
          COUNT(DISTINCT pt.user_id) as unique_users
        FROM point_transactions pt
        JOIN users u ON pt.user_id = u.id
        WHERE 1=1${whereClause}
        GROUP BY pt.transaction_type, pt.question_type
        ORDER BY total_points DESC
      `;
    } else {
      // 总体汇总
      query = `
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(DISTINCT pt.user_id) as total_users,
          SUM(CASE WHEN pt.transaction_type = 'consume' THEN ABS(pt.amount) ELSE 0 END) as total_consumed,
          SUM(CASE WHEN pt.transaction_type = 'recharge' THEN pt.amount ELSE 0 END) as total_recharged,
          COUNT(CASE WHEN pt.transaction_type = 'consume' THEN 1 END) as consume_transactions,
          COUNT(CASE WHEN pt.transaction_type = 'recharge' THEN 1 END) as recharge_transactions,
          SUM(CASE WHEN pt.transaction_type = 'consume' AND pt.question_type = 'programming' THEN ABS(pt.amount) ELSE 0 END) as programming_points,
          SUM(CASE WHEN pt.transaction_type = 'consume' AND pt.question_type = 'multiple_choice' THEN ABS(pt.amount) ELSE 0 END) as choice_points
        FROM point_transactions pt
        JOIN users u ON pt.user_id = u.id
        WHERE 1=1${whereClause}
      `;
    }
    
    summaryData = await prisma.$queryRawUnsafe(query, ...params);
    
    // 转换BigInt为Number
    const formattedSummary = summaryData.map(item => {
      const formatted = {};
      for (const [key, value] of Object.entries(item)) {
        formatted[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      return formatted;
    });
    
    console.log(`✅ 成功获取统计汇总数据，${groupBy}模式`);
    
    res.json({
      success: true,
      data: {
        summary: formattedSummary,
        groupBy,
        message: '获取统计汇总成功'
      }
    });
  } catch (error) {
    console.error('❌ 获取统计汇总失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计汇总失败',
      message: error.message
    });
  }
});

// 辅助函数：格式化操作类型
function getOperationType(transactionType, questionType) {
  if (transactionType === 'recharge') {
    return '充值';
  } else if (transactionType === 'consume') {
    if (questionType === 'programming') {
      return '编程题搜题';
    } else if (questionType === 'multiple_choice') {
      return '选择题搜题';
    } else {
      return '消费';
    }
  } else if (transactionType === 'reward') {
    return '奖励';
  } else if (transactionType === 'refund') {
    return '退款';
  }
  return '未知';
}

// 获取当前公告（公开接口）
app.get('/api/announcements/current', async (req, res) => {
  try {
    console.log('📢 获取当前公告...');
    
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { startTime: null, endTime: null },
          { startTime: null, endTime: { gte: now } },
          { startTime: { lte: now }, endTime: null },
          { startTime: { lte: now }, endTime: { gte: now } }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 1
    });
    
    console.log(`✅ 成功获取 ${announcements.length} 个公告`);
    
    res.json({
      success: true,
      data: {
        announcement: announcements[0] || null,
        message: '获取公告成功'
      }
    });
  } catch (error) {
    console.error('❌ 获取公告失败:', error);
    res.status(500).json({
      success: false,
      error: '获取公告失败',
      message: error.message
    });
  }
});

// 获取所有公告（管理员接口）
app.get('/api/admin/announcements', async (req, res) => {
  try {
    console.log('📢 获取所有公告...');
    
    const announcements = await prisma.announcement.findMany({
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    console.log(`✅ 成功获取 ${announcements.length} 个公告`);
    
    res.json({
      success: true,
      data: {
        announcements,
        total: announcements.length,
        message: '获取公告列表成功'
      }
    });
  } catch (error) {
    console.error('❌ 获取公告列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取公告列表失败',
      message: error.message
    });
  }
});

// 创建公告
app.post('/api/admin/announcements', async (req, res) => {
  try {
    console.log('📝 创建公告:', req.body);
    const { title, content, isActive, priority, showStyle, startTime, endTime } = req.body;

    // 参数验证
    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        error: '公告标题不能为空'
      });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: '公告内容不能为空'
      });
    }

    // 创建公告
    const newAnnouncement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        priority: priority ? parseInt(priority) : 0,
        showStyle: showStyle || 'info',
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        createdBy: null // TODO: 从session获取用户ID
      }
    });

    console.log('✅ 公告创建成功:', newAnnouncement);
    res.json({
      success: true,
      data: {
        announcement: newAnnouncement,
        message: '创建公告成功'
      }
    });
  } catch (error) {
    console.error('❌ 创建公告失败:', error);
    res.status(500).json({
      success: false,
      error: '创建公告失败',
      message: error.message
    });
  }
});

// 更新公告
app.put('/api/admin/announcements/:id', async (req, res) => {
  try {
    const announcementId = parseInt(req.params.id);
    const { title, content, isActive, priority, showStyle, startTime, endTime } = req.body;

    console.log(`📝 更新公告 ID: ${announcementId}`, req.body);

    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: '公告ID无效'
      });
    }

    // 参数验证
    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        error: '公告标题不能为空'
      });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: '公告内容不能为空'
      });
    }

    // 检查公告是否存在
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });

    if (!existingAnnouncement) {
      return res.status(404).json({
        success: false,
        error: '公告不存在'
      });
    }

    // 更新公告
    const updatedAnnouncement = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title: title.trim(),
        content: content.trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : existingAnnouncement.isActive,
        priority: priority !== undefined ? parseInt(priority) : existingAnnouncement.priority,
        showStyle: showStyle || existingAnnouncement.showStyle,
        startTime: startTime !== undefined ? (startTime ? new Date(startTime) : null) : existingAnnouncement.startTime,
        endTime: endTime !== undefined ? (endTime ? new Date(endTime) : null) : existingAnnouncement.endTime
      }
    });

    console.log('✅ 公告更新成功:', updatedAnnouncement);
    res.json({
      success: true,
      data: {
        announcement: updatedAnnouncement,
        message: '更新公告成功'
      }
    });
  } catch (error) {
    console.error('❌ 更新公告失败:', error);
    res.status(500).json({
      success: false,
      error: '更新公告失败',
      message: error.message
    });
  }
});

// 删除公告
app.delete('/api/admin/announcements/:id', async (req, res) => {
  try {
    const announcementId = parseInt(req.params.id);

    console.log(`🗑️ 删除公告 ID: ${announcementId}`);

    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: '公告ID无效'
      });
    }

    // 检查公告是否存在
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });

    if (!existingAnnouncement) {
      return res.status(404).json({
        success: false,
        error: '公告不存在'
      });
    }

    // 删除公告
    await prisma.announcement.delete({
      where: { id: announcementId }
    });

    console.log('✅ 公告删除成功');
    res.json({
      success: true,
      data: {
        message: '删除公告成功'
      }
    });
  } catch (error) {
    console.error('❌ 删除公告失败:', error);
    res.status(500).json({
      success: false,
      error: '删除公告失败',
      message: error.message
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log('');
  console.log('🎉 测试API服务器启动成功!');
  console.log(`🚀 服务器运行在端口: ${PORT}`);
  console.log(`🔗 API地址: http://localhost:${PORT}`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  console.log(`📦 充值套餐API: http://localhost:${PORT}/api/admin/payment-packages`);
  console.log('');
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});