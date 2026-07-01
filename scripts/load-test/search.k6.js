/**
 * 搜索接口压力测试
 *
 * 测试目标: GET /api/products (搜索 + 筛选 + 分页)
 * 覆盖场景: 热门搜索、长尾搜索、带筛选、自动补全、缓存冷热
 *
 * 用法:
 *   k6 run scripts/load-test/search.k6.js                          # 默认负载测试
 *   k6 run -e STAGE=baseline scripts/load-test/search.k6.js        # 基准测试
 *   k6 run -e STAGE=stress scripts/load-test/search.k6.js          # 压力测试
 *   k6 run -e STAGE=soak scripts/load-test/search.k6.js            # 持久测试
 *   k6 run -e BASE_URL=http://your-vps:4000 scripts/load-test/search.k6.js  # 测线上
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import {
  BASE_URL,
  SCENARIOS_BASELINE,
  SCENARIOS_LOAD,
  SCENARIOS_STRESS,
  SCENARIOS_SOAK,
  THRESHOLDS,
  HOT_KEYWORDS,
  LONG_TAIL_KEYWORDS,
  CN_KEYWORDS,
  TYPO_KEYWORDS,
  COLORS,
  SORT_OPTIONS,
  randomItem,
  randomItems,
  randomInt,
  buildSearchUrl,
} from './config.js';

// ============================================================
// 自定义指标
// ============================================================

const searchDuration = new Trend('search_duration', true);
const searchCachedDuration = new Trend('search_cached_duration', true);
const autocompleteDuration = new Trend('autocomplete_duration', true);
const searchErrors = new Rate('search_errors');
const totalSearches = new Counter('total_searches');

// ============================================================
// 配置 — 使用 ramping-arrival-rate 精确控制 RPS
// ============================================================

const scenarioMap = {
  baseline: SCENARIOS_BASELINE,
  load: SCENARIOS_LOAD,
  stress: SCENARIOS_STRESS,
  soak: SCENARIOS_SOAK,
};

const stage = __ENV.STAGE || 'load';

export const options = {
  scenarios: scenarioMap[stage] || SCENARIOS_LOAD,
  thresholds: THRESHOLDS,
};

// ============================================================
// 测试场景
// ============================================================

export default function () {
  // 随机选择场景，模拟真实用户行为分布
  const scenario = Math.random();

  if (scenario < 0.30) {
    hotKeywordSearch();       // 30% 热门关键词搜索
  } else if (scenario < 0.50) {
    longTailSearch();         // 20% 长尾搜索
  } else if (scenario < 0.65) {
    filteredSearch();         // 15% 带筛选搜索
  } else if (scenario < 0.75) {
    paginationSearch();       // 10% 翻页
  } else if (scenario < 0.85) {
    autocompleteSearch();     // 10% 自动补全
  } else if (scenario < 0.92) {
    cachedSearch();           // 7% 缓存命中（重复搜索）
  } else if (scenario < 0.96) {
    fuzzySearch();            // 4% 模糊搜索（拼写错误）
  } else {
    browseWithSort();         // 4% 浏览 + 排序
  }

  // arrival-rate 模式下由 k6 控制请求节奏，不需要 sleep
}

// ============================================================
// 场景实现
// ============================================================

/** 热门关键词搜索 */
function hotKeywordSearch() {
  const keyword = randomItem(HOT_KEYWORDS);
  const url = buildSearchUrl({ search: keyword, limit: 20 });

  const res = http.get(url, { tags: { name: 'search' } });

  totalSearches.add(1);
  searchDuration.add(res.timings.duration);
  searchErrors.add(res.status !== 200);

  check(res, {
    '状态码 200': (r) => r.status === 200,
    '返回商品列表': (r) => {
      const body = r.json();
      return body && Array.isArray(body.data);
    },
    '响应时间 < 1s': (r) => r.timings.duration < 1000,
  });
}

/** 长尾关键词搜索 */
function longTailSearch() {
  const keyword = randomItem(LONG_TAIL_KEYWORDS);
  const url = buildSearchUrl({ search: keyword, limit: 20 });

  const res = http.get(url, { tags: { name: 'search' } });

  totalSearches.add(1);
  searchDuration.add(res.timings.duration);
  searchErrors.add(res.status !== 200);

  check(res, {
    '状态码 200': (r) => r.status === 200,
    '返回有效 JSON': (r) => {
      try { r.json(); return true; } catch { return false; }
    },
  });
}

