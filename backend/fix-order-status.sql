
-- 微信支付订单状态修复脚本
-- 订单号: RECHARGE_ORDER17522530522711786
-- 微信订单号: 4200002740202507127224774049
-- 执行时间: 7/12/2025, 1:07:27 AM

-- 1. 备份当前订单状态
SELECT 'BACKUP: Current order status' as action;
SELECT * FROM payment_orders WHERE order_no = 'RECHARGE_ORDER17522530522711786';

-- 2. 更新订单状态
SELECT 'ACTION: Update order status to PAID' as action;
UPDATE payment_orders SET 
  payment_status = 'paid',
  transaction_id = '4200002740202507127224774049',
  payment_time = '2025-07-12 00:57:19',
  notify_time = NOW(),
  updated_at = NOW()
WHERE out_trade_no = 'RECHARGE_ORDER17522530522711786' OR order_no = 'RECHARGE_ORDER17522530522711786';

-- 3. 验证更新结果
SELECT 'VERIFY: Updated order status' as action;
SELECT * FROM payment_orders WHERE order_no = 'RECHARGE_ORDER17522530522711786';

-- 4. 发放积分 (根据实际表结构调整)
-- 注意: 需要根据订单中的用户ID和金额计算积分
SELECT 'ACTION: Add points to user' as action;
UPDATE users u 
INNER JOIN payment_orders po ON u.id = po.user_id 
SET u.points = u.points + (po.amount * 10)
WHERE po.order_no = 'RECHARGE_ORDER17522530522711786';

-- 5. 记录积分交易 (可选)
SELECT 'ACTION: Record point transaction' as action;
INSERT INTO point_transactions (user_id, amount, type, description, related_order_id, created_at)
SELECT 
  po.user_id,
  (po.amount * 10) as points,
  'RECHARGE' as type,
  CONCAT('支付订单充值: ', po.order_no) as description,
  po.id as related_order_id,
  NOW() as created_at
FROM payment_orders po 
WHERE po.order_no = 'RECHARGE_ORDER17522530522711786';

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
WHERE po.order_no = 'RECHARGE_ORDER17522530522711786';
