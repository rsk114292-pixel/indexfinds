import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// 加载环境变量
config({ path: join(__dirname, '../../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
});

/**
 * 自动生成品牌别名变体
 * 复用 brands.service.ts 中的逻辑
 */
function generateAliases(name: string): string[] {
  const aliases: Set<string> = new Set();
  const trimmed = name.trim();
  const trimmedLower = trimmed.toLowerCase();

  // 1. 小写版本
  aliases.add(trimmedLower);

  // 2. 大写版本
  aliases.add(trimmed.toUpperCase());

  // 3. 去除空格版本
  const noSpace = trimmed.replace(/\s+/g, '');
  aliases.add(noSpace);
  aliases.add(noSpace.toLowerCase());

  // 4. 常见缩写 (首字母) - 仅当有多个单词时
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    const initials = words.map((w) => w[0]).join('');
    aliases.add(initials.toLowerCase());
    aliases.add(initials.toUpperCase());
  }

  // 5. 连字符转换
  if (trimmed.includes(' ')) {
    aliases.add(trimmed.replace(/\s+/g, '-').toLowerCase());
  }
  if (trimmed.includes('-')) {
    aliases.add(trimmed.replace(/-/g, ' ').toLowerCase());
    aliases.add(trimmed.replace(/-/g, '').toLowerCase());
  }

  // 6. 去除特殊字符版本
  const alphanumeric = trimmed
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')
    .toLowerCase();
  if (alphanumeric.length > 0) {
    aliases.add(alphanumeric);
  }

  // 移除与原名完全相同的别名，以及过短的别名
  aliases.delete(trimmed);
  aliases.delete(trimmedLower);

  return [...aliases].filter((a) => a.length >= 2);
}

async function migrateBrandAliases() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    const queryRunner = AppDataSource.createQueryRunner();

    // 步骤 1: 检查 brands 表是否存在
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'brands'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('⚠️ brands 表不存在，无需迁移');
      await AppDataSource.destroy();
      return;
    }

    // 步骤 2: 获取所有品牌
    const brands = await queryRunner.query(`
      SELECT id, name, aliases FROM brands ORDER BY name;
    `);

    console.log(`\n📋 共找到 ${brands.length} 个品牌`);

    // 统计
    let updatedCount = 0;
    let skippedCount = 0;

    // 步骤 3: 为没有别名或别名为空的品牌生成别名
    for (const brand of brands) {
      const existingAliases = brand.aliases
        ? brand.aliases.split(',').filter((a: string) => a.trim())
        : [];

      if (existingAliases.length > 0) {
        skippedCount++;
        continue;
      }

      const newAliases = generateAliases(brand.name);

      if (newAliases.length === 0) {
        skippedCount++;
        continue;
      }

      // 更新品牌别名
      const aliasesString = newAliases.join(',');
      await queryRunner.query(`UPDATE brands SET aliases = $1 WHERE id = $2`, [
        aliasesString,
        brand.id,
      ]);

      console.log(`  ✏️ ${brand.name}: ${newAliases.join(', ')}`);
      updatedCount++;
    }

    console.log(`\n📊 迁移统计:`);
    console.log(`   更新: ${updatedCount} 个品牌`);
    console.log(`   跳过: ${skippedCount} 个品牌（已有别名或无需生成）`);

    await AppDataSource.destroy();
    console.log('\n🎉 迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrateBrandAliases();
