/**
 * 混合商品检测功能验证脚本
 *
 * 运行方式：
 * npx ts-node -r tsconfig-paths/register src/scripts/test-mixed-product-detection.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AIService } from '../ai/ai.service';
import { ProductAIEnhancerService } from '../products/product-ai-enhancer.service';

async function testMixedProductDetection() {
  console.log('\n========== 混合商品检测验证 ==========\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const aiService = app.get(AIService);
    const aiEnhancerService = app.get(ProductAIEnhancerService);

    // 测试 1: 验证 AIService.analyzeProductComprehensive 方法存在
    console.log('✓ 测试 1: AIService.analyzeProductComprehensive 方法');
    if (typeof aiService.analyzeProductComprehensive === 'function') {
      console.log('  → 方法存在 ✓');
    } else {
      console.log('  → 方法不存在 ✗');
    }

    // 测试 2: 验证 ProductAIEnhancerService.analyzeAndEnhanceComprehensive 方法存在
    console.log(
      '\n✓ 测试 2: ProductAIEnhancerService.analyzeAndEnhanceComprehensive 方法',
    );
    if (
      typeof aiEnhancerService.analyzeAndEnhanceComprehensive === 'function'
    ) {
      console.log('  → 方法存在 ✓');
    } else {
      console.log('  → 方法不存在 ✗');
    }

    // 测试 3: 验证降级处理（空图片）
    console.log('\n✓ 测试 3: 降级处理（空图片数组）');
    const fallbackResult =
      await aiEnhancerService.analyzeAndEnhanceComprehensive(
        [], // 空图片
        undefined,
        'Test Product',
      );
    console.log('  → 降级结果:', {
      translatedTitle: fallbackResult.translatedTitle,
      processingStrategy: fallbackResult.processingStrategy,
      isMixedProduct: fallbackResult.isMixedProduct,
      mixednessScore: fallbackResult.mixednessScore,
    });

    // 测试 4: 验证处理策略决策
    console.log('\n✓ 测试 4: 处理策略决策 (determineStatusByMixedness)');
    const testCases = [
      { confidence: 0.9, isMixed: false, strategy: 'single_product' as const },
      { confidence: 0.8, isMixed: true, strategy: 'split_products' as const },
      { confidence: 0.4, isMixed: false, strategy: 'manual_review' as const },
    ];

    for (const tc of testCases) {
      const status = aiEnhancerService.determineStatusByMixedness(
        tc.confidence,
        tc.isMixed,
        tc.strategy,
      );
      console.log(
        `  → confidence=${tc.confidence}, isMixed=${tc.isMixed}, strategy=${tc.strategy} => status=${status}`,
      );
    }

    console.log('\n========== 验证完成 ==========\n');
    console.log('如需完整测试，请使用真实微店 URL 调用 API：');
    console.log('POST /products/import-from-weidian-v2');
    console.log('Body: { "url": "https://weidian.com/item.html?itemID=xxx" }');
  } catch (error) {
    console.error('验证失败:', error);
  } finally {
    await app.close();
  }
}

testMixedProductDetection();
