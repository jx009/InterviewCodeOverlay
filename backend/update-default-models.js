#!/usr/bin/env node

/**
 * Script to update existing user configurations from claude-3-5-sonnet-20241022 to claude-sonnet-4-20250514
 * This script safely updates all existing users to use the new default model.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateDefaultModels() {
  console.log('🚀 Starting update of default models from claude-3-5-sonnet-20241022 to claude-sonnet-4-20250514...\n');
  
  try {
    // Get counts before update
    const beforeCounts = await Promise.all([
      prisma.userConfig.count({ where: { programmingModel: 'claude-3-5-sonnet-20241022' } }),
      prisma.userConfig.count({ where: { multipleChoiceModel: 'claude-3-5-sonnet-20241022' } }),
      prisma.userConfig.count({ where: { aiModel: 'claude-3-5-sonnet-20241022' } })
    ]);

    console.log('📊 Current counts:');
    console.log(`   Programming Model (old): ${beforeCounts[0]} users`);
    console.log(`   Multiple Choice Model (old): ${beforeCounts[1]} users`);  
    console.log(`   AI Model (old): ${beforeCounts[2]} users\n`);

    if (beforeCounts[0] === 0 && beforeCounts[1] === 0 && beforeCounts[2] === 0) {
      console.log('✅ No users found with old model. Nothing to update.');
      return;
    }

    // Update programming model
    const programmingUpdate = await prisma.userConfig.updateMany({
      where: { programmingModel: 'claude-3-5-sonnet-20241022' },
      data: { 
        programmingModel: 'claude-sonnet-4-20250514',
        updatedAt: new Date()
      }
    });

    // Update multiple choice model  
    const multipleChoiceUpdate = await prisma.userConfig.updateMany({
      where: { multipleChoiceModel: 'claude-3-5-sonnet-20241022' },
      data: { 
        multipleChoiceModel: 'claude-sonnet-4-20250514',
        updatedAt: new Date()
      }
    });

    // Update ai model
    const aiModelUpdate = await prisma.userConfig.updateMany({
      where: { aiModel: 'claude-3-5-sonnet-20241022' },
      data: { 
        aiModel: 'claude-sonnet-4-20250514',
        updatedAt: new Date()
      }
    });

    console.log('✅ Update Results:');
    console.log(`   Programming Model: ${programmingUpdate.count} users updated`);
    console.log(`   Multiple Choice Model: ${multipleChoiceUpdate.count} users updated`);
    console.log(`   AI Model: ${aiModelUpdate.count} users updated\n`);

    // Verify update
    const afterCounts = await Promise.all([
      prisma.userConfig.count({ where: { programmingModel: 'claude-sonnet-4-20250514' } }),
      prisma.userConfig.count({ where: { multipleChoiceModel: 'claude-sonnet-4-20250514' } }),
      prisma.userConfig.count({ where: { aiModel: 'claude-sonnet-4-20250514' } }),
      // Check for any remaining old models  
      prisma.userConfig.count({ where: { programmingModel: 'claude-3-5-sonnet-20241022' } }),
      prisma.userConfig.count({ where: { multipleChoiceModel: 'claude-3-5-sonnet-20241022' } }),
      prisma.userConfig.count({ where: { aiModel: 'claude-3-5-sonnet-20241022' } })
    ]);

    console.log('📊 After Update:');
    console.log(`   Programming Model (new): ${afterCounts[0]} users`);
    console.log(`   Multiple Choice Model (new): ${afterCounts[1]} users`);
    console.log(`   AI Model (new): ${afterCounts[2]} users\n`);

    console.log('🔍 Remaining old models (should be 0):');
    console.log(`   Programming Model (old): ${afterCounts[3]} users`);
    console.log(`   Multiple Choice Model (old): ${afterCounts[4]} users`);
    console.log(`   AI Model (old): ${afterCounts[5]} users\n`);

    if (afterCounts[3] === 0 && afterCounts[4] === 0 && afterCounts[5] === 0) {
      console.log('🎉 All models updated successfully! No old models remaining.');
    } else {
      console.log('⚠️  Some old models still remain. Please check the database.');
    }

  } catch (error) {
    console.error('❌ Error updating default models:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update if this script is executed directly
if (require.main === module) {
  updateDefaultModels()
    .then(() => {
      console.log('\n✅ Update completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateDefaultModels };