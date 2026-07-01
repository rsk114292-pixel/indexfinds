import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Product } from '../products/entities/product.entity';

/**
 * 修复 splitMetadata 结构
 *
 * 问题：旧版本的代码在创建商品时，splitMetadata 缺少 aiAnalysisSnapshot 字段
 * 解决：将 comprehensiveAnalysis 从 batch_job_items 表迁移到 products.splitMetadata.aiAnalysisSnapshot
 */
async function fixSplitMetadata() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('开始修复 splitMetadata...');

    // 查找所有混合商品
    const products = await dataSource.getRepository(Product).find({
      where: {
        potentialMixedProduct: true,
      },
    });

    console.log(`找到 ${products.length} 个混合商品`);

    let fixed = 0;
    let skipped = 0;
    let failed = 0;

    for (const product of products) {
      try {
        const rawMetadata = product.splitMetadata as any;

        // 如果已经有 aiAnalysisSnapshot，跳过
        if (rawMetadata?.aiAnalysisSnapshot) {
          console.log(
            `跳过 ${product.id} (${product.title}): 已有 aiAnalysisSnapshot`,
          );
          skipped++;
          continue;
        }

        // 如果没有 suggestedGroups，无法修复
        if (
          !rawMetadata?.suggestedGroups ||
          rawMetadata.suggestedGroups.length === 0
        ) {
          console.log(
            `跳过 ${product.id} (${product.title}): 缺少 suggestedGroups`,
          );
          skipped++;
          continue;
        }

        // 重建 aiAnalysisSnapshot
        const aiAnalysisSnapshot = {
          overview: {
            totalImages: product.images?.length || 0,
            mixednessScore: {
              brandDiversity: 0,
              modelDiversity: 0,
              visualConsistency: 1,
              overallScore: product.mixednessScore || 0,
            },
            isRecommendedToSplit: true,
            splitReason:
              rawMetadata.processingStrategy === 'split_products'
                ? '多品牌/多款式'
                : undefined,
            detectedBrands: Array.from(
              new Set(
                (rawMetadata.suggestedGroups || []).map((g: any) => g.brand),
              ),
            ),
            detectedModels: Array.from(
              new Set(
                (rawMetadata.suggestedGroups || []).map((g: any) => g.model),
              ),
            ),
          },
          perImageAnalysis: [],
          suggestedGroups: rawMetadata.suggestedGroups,
          overallConfidence: rawMetadata.overallConfidence || 0,
          warnings: ['从旧数据结构自动迁移'],
        };

        // 更新 splitMetadata
        const updatedMetadata = {
          ...rawMetadata,
          aiAnalysisSnapshot,
        };

        await dataSource.getRepository(Product).update(product.id, {
          splitMetadata: updatedMetadata,
        });

        console.log(`✅ 修复 ${product.id} (${product.title})`);
        fixed++;
      } catch (error) {
        console.error(`❌ 修复 ${product.id} 失败:`, error.message);
        failed++;
      }
    }

    console.log('\n修复完成:');
    console.log(`  ✅ 成功: ${fixed}`);
    console.log(`  ⏭️  跳过: ${skipped}`);
    console.log(`  ❌ 失败: ${failed}`);
  } catch (error) {
    console.error('脚本执行失败:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

fixSplitMetadata()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
