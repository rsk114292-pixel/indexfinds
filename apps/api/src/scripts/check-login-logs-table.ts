import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function main() {
  await withScriptDataSource(async (dataSource) => {
    const columns = await dataSource.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'login_logs'
    ORDER BY ordinal_position;
  `);

  console.log('login_logs 表结构:');
  console.table(columns);

  // 尝试手动插入一条记录
  console.log('\n尝试插入测试记录...');
  try {
    await dataSource.query(`
      INSERT INTO login_logs (event_type, provider, email, ip_address)
      VALUES ('failed', 'email', 'test@test.com', '127.0.0.1');
    `);
    console.log('✅ 插入成功');

    // 查询刚插入的记录
    const logs = await dataSource.query(`
      SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 1;
    `);
    console.log('插入的记录:');
    console.table(logs);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('❌ 插入失败:', message);
  }
  });
}

void runScriptMain('登录日志表检查', main);
