/**
 * 测试 geoip-lite
 */
import * as geoip from 'geoip-lite';

console.log('测试 geoip-lite...');

try {
  const result = geoip.lookup('8.8.8.8');
  console.log('geoip.lookup("8.8.8.8"):', result);

  const local = geoip.lookup('127.0.0.1');
  console.log('geoip.lookup("127.0.0.1"):', local);

  console.log('✅ geoip-lite 工作正常');
} catch (e: any) {
  console.error('❌ geoip-lite 错误:', e.message);
}
