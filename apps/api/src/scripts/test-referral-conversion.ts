/**
 * 推荐转化系统集成测试
 * 测试完整流程：点击 → 注册 → 浏览 → 收藏 → 转化验证
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { ReferralService } from '../referral/referral.service';
import { ReferralRiskService } from '../referral/referral-risk.service';
import { ReferralExperimentService } from '../referral/referral-experiment.service';
import { ReferralAnalyticsService } from '../referral/referral-analytics.service';
import { ReferralCodeService } from '../referral/referral-code.service';
import { ReferralAttributionService } from '../referral/referral-attribution.service';
import { ReferralConversionService } from '../referral/referral-conversion.service';
import { ReferralCode } from '../referral/entities/referral-code.entity';
import { ReferralClick } from '../referral/entities/referral-click.entity';
import {
  ReferralAttribution,
  AttributionEventType,
  AttributionStatus,
} from '../referral/entities/referral-attribution.entity';
import { ReferralExperimentEvent } from '../referral/entities/referral-experiment-event.entity';
import { User } from '../users/entities/user.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
});

async function runTests() {
  console.log('🧪 Starting Referral Conversion System Tests\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    // 初始化服务
    const codeRepo = AppDataSource.getRepository(ReferralCode);
    const clickRepo = AppDataSource.getRepository(ReferralClick);
    const attrRepo = AppDataSource.getRepository(ReferralAttribution);
    const experimentEventRepo = AppDataSource.getRepository(
      ReferralExperimentEvent,
    );
    const userRepo = AppDataSource.getRepository(User);
    const riskService = new ReferralRiskService(clickRepo, attrRepo);
    const pointsService = {
      calculateReferralReward: (totalConversions: number) =>
        totalConversions <= 10 ? 20 : 30,
      addPoints: async () => undefined,
      checkAndAwardMilestoneBonus: async () => undefined,
      getTotalEarningsByActions: async () => 0,
    };
    const analyticsDedupService = {
      claim: async () => true,
    };
    const referralExperimentService = new ReferralExperimentService(
      attrRepo,
      experimentEventRepo,
    );
    const referralAnalyticsService = new ReferralAnalyticsService(
      codeRepo,
      clickRepo,
      attrRepo,
      pointsService as any,
    );
    const referralCodeService = new ReferralCodeService(
      codeRepo,
      referralAnalyticsService,
    );
    const referralAttributionService = new ReferralAttributionService(
      clickRepo,
      attrRepo,
      riskService,
      analyticsDedupService as any,
      referralCodeService,
    );
    const referralConversionService = new ReferralConversionService(
      codeRepo,
      attrRepo,
      userRepo,
      riskService,
      pointsService as any,
    );
    const referralService = new ReferralService(
      referralExperimentService,
      referralAnalyticsService,
      referralCodeService,
      referralAttributionService,
      referralConversionService,
    );

    let testsPassed = 0;
    let testsFailed = 0;

    // ============================================
    // Test 1: 检查 PRODUCT_VIEW 枚举值
    // ============================================
    console.log('📋 Test 1: Verify PRODUCT_VIEW enum exists');
    try {
      const enumCheck = await AppDataSource.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'product_view'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'referral_attributions_eventtype_enum')
        ) as exists
      `);

      if (enumCheck[0].exists) {
        console.log('   ✅ PRODUCT_VIEW enum value exists\n');
        testsPassed++;
      } else {
        console.log('   ❌ PRODUCT_VIEW enum value NOT found\n');
        testsFailed++;
      }
    } catch (error) {
      console.log('   ❌ Test failed:', error.message, '\n');
      testsFailed++;
    }

    // ============================================
    // Test 2: 创建测试推荐码
    // ============================================
    console.log('📋 Test 2: Create test referral code');
    let testCode: ReferralCode;
    try {
      // 查找或创建测试用户
      let testUser = await userRepo.findOne({
        where: { email: 'test-referrer@example.com' },
      });
      if (!testUser) {
        testUser = userRepo.create({
          email: 'test-referrer@example.com',
          username: 'TestReferrer',
          password: 'test',
          emailVerified: true,
        });
        await userRepo.save(testUser);
      }

      testCode = await referralService.getOrCreateUserCode(testUser.id);
      console.log(`   ✅ Test referral code created: ${testCode.code}\n`);
      testsPassed++;
    } catch (error) {
      console.log('   ❌ Test failed:', error.message, '\n');
      testsFailed++;
      throw error;
    }

    // ============================================
    // Test 3: 记录推荐点击
    // ============================================
    console.log('📋 Test 3: Record referral click');
    let testClick: ReferralClick | null;
    try {
      testClick = await referralService.recordClick({
        code: testCode.code,
        sessionId: 'test-session-123',
        landingPage: `/r/${testCode.code}`,
        redirectTo: '/',
        userAgent: 'Test Agent',
        ip: '127.0.0.1',
      });

      if (testClick) {
        console.log(`   ✅ Referral click recorded: ${testClick.id}\n`);
        testsPassed++;
      } else {
        console.log('   ❌ Failed to record click\n');
        testsFailed++;
        throw new Error('Click recording failed');
      }
    } catch (error) {
      console.log('   ❌ Test failed:', error.message, '\n');
      testsFailed++;
      throw error;
    }

    // ============================================
    // Test 4: 创建商品浏览归因（新功能）
    // ============================================
    console.log('📋 Test 4: Create PRODUCT_VIEW attributions');
    try {
      // 创建测试用户（被推荐人）
      let referredUser = await userRepo.findOne({
        where: { email: 'test-referred@example.com' },
      });
      if (!referredUser) {
        referredUser = userRepo.create({
          email: 'test-referred@example.com',
          username: 'TestReferred',
          password: 'test',
          emailVerified: true,
        });
        await userRepo.save(referredUser);
      }

      // 创建 REGISTRATION 归因
      await referralService.createAttribution({
        referralClickId: testClick.id,
        eventType: AttributionEventType.REGISTRATION,
        userId: referredUser.id,
      });

      // 创建 3 个不同商品的浏览归因
      const productIds = ['product-001', 'product-002', 'product-003'];
      for (const productId of productIds) {
        await referralService.createAttribution({
          referralClickId: testClick.id,
          eventType: AttributionEventType.PRODUCT_VIEW,
          userId: referredUser.id,
          eventData: { productId },
        });
      }

      // 验证创建成功
      const viewCount = await attrRepo.count({
        where: {
          userId: referredUser.id,
          eventType: AttributionEventType.PRODUCT_VIEW,
        },
      });

      if (viewCount === 3) {
        console.log(`   ✅ Created ${viewCount} PRODUCT_VIEW attributions\n`);
        testsPassed++;
      } else {
        console.log(`   ❌ Expected 3 views, got ${viewCount}\n`);
        testsFailed++;
      }

      // ============================================
      // Test 5: 验证去重查询（同一商品多次浏览只计1次）
      // ============================================
      console.log('📋 Test 5: Verify distinct product count query');

      // 重复浏览 product-001
      await referralService.createAttribution({
        referralClickId: testClick.id,
        eventType: AttributionEventType.PRODUCT_VIEW,
        userId: referredUser.id,
        eventData: { productId: 'product-001' },
      });

      // 使用转化验证中的查询
      const distinctResult = await attrRepo
        .createQueryBuilder('attr')
        .select('COUNT(DISTINCT attr."eventData"->>\'productId\')', 'count')
        .where('attr.userId = :userId', { userId: referredUser.id })
        .andWhere('attr.eventType = :viewType', {
          viewType: AttributionEventType.PRODUCT_VIEW,
        })
        .getRawOne();

      const distinctCount = parseInt(distinctResult.count);
      if (distinctCount === 3) {
        console.log(
          `   ✅ Distinct product count: ${distinctCount} (duplicate correctly ignored)\n`,
        );
        testsPassed++;
      } else {
        console.log(
          `   ❌ Expected 3 distinct products, got ${distinctCount}\n`,
        );
        testsFailed++;
      }

      // ============================================
      // Test 6: 测试转化验证（应该失败 - 缺少收藏）
      // ============================================
      console.log(
        '📋 Test 6: Test conversion check (should fail - no favorite)',
      );

      const converted1 = await referralService.checkAndFinalizeConversion(
        referredUser.id,
      );

      if (!converted1) {
        console.log(
          '   ✅ Conversion correctly rejected (missing favorite action)\n',
        );
        testsPassed++;
      } else {
        console.log('   ❌ Conversion should have been rejected\n');
        testsFailed++;
      }

      // ============================================
      // Test 7: 添加收藏后测试转化（应该成功）
      // ============================================
      console.log('📋 Test 7: Test conversion after adding favorite');

      // 添加收藏归因
      await referralService.createAttribution({
        referralClickId: testClick.id,
        eventType: AttributionEventType.FAVORITE,
        userId: referredUser.id,
        eventData: { productId: 'product-001' },
      });

      const converted2 = await referralService.checkAndFinalizeConversion(
        referredUser.id,
      );

      if (converted2) {
        console.log('   ✅ Conversion successfully finalized\n');
        testsPassed++;
      } else {
        console.log('   ❌ Conversion should have succeeded\n');
        testsFailed++;
      }

      // 验证转化数
      const updatedCode = await codeRepo.findOne({
        where: { id: testCode.id },
      });
      if (updatedCode && updatedCode.totalConversions > 0) {
        console.log(
          `   ✅ Conversion count updated: ${updatedCode.totalConversions}\n`,
        );
        testsPassed++;
      } else {
        console.log('   ❌ Conversion count not updated\n');
        testsFailed++;
      }
    } catch (error) {
      console.log('   ❌ Tests 4-7 failed:', error.message, '\n');
      testsFailed++;
    }

    // ============================================
    // Test 8: 清理测试数据
    // ============================================
    console.log('📋 Test 8: Cleanup test data');
    try {
      await attrRepo.delete({ referralClickId: testClick.id });
      await clickRepo.delete({ id: testClick.id });
      await userRepo.delete({ email: 'test-referred@example.com' });
      console.log('   ✅ Test data cleaned up\n');
      testsPassed++;
    } catch (error) {
      console.log('   ⚠️  Cleanup warning:', error.message, '\n');
    }

    // ============================================
    // 总结
    // ============================================
    console.log('═══════════════════════════════════════');
    console.log('📊 Test Summary');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(
      `📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`,
    );
    console.log('═══════════════════════════════════════\n');

    if (testsFailed === 0) {
      console.log(
        '🎉 All tests passed! The referral conversion system is working correctly.\n',
      );
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.\n');
      process.exit(1);
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

runTests();
