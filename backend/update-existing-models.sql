-- Update existing user configurations to use the new default model
-- This script updates all users who currently have the old claude-3-5-sonnet-20241022 model
-- to the new claude-sonnet-4-20250514 model

-- Show current counts before update
SELECT 'Before Update - Programming Model Count' as info, COUNT(*) as count
FROM user_configs WHERE programming_model = 'claude-3-5-sonnet-20241022'
UNION ALL
SELECT 'Before Update - Multiple Choice Model Count' as info, COUNT(*) as count
FROM user_configs WHERE multiple_choice_model = 'claude-3-5-sonnet-20241022'
UNION ALL
SELECT 'Before Update - AI Model Count' as info, COUNT(*) as count
FROM user_configs WHERE ai_model = 'claude-3-5-sonnet-20241022';

-- Update programming model
UPDATE user_configs SET 
  programming_model = 'claude-sonnet-4-20250514',
  updated_at = CURRENT_TIMESTAMP(3)
WHERE programming_model = 'claude-3-5-sonnet-20241022';

-- Update multiple choice model
UPDATE user_configs SET 
  multiple_choice_model = 'claude-sonnet-4-20250514',
  updated_at = CURRENT_TIMESTAMP(3)
WHERE multiple_choice_model = 'claude-3-5-sonnet-20241022';

-- Update ai model (general)
UPDATE user_configs SET 
  ai_model = 'claude-sonnet-4-20250514',
  updated_at = CURRENT_TIMESTAMP(3)
WHERE ai_model = 'claude-3-5-sonnet-20241022';

-- Show results after update
SELECT 'After Update - Programming Model Count' as info, COUNT(*) as count
FROM user_configs WHERE programming_model = 'claude-sonnet-4-20250514'
UNION ALL
SELECT 'After Update - Multiple Choice Model Count' as info, COUNT(*) as count
FROM user_configs WHERE multiple_choice_model = 'claude-sonnet-4-20250514'
UNION ALL
SELECT 'After Update - AI Model Count' as info, COUNT(*) as count
FROM user_configs WHERE ai_model = 'claude-sonnet-4-20250514';

-- Show any remaining old models (should be 0)
SELECT 'Remaining Old Programming Models' as info, COUNT(*) as count
FROM user_configs WHERE programming_model = 'claude-3-5-sonnet-20241022'
UNION ALL
SELECT 'Remaining Old Multiple Choice Models' as info, COUNT(*) as count
FROM user_configs WHERE multiple_choice_model = 'claude-3-5-sonnet-20241022'
UNION ALL
SELECT 'Remaining Old AI Models' as info, COUNT(*) as count
FROM user_configs WHERE ai_model = 'claude-3-5-sonnet-20241022';