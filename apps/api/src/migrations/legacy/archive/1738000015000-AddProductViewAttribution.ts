import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 为推荐归因系统添加 PRODUCT_VIEW 事件类型
 *
 * 背景：增强转化验证逻辑，要求用户浏览至少 3 个不同商品才能转化
 */
export class AddProductViewAttribution1738000015000 implements MigrationInterface {
  name = 'AddProductViewAttribution1738000015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查枚举类型是否已存在 product_view 值
    const checkResult = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'product_view'
        AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'referral_attributions_eventtype_enum'
        )
      ) as exists
    `);

    const exists = checkResult[0]?.exists;

    // 如果不存在，则添加
    if (!exists) {
      await queryRunner.query(`
        ALTER TYPE referral_attributions_eventtype_enum
        ADD VALUE 'product_view'
      `);
      console.log('✅ Added product_view to AttributionEventType enum');
    } else {
      console.log(
        'ℹ️ product_view already exists in AttributionEventType enum, skipping',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL 不支持直接删除枚举值
    // 如果需要回滚，需要重新创建枚举类型（影响较大，谨慎操作）
    console.warn(
      '⚠️ WARNING: PostgreSQL does not support removing enum values directly. ' +
        'To revert this migration, you would need to recreate the enum type, ' +
        'which requires dropping and recreating all dependent columns. ' +
        'This is a destructive operation and should only be done in development.',
    );

    // 开发环境可以执行以下步骤（生产环境请谨慎）：
    // 1. 删除所有使用 product_view 的记录
    // 2. 重建枚举类型
    // 3. 重新创建列

    // 这里仅提供清理数据的操作（不删除枚举值）
    await queryRunner.query(`
      DELETE FROM referral_attributions
      WHERE "eventType" = 'product_view'
    `);
    console.log('✅ Deleted all product_view attribution records');
  }
}
