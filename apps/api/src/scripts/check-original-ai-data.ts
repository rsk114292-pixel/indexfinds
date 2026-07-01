import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function checkOriginalData() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // 查找对应的 batch_job_item
    const items = await dataSource.query(`
      SELECT
        id,
        "aiGeneratedData"
      FROM batch_job_items
      WHERE "sourceUrl" LIKE '%7573653453%'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (items.length > 0) {
      const item = items[0];
      const aiData = item.ai_generated_data;
      const comprehensiveAnalysis = aiData?.comprehensiveAnalysis;

      console.log('找到原始 AI 分析数据');
      console.log('Batch Item ID:', item.id);
      console.log('\nAI 数据结构:');
      console.log('  - title:', aiData?.title);
      console.log('  - brandName:', aiData?.brandName);
      console.log('  - isMixedProduct:', aiData?.isMixedProduct);
      console.log('  - mixednessScore:', aiData?.mixednessScore);
      console.log('  - processingStrategy:', aiData?.processingStrategy);
      console.log('  - suggestedGroupCount:', aiData?.suggestedGroupCount);

      if (comprehensiveAnalysis) {
        console.log('\n综合分析数据:');
        console.log(
          '  - perImageAnalysis 数量:',
          comprehensiveAnalysis.perImageAnalysis?.length || 0,
        );
        console.log(
          '  - suggestedGroups 数量:',
          comprehensiveAnalysis.suggestedGroups?.length || 0,
        );
        console.log(
          '  - overallConfidence:',
          comprehensiveAnalysis.overallConfidence,
        );

        if (comprehensiveAnalysis.perImageAnalysis?.length > 0) {
          console.log('\n前 5 个图片分析:');
          comprehensiveAnalysis.perImageAnalysis
            .slice(0, 5)
            .forEach((img: any) => {
              console.log(
                `  [${img.imageIndex}] groupKey=${img.assignedGroupKey}, brand=${img.brand}, model=${img.model}`,
              );
            });
        }

        if (comprehensiveAnalysis.suggestedGroups?.length > 0) {
          console.log('\n分组信息:');
          comprehensiveAnalysis.suggestedGroups.forEach((group: any) => {
            console.log(
              `  - ${group.groupKey}: ${group.brand} ${group.model} (${group.imageIndexes?.length || 0} 张图片)`,
            );
          });
        }

        // 保存完整数据到文件以便查看
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(__dirname, '../../ai-analysis-debug.json');
        fs.writeFileSync(
          outputPath,
          JSON.stringify(comprehensiveAnalysis, null, 2),
        );
        console.log(`\n完整分析数据已保存到: ${outputPath}`);
      } else {
        console.log('\n⚠️ 没有 comprehensiveAnalysis 数据');
      }
    } else {
      console.log('未找到原始 AI 分析数据');
    }
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await app.close();
  }
}

checkOriginalData();
