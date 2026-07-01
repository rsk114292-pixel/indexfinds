/**
 * 测试搜索追踪 API
 * 使用方法: node scripts/diagnostics/test-search-tracking.js
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSearchTracking() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  await dataSource.initialize();
  console.log('Database connected\n');

  try {
    // 1. 检查表结构
    console.log('=== 1. 检查表结构 ===');
    const tables = await dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name IN ('search_logs', 'search_impressions', 'search_clicks')
      ORDER BY table_name;
    `);
    console.log('已创建的表:', tables.map((t: any) => t.table_name).join(', '));

    // 2. 检查数据量
    console.log('\n=== 2. 检查数据量 ===');
    const searchLogsCount = await dataSource.query(
      `SELECT COUNT(*) as count FROM search_logs`,
    );
    const impressionsCount = await dataSource.query(
      `SELECT COUNT(*) as count FROM search_impressions`,
    );
    const clicksCount = await dataSource.query(
      `SELECT COUNT(*) as count FROM search_clicks`,
    );

    console.log(`搜索日志: ${searchLogsCount[0].count} 条`);
    console.log(`曝光记录: ${impressionsCount[0].count} 条`);
    console.log(`点击记录: ${clicksCount[0].count} 条`);

    // 3. 查看最近的搜索日志
    console.log('\n=== 3. 最近 5 条搜索日志 ===');
    const recentSearches = await dataSource.query(`
      SELECT id, keyword, result_count, created_at
      FROM search_logs
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    if (recentSearches.length === 0) {
      console.log('暂无搜索日志（请先进行一次搜索）');
    } else {
      recentSearches.forEach((s: any, i: number) => {
        console.log(
          `${i + 1}. "${s.keyword}" - ${s.result_count} 结果 - ${s.created_at}`,
        );
      });
    }

    // 4. 模拟插入测试数据
    console.log('\n=== 4. 插入测试数据 ===');

    // 使用现有的搜索日志来测试（避免创建不完整的记录）
    const existingLog = await dataSource.query(`
      SELECT id FROM search_logs ORDER BY created_at DESC LIMIT 1;
    `);

    if (existingLog.length === 0) {
      console.log('没有搜索日志，请先进行一次搜索再运行测试');
      await dataSource.destroy();
      return;
    }

    const searchLogId = existingLog[0].id;
    console.log(`使用现有搜索日志: ${searchLogId}`);

    // 获取一些商品 ID 用于测试
    const products = await dataSource.query(`
      SELECT id FROM products LIMIT 3;
    `);

    if (products.length === 0) {
      console.log('没有商品数据，跳过曝光/点击测试');
    } else {
      // 插入曝光记录
      for (let i = 0; i < products.length; i++) {
        await dataSource.query(
          `
          INSERT INTO search_impressions ("searchLogId", "productId", position, page)
          VALUES ($1, $2, $3, 1);
        `,
          [searchLogId, products[i].id, i],
        );
      }
      console.log(`插入 ${products.length} 条曝光记录`);

      // 插入点击记录
      const clickResult = await dataSource.query(
        `
        INSERT INTO search_clicks ("searchLogId", query, "productId", position, page)
        VALUES ($1, 'test tracking query', $2, 0, 1)
        RETURNING id;
      `,
        [searchLogId, products[0].id],
      );
      console.log(`插入点击记录: ${clickResult[0].id}`);

      // 标记转化
      await dataSource.query(
        `
        UPDATE search_clicks SET converted = true WHERE id = $1;
      `,
        [clickResult[0].id],
      );
      console.log('标记转化成功');
    }

    // 5. 验证数据
    console.log('\n=== 5. 验证插入的数据 ===');
    const verifyImpressions = await dataSource.query(
      `
      SELECT COUNT(*) as count FROM search_impressions WHERE "searchLogId" = $1;
    `,
      [searchLogId],
    );
    const verifyClicks = await dataSource.query(
      `
      SELECT * FROM search_clicks WHERE "searchLogId" = $1;
    `,
      [searchLogId],
    );

    console.log(`曝光记录数: ${verifyImpressions[0].count}`);
    console.log(`点击记录: ${JSON.stringify(verifyClicks[0], null, 2)}`);

    // 6. 清理测试数据
    console.log('\n=== 6. 清理测试数据 ===');
    // 只删除测试的曝光和点击数据，不删除原有的搜索日志
    await dataSource.query(
      `DELETE FROM search_clicks WHERE "searchLogId" = $1;`,
      [searchLogId],
    );
    await dataSource.query(
      `DELETE FROM search_impressions WHERE "searchLogId" = $1;`,
      [searchLogId],
    );
    console.log('测试数据已清理');

    console.log('\n✅ 追踪功能验证完成！');
  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

testSearchTracking().catch(console.error);
