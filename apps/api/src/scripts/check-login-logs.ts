/**
 * 检查登录日志记录
 */
import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function main() {
  await withScriptDataSource(async (dataSource) => {
    console.log('数据库连接成功\n');

    const logs = await dataSource.query(`
    SELECT id, user_id, email, event_type, provider, ip_address, geo_location, created_at
    FROM login_logs
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log('=== 登录日志记录 ===');
  if (logs.length === 0) {
    console.log('暂无登录日志');
  } else {
    logs.forEach((log: any, i: number) => {
      console.log(`\n[${i + 1}] ${log.event_type.toUpperCase()}`);
      console.log(`    邮箱: ${log.email || '(无)'}`);
      console.log(`    用户ID: ${log.user_id || '(无)'}`);
      console.log(`    IP: ${log.ip_address || '(无)'}`);
      console.log(`    位置: ${log.geo_location || '(无)'}`);
      console.log(`    时间: ${log.created_at}`);
    });
  }
  });
}

void runScriptMain('登录日志检查', main);
