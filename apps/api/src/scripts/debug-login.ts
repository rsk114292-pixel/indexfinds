/**
 * 调试登录功能
 */
import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function main() {
  await withScriptDataSource(async (dataSource) => {
    console.log('数据库连接成功');

    const columnInfo = await dataSource.query(`
    SELECT column_name, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'login_logs' AND column_name = 'created_at';
  `);
  console.log('created_at 列详情:', columnInfo);

  console.log('\n尝试用 UUID 插入...');
  try {
    const result = await dataSource.query(`
      INSERT INTO login_logs (id, event_type, provider, email, ip_address, created_at)
      VALUES (uuid_generate_v4(), 'failed', 'email', 'debug@test.com', '127.0.0.1', NOW())
      RETURNING *;
    `);
    console.log('✅ 插入成功:', result);
  } catch (e: any) {
    console.error('❌ 插入失败:', e.message);
  }

  // 3. 查看最新的日志
  const logs = await dataSource.query(`
    SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 3;
  `);
  console.log('\n最新日志:');
  console.table(logs);
  });
}

void runScriptMain('登录调试', main);
