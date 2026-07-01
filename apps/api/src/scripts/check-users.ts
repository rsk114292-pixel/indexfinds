/**
 * 检查用户表
 */
import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function main() {
  await withScriptDataSource(async (dataSource) => {
    const users = await dataSource.query(`
    SELECT id, email, username, role, failed_login_attempts, locked_until,
           password IS NOT NULL as has_password,
           LENGTH(password) as password_length
    FROM users
    LIMIT 5;
  `);

  console.log('用户列表:');
  console.table(users);

  // 查询登录日志
  const logs = await dataSource.query(`
    SELECT id, user_id, email, event_type, provider, ip_address, geo_location, created_at
    FROM login_logs
    ORDER BY created_at DESC
    LIMIT 10;
  `);

  console.log('\n登录日志:');
  console.table(logs);
  });
}

void runScriptMain('用户检查', main);
