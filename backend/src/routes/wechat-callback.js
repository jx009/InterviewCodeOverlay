const express = require('express');
const WechatPayV2Service = require('../services/WechatPayV2Service');
const Database = require('../../database');

const router = express.Router();
const wechatPay = new WechatPayV2Service();
const db = new Database();

/**
 * POST /api/payment/wechat/callback
 * 微信支付回调处理
 */
router.post('/callback', async (req, res) => {
  let rawBody = '';
  
  // 获取原始XML数据
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });

  req.on('end', async () => {
    try {
      console.log('收到微信支付回调:', rawBody);
      
      // 记录回调日志
      await logPaymentNotify(rawBody, req.headers);

      // 处理回调数据
      const result = await wechatPay.handleNotify(rawBody);
      
      if (!result.success) {
        console.error('微信支付回调处理失败:', result.message);
        await updateNotifyLog(rawBody, 'FAILED', result.message);
        
        // 返回失败响应
        res.set('Content-Type', 'application/xml');
        return res.send(wechatPay.generateNotifyResponse(false, result.message));
      }

      // 处理支付成功
      const processResult = await processPaymentSuccess(result);
      
      if (processResult.success) {
        console.log(`微信支付回调处理成功: ${result.outTradeNo}`);
        await updateNotifyLog(rawBody, 'SUCCESS', '处理成功');
        
        // 返回成功响应
        res.set('Content-Type', 'application/xml');
        res.send(wechatPay.generateNotifyResponse(true, 'OK'));
      } else {
        console.error('处理支付成功业务逻辑失败:', processResult.message);
        await updateNotifyLog(rawBody, 'FAILED', processResult.message);
        
        // 返回失败响应（虽然微信支付成功了，但业务处理失败）
        res.set('Content-Type', 'application/xml');
        res.send(wechatPay.generateNotifyResponse(false, '业务处理失败'));
      }

    } catch (error) {
      console.error('微信支付回调异常:', error);
      await updateNotifyLog(rawBody, 'FAILED', error.message);
      
      // 返回失败响应
      res.set('Content-Type', 'application/xml');
      res.send(wechatPay.generateNotifyResponse(false, '服务器内部错误'));
    }
  });

  req.on('error', (error) => {
    console.error('接收微信支付回调数据失败:', error);
    res.set('Content-Type', 'application/xml');
    res.send(wechatPay.generateNotifyResponse(false, '接收数据失败'));
  });
});

/**
 * 记录支付回调日志
 */
async function logPaymentNotify(requestBody, headers) {
  try {
    // 从XML中提取订单号（简单解析）
    const outTradeNoMatch = requestBody.match(/<out_trade_no><!\[CDATA\[(.*?)\]\]><\/out_trade_no>/);
    const orderNo = outTradeNoMatch ? outTradeNoMatch[1] : 'UNKNOWN';

    await db.prisma.paymentNotifyLog.create({
      data: {
        orderNo,
        paymentMethod: 'WECHAT_PAY',
        notifyType: 'payment_result',
        requestBody,
        requestHeaders: JSON.stringify(headers),
        processStatus: 'PENDING'
      }
    });

  } catch (error) {
    console.error('记录回调日志失败:', error);
  }
}

/**
 * 更新回调处理日志
 */
async function updateNotifyLog(requestBody, status, message) {
  try {
    const outTradeNoMatch = requestBody.match(/<out_trade_no><!\[CDATA\[(.*?)\]\]><\/out_trade_no>/);
    const orderNo = outTradeNoMatch ? outTradeNoMatch[1] : 'UNKNOWN';

    // 查找最新的回调日志记录
    const latestLog = await db.prisma.paymentNotifyLog.findFirst({
      where: {
        orderNo,
        paymentMethod: 'WECHAT_PAY'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (latestLog) {
      await db.prisma.paymentNotifyLog.update({
        where: { id: latestLog.id },
        data: {
          processStatus: status.toUpperCase(),
          errorMessage: message,
          processTime: new Date()
        }
      });
    }

  } catch (error) {
    console.error('更新回调日志失败:', error);
  }
}

/**
 * 处理支付成功的业务逻辑
 */
async function processPaymentSuccess(wechatResult) {
  try {
    // 使用Prisma事务处理支付成功逻辑
    const result = await db.prisma.$transaction(async (prisma) => {
      // 1. 查询订单信息
      const order = await prisma.paymentOrder.findFirst({
        where: {
          outTradeNo: wechatResult.outTradeNo
        },
        select: {
          orderNo: true,
          userId: true,
          points: true,
          bonusPoints: true,
          paymentStatus: true,
          amount: true,
          packageId: true
        }
      });
      
      if (!order) {
        throw new Error('订单不存在');
      }

      // 2. 检查订单状态，避免重复处理
      if (order.paymentStatus === 'PAID') {
        return {
          success: true,
          message: '订单已处理过',
          data: {
            userId: order.userId,
            orderNo: order.orderNo,
            pointsAdded: order.points + order.bonusPoints
          }
        };
      }

      // 3. 验证支付金额
      const expectedAmount = wechatPay.yuanToFen(order.amount);
      if (wechatResult.totalFee !== expectedAmount) {
        throw new Error(`支付金额不匹配: 期望${expectedAmount}分，实际${wechatResult.totalFee}分`);
      }

      // 4. 更新订单状态
      await prisma.paymentOrder.update({
        where: { outTradeNo: wechatResult.outTradeNo },
        data: {
          paymentStatus: 'PAID',
          paymentTime: new Date(wechatResult.timeEnd),
          transactionId: wechatResult.transactionId,
          notifyTime: new Date()
        }
      });

      // 5. 给用户充值积分
      const totalPoints = order.points + order.bonusPoints;
      
      const updatedUser = await prisma.user.update({
        where: { id: order.userId },
        data: {
          points: {
            increment: totalPoints
          }
        },
        select: { points: true }
      });

      // 6. 记录积分交易
      await prisma.pointTransaction.create({
        data: {
          userId: order.userId,
          transactionType: 'RECHARGE',
          amount: totalPoints,
          balanceAfter: updatedUser.points,
          description: '微信支付充值成功',
          metadata: JSON.stringify({
            orderNo: order.orderNo,
            outTradeNo: wechatResult.outTradeNo,
            transactionId: wechatResult.transactionId,
            packageId: order.packageId,
            basePoints: order.points,
            bonusPoints: order.bonusPoints,
            paymentTime: wechatResult.timeEnd
          })
        }
      });

      console.log(`用户 ${order.userId} 充值成功: +${totalPoints}积分, 订单号: ${order.orderNo}`);
      
      return {
        success: true,
        message: '充值成功',
        data: {
          userId: order.userId,
          orderNo: order.orderNo,
          pointsAdded: totalPoints,
          balanceAfter: updatedUser.points
        }
      };
    });

    return result;

  } catch (error) {
    console.error('处理支付成功业务逻辑失败:', error);
    return {
      success: false,
      message: `业务处理失败: ${error.message}`
    };
  }
}

/**
 * GET /api/payment/wechat/test-callback
 * 测试回调接口（仅开发环境使用）
 */
router.get('/test-callback', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not Found' });
  }

  res.json({
    success: true,
    message: '微信支付回调接口正常',
    endpoint: '/api/payment/wechat/callback',
    method: 'POST',
    contentType: 'application/xml'
  });
});

module.exports = router;