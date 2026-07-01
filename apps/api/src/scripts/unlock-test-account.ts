/**
 * 解锁测试账号
 */
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'lolobuyspreadsheets_dev',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  await dataSource.initialize();
  console.log('数据库连接成功');

  const email = 'test@example.com';

  // 解锁数据库中的账号
  await dataSource.query(
    `
    UPDATE users
    SET locked_until = NULL, failed_login_attempts = 0
    WHERE email = $1
  `,
    [email],
  );
  console.log('✅ 数据库账号已解锁');

  // 清除 Redis 失败计数
  await redis.del(`login:attempts:${email.toLowerCase()}`);
  console.log('✅ Redis 失败计数已清除');

  await redis.quit();
  await dataSource.destroy();

  console.log(`\n账号 ${email} 已完全解锁！`);
}

main().catch(console.error);
