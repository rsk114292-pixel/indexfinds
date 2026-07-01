/**
 * 检查必需的数据库表是否存在
 */
import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function main() {
  await withScriptDataSource(async (dataSource) => {
    console.log('数据库连接成功\n');

    const tables = await dataSource.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('login_logs', 'refresh_tokens', 'users');
  `);
  console.log(
    '找到的表:',
    tables.map((t: any) => t.table_name),
  );

  // 检查 users 表的锁定相关列
  const userCols = await dataSource.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users' AND column_name IN ('locked_until', 'failed_login_attempts');
  `);
  console.log(
    'users 表中的锁定相关列:',
    userCols.map((c: any) => c.column_name),
  );

  // 检查 login_logs 表结构
  const loginLogsCols = await dataSource.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'login_logs'
    ORDER BY ordinal_position;
  `);
  console.log(
    'login_logs 表的列:',
    loginLogsCols.map((c: any) => c.column_name),
  );

  // 检查 refresh_tokens 表结构
  const refreshTokensCols = await dataSource.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'refresh_tokens'
    ORDER BY ordinal_position;
  `);
  console.log(
    'refresh_tokens 表的列:',
    refreshTokensCols.map((c: any) => c.column_name),
  );
  });
}

void runScriptMain('数据库表检查', main);
