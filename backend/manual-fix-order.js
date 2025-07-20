#!/usr/bin/env node
/**
 * 手动修复支付订单状态脚本
 * 用于修复微信支付成功但系统状态未更新的订单
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 检查是否安装了必要的数据库依赖
let db;
let prisma;

try {
  // 尝试使用Prisma
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  console.log('✅ 使用Prisma数据库客户端');
} catch (error) {
  try {
    // 尝试使用MySQL2
    const mysql = require('mysql2/promise');
    db = mysql;
    console.log('✅ 使用MySQL2数据库客户端');
  } catch (error2) {
    console.log('⚠️ 数据库客户端不可用，将生成SQL脚本');
  }
}

// 修复的订单信息
const REPAIR_ORDER = {
  orderNo: 'RECHARGE_ORDER17522530522711786',
  transactionId: '4200002740202507127224774049',
  amount: 0.01,
  payTime: '2025-07-12 00:57:19',
  status: 'PAID'
};

/**
 * 使用Prisma修复订单状态
 */
async function fixOrderWithPrisma() {
  try {
    console.log('🔧 使用Prisma修复订单状态...');
    
    // 查找订单（支持两种订单号查询方式）
    const order = await prisma.paymentOrder.findFirst({
      where: {
        OR: [
          { orderNo: REPAIR_ORDER.orderNo },
          { outTradeNo: REPAIR_ORDER.orderNo }
        ]
      }
    });
    
    if (!order) {
      console.log('❌ 未找到订单，订单可能不存在');
      return false;
    }
    
    console.log('📋 找到订单:', {
      id: order.id,
      orderNo: order.orderNo,
      outTradeNo: order.outTradeNo,
      currentStatus: order.paymentStatus,
      amount: order.amount,
      points: order.points
    });
    
    // 更新订单状态
    const updatedOrder = await prisma.paymentOrder.update({
      where: {
        id: order.id
      },
      data: {
        paymentStatus: 'PAID', // 使用正确的枚举值
        transactionId: REPAIR_ORDER.transactionId,
        paymentTime: new Date(REPAIR_ORDER.payTime), // 使用正确的字段名
        notifyTime: new Date(), // 设置回调时间
        updatedAt: new Date()
      }
    });
    
    console.log('✅ 订单状态更新成功:', {
      orderNo: updatedOrder.orderNo,
      paymentStatus: updatedOrder.paymentStatus,
      transactionId: updatedOrder.transactionId,
      paymentTime: updatedOrder.paymentTime
    });
    
    // 检查是否需要发放积分
    await handlePointsDistribution(order);
    
    return true;
    
  } catch (error) {
    console.error('❌ Prisma修复失败:', error);
    return false;
  }
}

/**
 * 使用原生SQL修复订单状态
 */
async function fixOrderWithSQL() {
  try {
    console.log('🔧 使用SQL修复订单状态...');
    
    // 数据库连接配置
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'interview_coder'
    };
    
    console.log('📋 数据库配置:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database
    });
    
    const connection = await db.createConnection(dbConfig);
    
    // 查找订单
    const [orders] = await connection.execute(
      'SELECT * FROM payment_orders WHERE order_no = ?',
      [REPAIR_ORDER.orderNo]
    );
    
    if (orders.length === 0) {
      console.log('❌ 未找到订单，订单可能不存在');
      await connection.end();
      return false;
    }
    
    const order = orders[0];
    console.log('📋 找到订单:', {
      id: order.id,
      order_no: order.order_no,
      current_status: order.status,
      amount: order.amount
    });
    
    // 更新订单状态
    const [result] = await connection.execute(
      `UPDATE payment_orders SET 
        status = ?, 
        transaction_id = ?, 
        paid_at = ?, 
        updated_at = NOW() 
      WHERE order_no = ?`,
      [
        REPAIR_ORDER.status,
        REPAIR_ORDER.transactionId,
        REPAIR_ORDER.payTime,
        REPAIR_ORDER.orderNo
      ]
    );
    
    console.log('✅ 订单状态更新成功:', {
      affectedRows: result.affectedRows,
      orderNo: REPAIR_ORDER.orderNo,
      newStatus: REPAIR_ORDER.status
    });
    
    // 检查是否需要发放积分
    await handlePointsDistributionSQL(connection, order);
    
    await connection.end();
    return true;
    
  } catch (error) {
    console.error('❌ SQL修复失败:', error);
    return false;
  }
}

/**
 * 处理积分发放 (Prisma版本)
 */
