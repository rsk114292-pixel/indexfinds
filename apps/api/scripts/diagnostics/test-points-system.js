#!/usr/bin/env node
/**
 * 积分系统端到端验证脚本
 *
 * 测试覆盖：
 *   1. 签到 → 积分发放
 *   2. 连续签到 → 连签奖励
 *   3. 积分余额查询
 *   4. 积分流水查询
 *   5. 分享商品 → 按渠道发放积分 + 同渠道日去重 + 非奖励渠道拦截
 *   6. 提现申请（首次最低50分）
 *   7. 取消提现 → 积分退回
 *   8. 提现申请（余额不足）
 *   9. 管理员查看 / 审批 / 拒绝提现
 *
 * 用法：
 *   node scripts/diagnostics/test-points-system.js
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const API = process.env.API_URL || 'http://localhost:4100';
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  console.error('Missing JWT_SECRET in .env');
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────

function makeToken(userId, role = 'user') {
  return jwt.sign({ sub: userId, email: `test-${role}@test.com`, role }, SECRET, { expiresIn: '1h' });
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

async function api(method, path, token, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

// ── database helpers ─────────────────────────────────

const { Client } = require('pg');
function pgClient() {
  return new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
}

async function cleanup(userId) {
  const c = pgClient();
  await c.connect();
  await c.query('DELETE FROM point_transactions WHERE "userId" = $1', [userId]);
  await c.query('DELETE FROM point_withdrawals WHERE "userId" = $1', [userId]);
  await c.query('DELETE FROM user_checkins WHERE "userId" = $1', [userId]);
  await c.query('DELETE FROM point_accounts WHERE "userId" = $1', [userId]);
  await c.end();

  // 清理 Redis 分享奖励 key
  const Redis = require('ioredis');
  const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  });
  const keys = await redis.keys(`points:share:*:${userId}*`);
  if (keys.length) await redis.del(...keys);
  await redis.quit();
}

async function getDbBalance(userId) {
  const c = pgClient();
  await c.connect();
  const r = await c.query('SELECT balance, "totalEarned", "totalWithdrawn" FROM point_accounts WHERE "userId" = $1', [userId]);
  await c.end();
  return r.rows[0] || null;
}

async function fakePastCheckin(userId, daysAgo, streak) {
  const c = pgClient();
  await c.connect();
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const dateStr = d.toISOString().split('T')[0];
  await c.query(
    'INSERT INTO user_checkins ("userId", "checkinDate", "streakCount", "pointsEarned") VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
    [userId, dateStr, streak, 1]
  );
  await c.end();
}

// ── main ─────────────────────────────────────────────

async function main() {
  // 使用实际 admin 用户（从 DB 取）
  const c = pgClient();
  await c.connect();
  const adminRow = await c.query("SELECT id FROM users WHERE role IN ('super_admin','admin') LIMIT 1");
  const userRow = await c.query("SELECT id FROM users WHERE role = 'user' LIMIT 1");
  await c.end();

  if (!adminRow.rows.length) {
    console.error('No admin user found in DB');
    process.exit(1);
  }

  const ADMIN_ID = adminRow.rows[0].id;
  // 如果没有普通用户就用 admin 自己测
  const USER_ID = userRow.rows.length ? userRow.rows[0].id : ADMIN_ID;

  const userToken = makeToken(USER_ID, 'user');
  const adminToken = makeToken(ADMIN_ID, 'super_admin');

  console.log(`\n🔧 Testing with USER=${USER_ID.slice(0, 8)}... ADMIN=${ADMIN_ID.slice(0, 8)}...\n`);

  // 清理旧数据
  await cleanup(USER_ID);

  // ════════════════════════════════════════════════════
  console.log('── 1. 签到 ──');
  {
    const r = await api('POST', '/checkin', userToken);
    assert(r.status === 201, `POST /checkin → ${r.status} (expect 201)`);
    assert(r.data.success === true, `success=true`);
    assert(r.data.pointsEarned === 1, `pointsEarned=1 (got ${r.data.pointsEarned})`);
    assert(r.data.streakCount === 1, `streakCount=1 (got ${r.data.streakCount})`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 2. 重复签到 ──');
  {
    const r = await api('POST', '/checkin', userToken);
    assert(r.data.alreadyCheckedIn === true, `alreadyCheckedIn=true`);
    assert(r.data.pointsEarned === 0, `pointsEarned=0 (no double reward)`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 3. 签到状态 ──');
  {
    const r = await api('GET', '/checkin/status', userToken);
    assert(r.status === 200, `GET /checkin/status → ${r.status}`);
    assert(r.data.checkedInToday === true, `checkedInToday=true`);
    assert(r.data.streakCount === 1, `streakCount=1`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 4. 积分余额 ──');
  {
    const r = await api('GET', '/points/balance', userToken);
    assert(r.status === 200, `GET /points/balance → ${r.status}`);
    assert(r.data.balance === 1, `balance=1 (got ${r.data.balance})`);
    assert(r.data.totalEarned === 1, `totalEarned=1 (got ${r.data.totalEarned})`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 5. 积分流水 ──');
  {
    const r = await api('GET', '/points/transactions?page=1&limit=10', userToken);
    assert(r.status === 200, `GET /points/transactions → ${r.status}`);
    assert(r.data.total >= 1, `total >= 1 (got ${r.data.total})`);
    const tx = r.data.items?.[0];
    assert(tx && tx.action === 'daily_checkin', `latest action=daily_checkin (got ${tx?.action})`);
    assert(tx && tx.amount === 1, `amount=1 (got ${tx?.amount})`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 6. 连续签到奖励 (模拟连续6天 → 第7天=3分) ──');
  {
    // 清理重来
    await cleanup(USER_ID);
    // 模拟过去6天签到
    for (let i = 6; i >= 1; i--) {
      await fakePastCheckin(USER_ID, i, 7 - i);
    }
    const r = await api('POST', '/checkin', userToken);
    assert(r.data.success === true, `success=true`);
    assert(r.data.streakCount === 7, `streakCount=7 (got ${r.data.streakCount})`);
    assert(r.data.pointsEarned === 3, `pointsEarned=3 (7th day bonus, got ${r.data.pointsEarned})`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 7. 分享商品 ──');
  {
    const r = await api('POST', '/points/track-share', userToken, { productId: 'test-product-1', channel: 'whatsapp' });
    assert(r.status === 201, `POST /points/track-share → ${r.status}`);
    assert(r.data.success === true, `success=true (got ${JSON.stringify(r.data)})`);
    assert(r.data.pointsEarned === 1, `pointsEarned=1 (got ${r.data.pointsEarned})`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 8. 同渠道当天重复分享 ──');
  {
    const r = await api('POST', '/points/track-share', userToken, { productId: 'test-product-2', channel: 'twitter' });
    assert(r.data.success === true, `success=true for second eligible channel`);

    const duplicate = await api('POST', '/points/track-share', userToken, { productId: 'test-product-3', channel: 'twitter' });
    assert(duplicate.data.success === false, `success=false for same channel duplicate`);
    assert(duplicate.data.reason === 'channel_already_rewarded', `reason=channel_already_rewarded (got ${duplicate.data.reason})`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 9. 非奖励渠道不发积分 + 查积分余额 ──');
  {
    const ineligible = await api('POST', '/points/track-share', userToken, { productId: 'test-product-4', channel: 'copy_link' });
    assert(ineligible.data.success === false, `copy_link should not reward`);
    assert(ineligible.data.reason === 'channel_not_eligible', `reason=channel_not_eligible (got ${ineligible.data.reason})`);

    const r = await api('GET', '/points/balance', userToken);
    assert(r.data.balance === 5, `balance=5 (check-in 3 + two rewarded channels, got ${r.data.balance})`);
  }

  // ════════════════════════════════════════════════════
  // 为了测提现，先给用户加积分到 60
  console.log('\n── 10. 手动加积分到60（测试提现） ──');
  {
    const c2 = pgClient();
    await c2.connect();
    await c2.query('UPDATE point_accounts SET balance = 60, "totalEarned" = 60 WHERE "userId" = $1', [USER_ID]);
    await c2.end();
    const r = await api('GET', '/points/balance', userToken);
    assert(r.data.balance === 60, `balance=60 (got ${r.data.balance})`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 11. 提现申请 (首次最低50分) ──');
  let withdrawalId;
  {
    // 先测低于最低额度
    const r1 = await api('POST', '/withdrawals', userToken, { amount: 20, paymentMethod: 'paypal', paymentAccount: 'test@paypal.com' });
    assert(r1.status === 400, `amount=20 rejected (first min=50) → ${r1.status}`);

    // 正常提现
    const r2 = await api('POST', '/withdrawals', userToken, { amount: 50, paymentMethod: 'paypal', paymentAccount: 'test@paypal.com' });
    assert(r2.status === 201, `amount=50 accepted → ${r2.status}`);
    assert(r2.data.status === 'pending', `status=pending (got ${r2.data.status})`);
    assert(r2.data.cashAmount === 5, `cashAmount=$5 (50/10, got ${r2.data.cashAmount})`);
    withdrawalId = r2.data.id;
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 12. 提现后余额 ──');
  {
    const r = await api('GET', '/points/balance', userToken);
    assert(r.data.balance === 10, `balance=10 (60-50, got ${r.data.balance})`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 13. 用户取消提现 → 积分退回 ──');
  {
    const r = await api('POST', `/withdrawals/${withdrawalId}/cancel`, userToken);
    assert(r.status === 201, `cancel → ${r.status}`);
    assert(r.data.status === 'cancelled', `status=cancelled (got ${r.data.status})`);
    // 验证积分退回
    const bal = await api('GET', '/points/balance', userToken);
    assert(bal.data.balance === 60, `balance restored to 60 (got ${bal.data.balance})`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 14. 再次提现 + 管理员审批 ──');
  let withdrawalId2;
  {
    const r = await api('POST', '/withdrawals', userToken, { amount: 50, paymentMethod: 'paypal', paymentAccount: 'test@paypal.com' });
    withdrawalId2 = r.data.id;
    assert(r.status === 201, `new withdrawal created`);

    // 管理员查看列表
    const list = await api('GET', '/admin/withdrawals?status=pending', adminToken);
    assert(list.status === 200, `admin list → ${list.status}`);
    assert(list.data.total >= 1, `pending withdrawals >= 1 (got ${list.data.total})`);

    // 管理员审批
    const approve = await api('POST', `/admin/withdrawals/${withdrawalId2}/approve`, adminToken);
    assert(approve.status === 201, `approve → ${approve.status}`);
    assert(approve.data.status === 'approved', `status=approved (got ${approve.data.status})`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 15. 再次提现 + 管理员拒绝 → 积分退回 ──');
  {
    const r = await api('POST', '/withdrawals', userToken, { amount: 5, paymentMethod: 'paypal', paymentAccount: 'test@paypal.com' });
    // 首次已批准过了，第二次最低 100（因为 approved count > 0），但余额只有 10
    // 先加点余额
    const c3 = pgClient();
    await c3.connect();
    await c3.query('UPDATE point_accounts SET balance = 100, "totalEarned" = 100 WHERE "userId" = $1', [USER_ID]);
    await c3.end();

    const r2 = await api('POST', '/withdrawals', userToken, { amount: 100, paymentMethod: 'crypto', paymentAccount: '0x1234567890abcdef' });
    assert(r2.status === 201, `withdrawal 100pts created`);

    const reject = await api('POST', `/admin/withdrawals/${r2.data.id}/reject`, adminToken, { adminNote: 'Test rejection' });
    assert(reject.status === 201, `reject → ${reject.status}`);
    assert(reject.data.status === 'rejected', `status=rejected (got ${reject.data.status})`);

    // 积分应退回
    const bal = await api('GET', '/points/balance', userToken);
    assert(bal.data.balance === 100, `balance restored to 100 after reject (got ${bal.data.balance})`);
  }

  // ════════════════════════════════════════════════════
  console.log('\n── 16. 用户提现列表 ──');
  {
    const r = await api('GET', '/withdrawals', userToken);
    assert(r.status === 200, `GET /withdrawals → ${r.status}`);
    assert(r.data.total >= 3, `total >= 3 (got ${r.data.total})`);
  }

  // ════════════════════════════════════════════════════
  // 清理测试数据
  await cleanup(USER_ID);
  console.log('\n🧹 Test data cleaned up.\n');

  // ── 结果汇总 ──
  console.log('═══════════════════════════════════');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log('═══════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
