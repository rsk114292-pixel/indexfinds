/**
 * 测试自动发布功能
 * 运行: npx ts-node src/scripts/test-auto-publish.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProductsService } from '../products/products.service';
import { DataSource } from 'typeorm';

async function testAutoPublish() {
  console.log('🚀 启动测试...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const productsService = app.get(ProductsService);
  const dataSource = app.get(DataSource);

  try {
    // 获取一个待审核的商品
    const items = await dataSource.query(`
      SELECT id, "sourceUrl", "sourceData", "aiGeneratedData"
      FROM batch_job_items
      WHERE status = 'review'
      LIMIT 1
    `);

    if (items.length === 0) {
      console.log('❌ 没有找到待审核的商品');
      return;
    }

    const item = items[0];
    console.log('📦 找到待审核商品:', item.id);
    console.log('   URL:', item.sourceUrl);
    console.log('   Title:', item.aiGeneratedData?.title);
    console.log('   BrandId:', item.aiGeneratedData?.brandId);
    console.log('   CategoryId:', item.aiGeneratedData?.primaryCategoryId);

    // 调用 createProductFromBatchItem
    console.log('\n📤 调用 createProductFromBatchItem...');

    const result = await productsService.createProductFromBatchItem({
      sourceUrl: item.sourceUrl,
      sourceData: {
        title: item.sourceData?.title,
        images: item.sourceData?.images || [],
        detailImages: item.sourceData?.detailImages || [],
        mainImage: item.sourceData?.mainImage,
        priceMin: item.sourceData?.priceMin,
        priceMax: item.sourceData?.priceMax,
        skus: item.sourceData?.skus || [],
        rawSkuInfo: item.sourceData?.rawSkuInfo,
        rawDetailDesc: item.sourceData?.rawDetailDesc,
      },
      aiData: {
        title: item.aiGeneratedData?.title,
        description: item.aiGeneratedData?.description,
        brandId: item.aiGeneratedData?.brandId,
        brandName: item.aiGeneratedData?.brandName,
        primaryCategoryId: item.aiGeneratedData?.primaryCategoryId,
        attributes: item.aiGeneratedData?.attributes,
      },
    });

    console.log('\n📥 结果:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ 商品创建成功!');
      console.log('   Product ID:', result.product?.id);
      console.log('   Slug:', result.product?.slug);

      // 更新 batch_job_item 状态
      await dataSource.query(
        `
        UPDATE batch_job_items
        SET status = 'published', "updatedAt" = NOW()
        WHERE id = $1
      `,
        [item.id],
      );
      console.log('   已更新 batch_job_item 状态为 published');
    } else {
      console.log('\n❌ 商品创建失败:', result.errors);
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

testAutoPublish();