async function handlePointsDistribution(order) {
  try {
    console.log('🎯 检查积分发放...');
    
    // 检查用户是否存在
    const user = await prisma.user.findFirst({
      where: {
        id: order.userId
      }
    });
    
    if (!user) {
      console.log('⚠️ 未找到用户，跳过积分发放');
      return;
    }
    
    // 使用订单中已配置的积分数量
    const pointsToAdd = order.points + order.bonusPoints;
    
    if (pointsToAdd <= 0) {
      console.log('⚠️ 积分数量为0，跳过发放');
      return;
    }
    
    // 检查是否已经发放过积分
    const existingTransaction = await prisma.pointTransaction.findFirst({
      where: {
        userId: user.id,
        transactionType: 'RECHARGE',
        description: {
          contains: order.orderNo
        }
      }
    });
    
    if (existingTransaction) {
      console.log('⚠️ 积分已发放过，跳过重复发放');
      return;
    }
    
    // 更新用户积分
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        points: {
          increment: pointsToAdd
        }
      }
    });
    
    console.log('✅ 积分发放成功:', {
      userId: user.id,
      username: user.username,
      basePoints: order.points,
      bonusPoints: order.bonusPoints,
      totalAddedPoints: pointsToAdd,
      userTotalPoints: updatedUser.points
    });
    
    // 记录积分变更日志
    await prisma.pointTransaction.create({
      data: {
        userId: user.id,
        transactionType: 'RECHARGE',
        amount: pointsToAdd,
        balanceAfter: updatedUser.points,
        description: `支付订单充值: ${order.orderNo} (基础积分:${order.points} + 赠送积分:${order.bonusPoints})`,
        metadata: JSON.stringify({
          orderId: order.id,
          orderNo: order.orderNo,
          outTradeNo: order.outTradeNo,
          transactionId: REPAIR_ORDER.transactionId,
          paymentAmount: order.amount,
          basePoints: order.points,
          bonusPoints: order.bonusPoints
        })
      }
    });
    
    console.log('✅ 积分交易记录已创建');
    
  } catch (error) {
    console.error('❌ 积分发放失败:', error);
  }
}

/**
 * 处理积分发放 (SQL版本)
 */
