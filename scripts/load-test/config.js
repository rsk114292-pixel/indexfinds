// k6 共享配置
// 用法: import { BASE_URL, SEARCH_KEYWORDS, ... } from './config.js'

// ============================================================
// 基础配置
// ============================================================

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:4100';

// ============================================================
// 加压策略 — 使用 ramping-arrival-rate 精确控制 RPS
//
// 为什么不用 VU + stages？
//   Rate Limit 是按 IP 限流的（30 req/sec），本地压测所有请求来自同一 IP。
//   用 ramping-arrival-rate 精确控制 RPS，既能压到极限又不会被误拦。
//
// 线上 Rate Limit 不影响真实用户（每人不可能 30 req/sec），
// 但本地压测需要控制在 25 RPS 以内。
// ============================================================

// 基准测试：单请求基线延迟
export const SCENARIOS_BASELINE = {
  baseline: {
    executor: 'ramping-arrival-rate',
    startRate: 1,           // 起始 1 RPS
    timeUnit: '1s',
    preAllocatedVUs: 5,
    maxVUs: 10,
    stages: [
      { duration: '30s', target: 1 },
    ],
  },
};

// 负载测试：逐步加压到 25 RPS（Rate Limit 安全线以内）
export const SCENARIOS_LOAD = {
  load: {
    executor: 'ramping-arrival-rate',
    startRate: 1,
    timeUnit: '1s',
    preAllocatedVUs: 30,
    maxVUs: 60,
    stages: [
      { duration: '30s', target: 5 },    // 预热
      { duration: '1m', target: 15 },    // 正常负载
      { duration: '1m', target: 25 },    // 峰值（接近 Rate Limit）
      { duration: '1m', target: 25 },    // 持续峰值
      { duration: '30s', target: 0 },    // 冷却
    ],
  },
};

// 压力测试：超过 Rate Limit，测试限流 + API 极限
// ⚠️ 会触发 429，用于观察限流行为和超载表现
export const SCENARIOS_STRESS = {
  stress: {
    executor: 'ramping-arrival-rate',
    startRate: 5,
    timeUnit: '1s',
    preAllocatedVUs: 50,
    maxVUs: 100,
    stages: [
      { duration: '30s', target: 15 },   // 预热
      { duration: '1m', target: 25 },    // 正常
      { duration: '1m', target: 40 },    // 超 Rate Limit
      { duration: '1m', target: 50 },    // 极限
      { duration: '30s', target: 0 },    // 冷却
    ],
  },
};

// 持久测试：中等负载长时间运行，检测内存泄漏
export const SCENARIOS_SOAK = {
  soak: {
    executor: 'ramping-arrival-rate',
    startRate: 1,
    timeUnit: '1s',
    preAllocatedVUs: 20,
    maxVUs: 40,
    stages: [
      { duration: '1m', target: 10 },    // 加压
      { duration: '30m', target: 10 },   // 持续中等负载
      { duration: '30s', target: 0 },    // 冷却
    ],
  },
};

// ============================================================
// 性能阈值（SLA）
// ============================================================

export const THRESHOLDS = {
  // 整体
  http_req_failed: ['rate<0.01'],           // 错误率 < 1%
  http_req_duration: ['p(95)<500'],         // p95 < 500ms

  // 搜索接口
  'http_req_duration{name:search}': ['p(95)<800', 'p(99)<1500'],
  'http_req_duration{name:search_cached}': ['p(95)<200'],

  // 商品详情
  'http_req_duration{name:product_detail}': ['p(95)<300'],

  // 视觉搜索（涉及 Embedding 推理，允许更长）
  'http_req_duration{name:visual_search}': ['p(95)<3000'],

  // 自动补全（用户输入时实时触发，要求快）
  'http_req_duration{name:autocomplete}': ['p(95)<200'],
};

// ============================================================
// 测试数据：模拟真实搜索关键词
// ============================================================

// 高频搜索词（模拟热门搜索）
export const HOT_KEYWORDS = [
  'nike', 'adidas', 'jordan', 'yeezy', 'dunk',
  'bape', 'supreme', 'gucci', 'balenciaga', 'off-white',
];

// 长尾搜索词（模拟具体需求）
export const LONG_TAIL_KEYWORDS = [
  'nike air force 1 white',
  'adidas yeezy 350 black',
  'jordan 1 retro high',
  'bape shark hoodie',
  'supreme box logo tee',
  'gucci belt bag',
  'balenciaga triple s',
  'off-white air jordan',
  'nike dunk low panda',
  'adidas campus 00s',
];

// 中文搜索词
export const CN_KEYWORDS = [
  '耐克', '阿迪达斯', '乔丹', '椰子', '运动鞋',
  '卫衣', '外套', 'T恤', '背包', '手表',
];

// 拼写错误（测试 fuzzy search）
export const TYPO_KEYWORDS = [
  'nikee', 'addidas', 'jordon', 'yezy', 'suppreme',
  'guccci', 'balenciag', 'off white', 'bapee', 'dunks low',
];

// 颜色筛选值
export const COLORS = ['black', 'white', 'red', 'blue', 'green', 'pink', 'grey'];

// 排序选项
export const SORT_OPTIONS = [
  'relevance', 'newest', 'price_asc', 'price_desc', 'popular',
];

// ============================================================
// 工具函数
// ============================================================

// 随机选择数组中的一个元素
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 随机选择 n 个不重复元素
export function randomItems(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(n, arr.length));
}

// 随机整数 [min, max]
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 构建搜索 URL（k6 不支持 URLSearchParams，手动拼接）
export function buildSearchUrl(params = {}) {
  const parts = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return `${BASE_URL}/products?${parts.join('&')}`;
}
