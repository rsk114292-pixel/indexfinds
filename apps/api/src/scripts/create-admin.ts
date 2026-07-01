/**
 * 创建或更新超级管理员用户脚本
 * 运行: npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts
 *
 * 环境变量:
 *   ADMIN_EMAIL    - 超级管理员邮箱（必填）
 *   ADMIN_PASSWORD - 超级管理员密码（必填）
 *   ADMIN_USERNAME - 超级管理员用户名（可选，默认 Admin）
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const username = process.env.ADMIN_USERNAME || 'Admin';

if (!email || !password) {
  console.error('错误: 请设置环境变量 ADMIN_EMAIL 和 ADMIN_PASSWORD');
  console.error(
    '示例: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=MyPass123! npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts',
  );
  process.exit(1);
}

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
});

async function createAdmin() {
  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    // 确保 PostgreSQL enum 包含 super_admin 值
    const enumValues = await dataSource.query(
      `SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')`,
    );
    const hasSuper = enumValues.some(
      (e: { enumlabel: string }) => e.enumlabel === 'super_admin',
    );
    if (!hasSuper) {
      await dataSource.query(
        `ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'super_admin'`,
      );
      console.log('已添加 super_admin 到数据库 enum');
    }

    const hashedPassword = await bcrypt.hash(password!, 10);

    // 检查用户是否存在
    const existingUser = await dataSource.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email],
    );

    if (existingUser.length > 0) {
      console.log('用户已存在:', existingUser[0]);
      await dataSource.query(
        'UPDATE users SET role = $1, password = $2 WHERE email = $3',
        ['super_admin', hashedPassword, email],
      );
      console.log('已更新用户角色为 super_admin 并重置密码');
    } else {
      await dataSource.query(
        'INSERT INTO users (email, password, username, role, "isActive") VALUES ($1, $2, $3, $4, $5)',
        [email, hashedPassword, username, 'super_admin', true],
      );
      console.log('已创建新的 super_admin 用户');
    }

    // 验证
    const user = await dataSource.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email],
    );
    console.log('验证结果:', user[0]);

    await dataSource.destroy();
    console.log('完成！');
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

createAdmin();