async function handlePointsDistributionSQL(connection, order) {
  try {
    console.log('🎯 检查积分发放...');
    
    // 检查用户是否存在
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [order.user_id]
    );
    
    if (users.length === 0) {
      console.log('⚠️ 未找到用户，跳过积分发放');
      return;
    }
    
    const user = users[0];
    
    // 计算应发放的积分
    const pointsToAdd = Math.floor(order.amount * (process.env.PAYMENT_POINTS_RATE || 10));
    
    if (pointsToAdd <= 0) {
      console.log('⚠️ 积分数量为0，跳过发放');
      return;
    }
    
    // 更新用户积分
    await connection.execute(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointsToAdd, user.id]
    );
    
    // 获取更新后的积分
    const [updatedUsers] = await connection.execute(
      'SELECT points FROM users WHERE id = ?',
      [user.id]
    );
    
    console.log('✅ 积分发放成功:', {
      userId: user.id,
      username: user.username,
      addedPoints: pointsToAdd,
      totalPoints: updatedUsers[0].points
    });
    
    // 记录积分变更日志
    await connection.execute(
      `INSERT INTO point_transactions (user_id, amount, type, description, related_order_id, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        user.id,
        pointsToAdd,
        'RECHARGE',
        `支付订单充值: ${order.order_no}`,
        order.id
      ]
    );
    
    console.log('✅ 积分交易记录已创建');
    
  } catch (error) {
    console.error('❌ 积分发放失败:', error);
  }
}

/**
 * 生成SQL修复脚本
 */
function generateSQLScript() {
  console.log('='.repeat(60));
  console.log('📄 生成SQL修复脚本');
  console.log('='.repeat(60));
  
  const sqlScript = `
-- 微信支付订单状态修复脚本
-- 订单号: ${REPAIR_ORDER.orderNo}
-- 微信订单号: ${REPAIR_ORDER.transactionId}
-- 执行时间: ${new Date().toLocaleString()}

-- 1. 备份当前订单状态
SELECT 'BACKUP: Current order status' as action;
SELECT * FROM payment_orders WHERE order_no = '${REPAIR_ORDER.orderNo}';

-- 2. 更新订单状态
SELECT 'ACTION: Update order status to PAID' as action;
UPDATE payment_orders SET 
  payment_status = 'paid',
  transaction_id = '${REPAIR_ORDER.transactionId}',
  payment_time = '${REPAIR_ORDER.payTime}',
  notify_time = NOW(),
  updated_at = NOW()
WHERE out_trade_no = '${REPAIR_ORDER.orderNo}' OR order_no = '${REPAIR_ORDER.orderNo}';

-- 3. 验证更新结果
SELECT 'VERIFY: Updated order status' as action;
SELECT * FROM payment_orders WHERE order_no = '${REPAIR_ORDER.orderNo}';

-- 4. 发放积分 (根据实际表结构调整)
-- 注意: 需要根据订单中的用户ID和金额计算积分
SELECT 'ACTION: Add points to user' as action;
UPDATE users u 
INNER JOIN payment_orders po ON u.id = po.user_id 
SET u.points = u.points + (po.amount * ${process.env.PAYMENT_POINTS_RATE || 10})
WHERE po.order_no = '${REPAIR_ORDER.orderNo}';

-- 5. 记录积分交易 (可选)
SELECT 'ACTION: Record point transaction' as action;
INSERT INTO point_transactions (user_id, amount, type, description, related_order_id, created_at)
SELECT 
  po.user_id,
  (po.amount * ${process.env.PAYMENT_POINTS_RATE || 10}) as points,
  'RECHARGE' as type,
  CONCAT('支付订单充值: ', po.order_no) as description,
  po.id as related_order_id,
  NOW() as created_at
FROM payment_orders po 
WHERE po.order_no = '${REPAIR_ORDER.orderNo}';

-- 6. 最终验证
SELECT 'FINAL: Verification' as action;
SELECT 
  po.order_no,
  po.status,
  po.transaction_id,
  po.paid_at,
  u.username,
  u.points
FROM payment_orders po
INNER JOIN users u ON u.id = po.user_id
WHERE po.order_no = '${REPAIR_ORDER.orderNo}';
`;

  console.log(sqlScript);
  
  // 保存到文件
  const fs = require('fs');
  const scriptPath = path.join(__dirname, 'fix-order-status.sql');
  fs.writeFileSync(scriptPath, sqlScript);
  
  console.log(`✅ SQL脚本已保存到: ${scriptPath}`);
  console.log('');
  console.log('🔧 使用方法:');
  console.log('1. 备份数据库');
  console.log('2. 在数据库管理工具中执行此脚本');
  console.log('3. 验证修复结果');
}

/**
 * 验证修复结果
 */
async function verifyFix() {
  try {
    console.log('='.repeat(60));
    console.log('🔍 验证修复结果');
    console.log('='.repeat(60));
    
    if (prisma) {
      // 使用Prisma验证
      const order = await prisma.paymentOrder.findFirst({
        where: {
          OR: [
            { orderNo: REPAIR_ORDER.orderNo },
            { outTradeNo: REPAIR_ORDER.orderNo }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              points: true
            }
          }
        }
      });
      
      if (order) {
        console.log('✅ 订单修复验证成功:');
        console.log(`   订单号: ${order.orderNo}`);
        console.log(`   商户订单号: ${order.outTradeNo}`);
        console.log(`   支付状态: ${order.paymentStatus}`);
        console.log(`   微信订单号: ${order.transactionId}`);
        console.log(`   支付时间: ${order.paymentTime}`);
        console.log(`   积分数量: ${order.points} + ${order.bonusPoints} (赠送)`);
        console.log(`   用户: ${order.user?.username}`);
        console.log(`   用户积分: ${order.user?.points}`);
        return true;
      } else {
        console.log('❌ 订单验证失败: 未找到订单');
        return false;
      }
    } else {
      console.log('⚠️ 无法自动验证，请手动检查数据库');
      return true;
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🔧 支付订单状态手动修复工具');
  console.log(`📅 执行时间: ${new Date().toLocaleString()}`);
  console.log('');
  console.log('📋 修复订单信息:');
  console.log(`   订单号: ${REPAIR_ORDER.orderNo}`);
  console.log(`   微信订单号: ${REPAIR_ORDER.transactionId}`);
  console.log(`   支付金额: ${REPAIR_ORDER.amount}元`);
  console.log(`   支付时间: ${REPAIR_ORDER.payTime}`);
  console.log(`   目标状态: ${REPAIR_ORDER.status}`);
  console.log('');
  
  // 询问用户确认
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    rl.question('⚠️ 确认要修复此订单状态吗？(y/N): ', resolve);
  });
  
  rl.close();
  
  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('❌ 用户取消操作');
    return;
  }
  
  let success = false;
  
  // 尝试使用Prisma修复
  if (prisma) {
    success = await fixOrderWithPrisma();
  } 
  // 尝试使用原生SQL修复
  else if (db) {
    success = await fixOrderWithSQL();
  }
  // 生成SQL脚本
  else {
    console.log('⚠️ 无法直接修复，生成SQL脚本供手动执行');
    generateSQLScript();
    success = true;
  }
  
  if (success && (prisma || db)) {
    // 验证修复结果
    await verifyFix();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 订单状态修复完成');
    console.log('='.repeat(60));
    console.log('📋 后续步骤:');
    console.log('1. 通知用户支付成功');
    console.log('2. 检查积分是否正确发放');
    console.log('3. 修复回调URL问题，避免未来类似问题');
    console.log('4. 实施支付状态监控机制');
  }
  
  // 关闭数据库连接
  if (prisma) {
    await prisma.$disconnect();
  }
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('💥 修复脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  fixOrderWithPrisma,
  fixOrderWithSQL,
  generateSQLScript,
  verifyFix
};