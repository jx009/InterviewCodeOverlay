-- Update default model values in user_configs table
-- This migration changes the default model from claude-3-5-sonnet-20241022 to claude-sonnet-4-20250514

-- AlterTable: Update default values for model columns
ALTER TABLE `user_configs` 
  MODIFY COLUMN `programming_model` VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  MODIFY COLUMN `multiple_choice_model` VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  MODIFY COLUMN `ai_model` VARCHAR(100) NULL DEFAULT 'claude-sonnet-4-20250514';

-- Update existing records that still use the old default model
-- This ensures that users who were created with the old default get updated to the new model
UPDATE `user_configs` SET 
  `programming_model` = 'claude-sonnet-4-20250514'
WHERE `programming_model` = 'claude-3-5-sonnet-20241022';

UPDATE `user_configs` SET 
  `multiple_choice_model` = 'claude-sonnet-4-20250514'
WHERE `multiple_choice_model` = 'claude-3-5-sonnet-20241022';

UPDATE `user_configs` SET 
  `ai_model` = 'claude-sonnet-4-20250514'
WHERE `ai_model` = 'claude-3-5-sonnet-20241022';