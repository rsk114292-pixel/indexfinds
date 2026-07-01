/**
 * 重置测试账号密码
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
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

  await dataSource.initialize();
  console.log('数据库连接成功');

  const email = 'test@example.com';
  const newPassword = 'Test123456';
  const hash = await bcrypt.hash(newPassword, 10);

  await dataSource.query('UPDATE users SET password = $1 WHERE email = $2', [
    hash,
    email,
  ]);

  console.log(`\n✅ 账号 ${email} 密码已重置为: ${newPassword}`);

  await dataSource.destroy();
}

main().catch(console.error);