/** 带筛选条件的搜索 */
function filteredSearch() {
  const keyword = randomItem(HOT_KEYWORDS);
  const colors = randomItems(COLORS, randomInt(1, 2)).join(',');
  const minPrice = randomInt(50, 200);
  const maxPrice = minPrice + randomInt(100, 500);

  const url = buildSearchUrl({
    search: keyword,
    colors,
    minPrice,
    maxPrice,
    limit: 20,
  });

  const res = http.get(url, { tags: { name: 'search' } });

  totalSearches.add(1);
  searchDuration.add(res.timings.duration);
  searchErrors.add(res.status !== 200);

  check(res, {
    '状态码 200': (r) => r.status === 200,
    '筛选结果有效': (r) => {
      const body = r.json();
      return body && body.meta && typeof body.meta.total === 'number';
    },
  });
}

/** 翻页测试 */
function paginationSearch() {
  const keyword = randomItem(HOT_KEYWORDS);
  const page = randomInt(1, 5);

  const url = buildSearchUrl({ search: keyword, page, limit: 20 });
  const res = http.get(url, { tags: { name: 'search' } });

  totalSearches.add(1);
  searchDuration.add(res.timings.duration);
  searchErrors.add(res.status !== 200);

  check(res, {
    '状态码 200': (r) => r.status === 200,
    '分页信息正确': (r) => {
      const body = r.json();
      return body && body.meta && body.meta.page === page;
    },
  });
}

/** 自动补全 — 用户输入时实时触发，要求极快 */
function autocompleteSearch() {
  const keyword = randomItem(HOT_KEYWORDS);

  // 模拟逐字输入：发送 2-3 个递增的前缀请求
  const prefixes = [];
  for (let i = 2; i <= Math.min(keyword.length, 4); i++) {
    prefixes.push(keyword.substring(0, i));
  }

  for (const prefix of prefixes) {
    const url = `${BASE_URL}/products/autocomplete?q=${encodeURIComponent(prefix)}&limit=10`;
    const res = http.get(url, { tags: { name: 'autocomplete' } });

    autocompleteDuration.add(res.timings.duration);

    check(res, {
      '自动补全状态码 200': (r) => r.status === 200,
      '自动补全 < 200ms': (r) => r.timings.duration < 200,
    });

    sleep(0.15); // 模拟打字间隔 150ms
  }
}

/** 缓存命中测试 — 相同搜索词连续请求两次 */
function cachedSearch() {
  const keyword = 'nike'; // 固定关键词确保缓存命中

  const url = buildSearchUrl({ search: keyword, limit: 20 });

  // 第一次请求（可能是 cache miss）
  http.get(url, { tags: { name: 'search' } });
  sleep(0.1);

  // 第二次请求（应该是 cache hit）
  const res = http.get(url, { tags: { name: 'search_cached' } });

  searchCachedDuration.add(res.timings.duration);
  totalSearches.add(2);

  check(res, {
    '缓存命中状态码 200': (r) => r.status === 200,
    '缓存响应 < 100ms': (r) => r.timings.duration < 100,
  });
}

/** 模糊搜索（拼写错误） */
function fuzzySearch() {
  const keyword = randomItem(TYPO_KEYWORDS);
  const url = `${BASE_URL}/products/fuzzy-search?q=${encodeURIComponent(keyword)}&limit=20`;

  const res = http.get(url, { tags: { name: 'search' } });

  totalSearches.add(1);
  searchDuration.add(res.timings.duration);
  searchErrors.add(res.status !== 200);

  check(res, {
    '模糊搜索状态码 200': (r) => r.status === 200,
  });
}

/** 浏览 + 排序（不搜索，直接浏览分类） */
function browseWithSort() {
  const sortBy = randomItem(SORT_OPTIONS);

  const url = buildSearchUrl({
    sortBy,
    limit: 20,
    page: randomInt(1, 3),
  });

  const res = http.get(url, { tags: { name: 'search' } });

  totalSearches.add(1);
  searchDuration.add(res.timings.duration);
  searchErrors.add(res.status !== 200);

  check(res, {
    '浏览状态码 200': (r) => r.status === 200,
  });
}
