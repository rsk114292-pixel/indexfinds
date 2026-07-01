/**
 * E2E 测试环境配置
 * 使用真实的 PostgreSQL 测试数据库而非 pg-mem
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 加载 .env.test 配置
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../.env.test'),
});

// 确保使用测试数据库
if (!process.env.DB_NAME?.includes('test')) {
  console.warn(
    '⚠️ Warning: DB_NAME does not contain "test". Using:',
    process.env.DB_NAME,
  );
}
