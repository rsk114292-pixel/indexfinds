import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function checkProductData() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    const productId = 'cf96ee57-6f6d-4a61-9680-237b0c2296e9';

    // 查询商品数据
    const products = await dataSource.query(
      `
      SELECT
        id,
        title,
        "mixednessScore",
        "splitMetadata",
        images
      FROM products
      WHERE id = $1
    `,
      [productId],
    );

    if (products.length > 0) {
      const product = products[0];
      console.log('商品数据:');
      console.log('  ID:', product.id);
      console.log('  Title:', product.title);
      console.log('  MixednessScore:', product.mixednessScore);
      console.log('  Images 数量:', product.images?.length || 0);

      const splitMetadata = product.splitMetadata;
      console.log('\nsplitMetadata 结构:');
      console.log('  - analysisTimestamp:', splitMetadata?.analysisTimestamp);
      console.log('  - processingStrategy:', splitMetadata?.processingStrategy);
      console.log('  - overallConfidence:', splitMetadata?.overallConfidence);
      console.log(
        '  - suggestedGroups 数量:',
        splitMetadata?.suggestedGroups?.length || 0,
      );
      console.log(
        '  - 有 aiAnalysisSnapshot:',
        !!splitMetadata?.aiAnalysisSnapshot,
      );

      if (splitMetadata?.aiAnalysisSnapshot) {
        const analysis = splitMetadata.aiAnalysisSnapshot;
        console.log('\naiAnalysisSnapshot:');
        console.log(
          '  - perImageAnalysis 数量:',
          analysis.perImageAnalysis?.length || 0,
        );
        console.log(
          '  - suggestedGroups 数量:',
          analysis.suggestedGroups?.length || 0,
        );
        console.log('  - overallConfidence:', analysis.overallConfidence);

        if (analysis.suggestedGroups?.length > 0) {
          console.log('\n分组信息:');
          analysis.suggestedGroups.forEach((group: any, i: number) => {
            console.log(
              `  [${i}] ${group.groupKey}: ${group.brand} ${group.model}`,
            );
            console.log(
              `      - imageIndexes: ${group.imageIndexes?.length || 0} 张`,
            );
            console.log(`      - title: ${group.productInfo?.title}`);
          });
        }

        if (analysis.perImageAnalysis?.length > 0) {
          console.log('\n前 10 个图片分析:');
          analysis.perImageAnalysis.slice(0, 10).forEach((img: any) => {
            console.log(
              `  [${img.imageIndex}] ${img.brand} ${img.model} -> ${img.assignedGroupKey}`,
            );
          });
        } else {
          console.log('\n⚠️ perImageAnalysis 为空！');
        }
      }

      // 查询 SKU 数据
      const skus = await dataSource.query(
        `
        SELECT
          id,
          attributes,
          image
        FROM skus
        WHERE "productId" = $1
        LIMIT 10
      `,
        [productId],
      );

      console.log(`\n前 10 个 SKU:`);
      skus.forEach((sku: any, i: number) => {
        console.log(`  [${i}] ${sku.id}`);
        console.log(
          `      attributes:`,
          Object.entries(sku.attributes || {})
            .map(([k, v]) => `${k}=${v}`)
            .join(', '),
        );
        console.log(`      image:`, sku.image?.substring(0, 60) + '...');
      });

      // 保存完整数据
      const outputPath = path.join(__dirname, '../../product-split-debug.json');
      fs.writeFileSync(
        outputPath,
        JSON.stringify(
          {
            product: {
              id: product.id,
              title: product.title,
              mixednessScore: product.mixednessScore,
              images: product.images,
              splitMetadata,
            },
            skus: skus.slice(0, 5),
          },
          null,
          2,
        ),
      );
      console.log(`\n完整数据已保存到: ${outputPath}`);
    } else {
      console.log('商品不存在');
    }
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await app.close();
  }
}

checkProductData();
