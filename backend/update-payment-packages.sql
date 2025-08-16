-- 更新支付套餐表结构，添加标签字段
ALTER TABLE payment_packages 
ADD COLUMN label VARCHAR(50) NULL COMMENT '套餐标签：hot_sale(热门推荐), best_value(性价比之选), limited_time(限时优惠)',
ADD COLUMN label_color VARCHAR(20) NULL COMMENT '标签颜色：red, blue, green, orange',
ADD INDEX idx_is_recommended (is_recommended);

-- 清空现有数据
DELETE FROM payment_packages;

-- 插入3个示例套餐数据
INSERT INTO payment_packages (
  name, 
  description, 
  amount, 
  points, 
  bonus_points, 
  is_active, 
  sort_order, 
  label, 
  label_color, 
  is_recommended
) VALUES 
(
  '基础套餐', 
  '适合新手用户，满足日常AI答题需求', 
  9.90, 
  100, 
  20, 
  true, 
  1, 
  'best_value', 
  'blue', 
  false
),
(
  '标准套餐', 
  '最受欢迎的选择，积分充足性价比高', 
  19.90, 
  220, 
  50, 
  true, 
  2, 
  'hot_sale', 
  'red', 
  true
),
(
  '专业套餐', 
  '高频使用用户首选，送积分最多', 
  39.90, 
  500, 
  120, 
  true, 
  3, 
  'limited_time', 
  'orange', 
  false
);