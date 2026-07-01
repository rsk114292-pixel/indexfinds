import { DataSource } from 'typeorm';

async function checkSplitMetadata() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  // 直接查询，不加载实体
  const result = await dataSource.query(
    `SELECT id, title, mixedness_score, potential_mixed_product, status, split_metadata
     FROM products
     WHERE id = $1`,
    ['ab89d50b-77b4-4072-80c8-a4707ec7b4ed'],
  );

  const product = result[0];

  if (!product) {
    console.log('❌ 商品不存在');
    await dataSource.destroy();
    return;
  }

  console.log('\n📊 商品信息:');
  console.log(`  ID: ${product.id}`);
  console.log(`  标题: ${product.title}`);
  console.log(`  混合度: ${product.mixedness_score}`);
  console.log(`  潜在混合商品: ${product.potential_mixed_product}`);
  console.log(`  状态: ${product.status}`);

  console.log('\n🔍 splitMetadata 内容:');
  if (!product.split_metadata) {
    console.log('❌ splitMetadata 为空');
  } else {
    const metadata = product.split_metadata;
    console.log(`  处理策略: ${metadata.processingStrategy}`);
    console.log(`  分析时间: ${metadata.analysisTimestamp}`);

    if (metadata.aiAnalysisSnapshot) {
      const analysis = metadata.aiAnalysisSnapshot;
      console.log('\n📋 AI 分析结果:');
      console.log(`  总图片数: ${analysis.overview?.totalImages || 'N/A'}`);
      console.log(
        `  混合度评分: ${JSON.stringify(analysis.overview?.mixednessScore || {})}`,
      );
      console.log(`  建议拆分: ${analysis.overview?.isRecommendedToSplit}`);
      console.log(`  建议分组数: ${analysis.suggestedGroups?.length || 0}`);

      // 关键检查：perImageAnalysis
      if (
        analysis.perImageAnalysis &&
        Array.isArray(analysis.perImageAnalysis)
      ) {
        console.log(
          `\n✅ perImageAnalysis 存在！数量: ${analysis.perImageAnalysis.length}`,
        );
        console.log('\n前 3 条数据示例:');
        analysis.perImageAnalysis.slice(0, 3).forEach((img: any) => {
          console.log(
            `  - 图片 ${img.imageIndex}: ${img.brand} ${img.model} (${img.color || 'N/A'}) → ${img.assignedGroupKey}`,
          );
        });
      } else {
        console.log('\n❌ perImageAnalysis 不存在或不是数组');
      }

      if (analysis.suggestedGroups) {
        console.log(`\n📦 建议的分组 (${analysis.suggestedGroups.length} 个):`);
        analysis.suggestedGroups.forEach((group: any, index: number) => {
          console.log(`  ${index + 1}. ${group.groupKey}`);
          console.log(`     品牌: ${group.brand}, 型号: ${group.model}`);
          console.log(`     标题: ${group.productInfo?.title || 'N/A'}`);
          console.log(
            `     图片索引: [${group.imageIndexes?.join(', ') || 'N/A'}]`,
          );
          console.log(`     预估 SKU: ${group.estimatedSkuCount || 'N/A'}`);
        });
      }
    } else {
      console.log('❌ aiAnalysisSnapshot 不存在');
    }
  }

  await dataSource.destroy();
  console.log('\n✅ 检查完成');
}

checkSplitMetadata().catch(console.error);
