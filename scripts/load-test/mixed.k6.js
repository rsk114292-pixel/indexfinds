/**
 * 混合场景压力测试 — 模拟真实用户行为
 *
 * 模拟一个完整的用户访问流程:
 *   1. 打开首页 → 看热门搜索
 *   2. 搜索关键词 → 浏览结果
 *   3. 点击商品 → 查看详情
 *   4. 查看相似商品
 *   5. 翻页浏览更多
 *
 * 这个脚本最接近真实流量模式，是最有参考价值的测试。
 *
 * 用法:
 *   k6 run scripts/load-test/mixed.k6.js
 *   k6 run -e STAGE=stress scripts/load-test/mixed.k6.js
 *   k6 run -e STAGE=soak scripts/load-test/mixed.k6.js
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
  HOT_KEYWORDS,
  LONG_TAIL_KEYWORDS,
  CN_KEYWORDS,
  COLORS,
  SORT_OPTIONS,
  randomItem,
  randomInt,
  buildSearchUrl,
} from './config.js';

// ============================================================
// 自定义指标
// ============================================================

const pageLoadDuration = new Trend('page_load_duration', true);
const searchDuration = new Trend('search_api_duration', true);
const detailDuration = new Trend('detail_api_duration', true);
const errorRate = new Rate('business_error_rate');
const journeyComplete = new Rate('journey_complete_rate');

// ============================================================
// 配置
// ============================================================

// 混合场景每个 iteration 包含 3-8 个 HTTP 请求（一个完整用户旅程）
// 所以 iteration rate 要比 search.k6.js 低，保证总 RPS 在 Rate Limit 以内
// 按平均 5 个请求/iteration 估算: 5 iterations/s × 5 req = 25 RPS
const MIXED_SCENARIOS = {
  baseline: {
    mixed: {
      executor: 'ramping-arrival-rate',
      startRate: 1, timeUnit: '1s',
      preAllocatedVUs: 5, maxVUs: 10,
      stages: [{ duration: '30s', target: 1 }],
    },
  },
  load: {
    mixed: {
      executor: 'ramping-arrival-rate',
      startRate: 1, timeUnit: '1s',
      preAllocatedVUs: 20, maxVUs: 40,
      stages: [
        { duration: '30s', target: 1 },    // 预热
        { duration: '1m', target: 3 },     // 正常（~15 RPS）
        { duration: '1m', target: 5 },     // 峰值（~25 RPS）
        { duration: '1m', target: 5 },     // 持续峰值
        { duration: '30s', target: 0 },    // 冷却
      ],
    },
  },
  stress: {
    mixed: {
      executor: 'ramping-arrival-rate',
      startRate: 1, timeUnit: '1s',
      preAllocatedVUs: 40, maxVUs: 80,
      stages: [
        { duration: '30s', target: 3 },
        { duration: '1m', target: 5 },
        { duration: '1m', target: 8 },     // 超限（~40 RPS）
        { duration: '1m', target: 10 },    // 极限（~50 RPS）
        { duration: '30s', target: 0 },
      ],
    },
  },
  soak: {
    mixed: {
      executor: 'ramping-arrival-rate',
      startRate: 1, timeUnit: '1s',
      preAllocatedVUs: 15, maxVUs: 30,
      stages: [
        { duration: '1m', target: 3 },
        { duration: '30m', target: 3 },    // 持续中等负载
        { duration: '30s', target: 0 },
      ],
    },
  },
};

const stage = __ENV.STAGE || 'load';

export const options = {
  scenarios: MIXED_SCENARIOS[stage] || MIXED_SCENARIOS.load,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    journey_complete_rate: ['rate>0.90'],
    'http_req_duration{name:health}': ['p(99)<100'],
    'http_req_duration{name:hot_searches}': ['p(95)<300'],
    'http_req_duration{name:search}': ['p(95)<800'],
    'http_req_duration{name:product_detail}': ['p(95)<500'],
    'http_req_duration{name:facets}': ['p(95)<500'],
    'http_req_duration{name:click}': ['p(95)<200'],
  },
};

// ============================================================
// 用户旅程
// ============================================================

export default function () {
  let journeySuccess = true;

  // 随机选择用户类型
  const userType = Math.random();

  if (userType < 0.50) {
    journeySuccess = searchAndBrowseJourney();   // 50% 搜索用户
  } else if (userType < 0.80) {
    journeySuccess = browseOnlyJourney();         // 30% 纯浏览用户
  } else {
    journeySuccess = quickSearchJourney();        // 20% 快速搜索用户
  }

  journeyComplete.add(journeySuccess);
}

// ============================================================
// 旅程 1：搜索并深入浏览（最典型的用户行为）
// ============================================================

function searchAndBrowseJourney() {
  let success = true;

  // Step 1: 健康检查 + 热门搜索（模拟首页加载）
  group('首页加载', () => {
    const responses = http.batch([
      ['GET', `${BASE_URL}/health`, null, { tags: { name: 'health' } }],
      ['GET', `${BASE_URL}/products/hot-searches?limit=10`, null, { tags: { name: 'hot_searches' } }],
      ['GET', buildSearchUrl({ limit: 12, sortBy: 'popular' }), null, { tags: { name: 'search' } }],
    ]);

    for (const res of responses) {
      if (res.status !== 200) success = false;
    }
  });

  sleep(randomInt(1, 3)); // 用户浏览首页

  // Step 2: 搜索
  let products = []; // 存 { id, slug } 用于后续详情和点击

  group('搜索商品', () => {
    // 只用能搜到结果的英文关键词（本地测试库只有 68 个英文商品）
    const allKeywords = [...HOT_KEYWORDS, ...LONG_TAIL_KEYWORDS];
    const keyword = randomItem(allKeywords);

    // 先触发自动补全
    const prefix = keyword.substring(0, Math.min(3, keyword.length));
    http.get(
      `${BASE_URL}/products/autocomplete?q=${encodeURIComponent(prefix)}&limit=10`,
      { tags: { name: 'autocomplete' } }
    );
    sleep(0.5); // 用户看补全结果

    // 发起正式搜索
    const searchRes = http.get(
      buildSearchUrl({ search: keyword, limit: 20 }),
      { tags: { name: 'search' } }
    );

    searchDuration.add(searchRes.timings.duration);

    if (searchRes.status === 200) {
      const body = searchRes.json();
      if (body && body.data) {
        products = body.data
          .filter((p) => p.id && p.slug)
          .map((p) => ({ id: p.id, slug: p.slug }));
      }
    } else {
      success = false;
    }

    check(searchRes, {
      '搜索成功': (r) => r.status === 200,
      '有搜索结果': (r) => {
        const b = r.json();
        return b && b.data && b.data.length > 0;
      },
    });

    // 同时请求 facets（筛选面板）
    http.get(
      `${BASE_URL}/products/facets?search=${encodeURIComponent(keyword)}`,
      { tags: { name: 'facets' } }
    );
  });

  sleep(randomInt(2, 4)); // 用户浏览搜索结果

  // Step 3: 点击查看商品详情（如果有结果）
  if (products.length > 0) {
    group('查看商品详情', () => {
      const product = randomItem(products);

      // 记录点击 + 用 slug 获取详情（并行，slug 接口是 public 的）
      const responses = http.batch([
        ['POST', `${BASE_URL}/products/${product.id}/click`, null, { tags: { name: 'click' } }],
        ['GET', `${BASE_URL}/products/slug/${product.slug}`, null, { tags: { name: 'product_detail' } }],
      ]);

      const detailRes = responses[1];
      detailDuration.add(detailRes.timings.duration);

      check(detailRes, {
        '详情页成功': (r) => r.status === 200,
        '详情有标题': (r) => {
          const b = r.json();
          return b && b.title;
        },
      });

      sleep(randomInt(3, 8)); // 用户看详情（停留时间较长）

      // Step 4: 查看相似商品
      const similarRes = http.get(
        `${BASE_URL}/visual-search/by-product/${product.id}?limit=10&minSimilarity=30`,
        { tags: { name: 'similar_products' } }
      );

      check(similarRes, {
        '相似商品成功': (r) => r.status === 200,
      });
    });
  }

  sleep(randomInt(1, 2));

  // Step 5: 可能翻页（30% 概率）
  if (Math.random() < 0.3 && products.length > 0) {
    group('翻页', () => {
      const keyword = randomItem(HOT_KEYWORDS);
      const res = http.get(
        buildSearchUrl({ search: keyword, page: 2, limit: 20 }),
        { tags: { name: 'search' } }
      );

      check(res, {
        '翻页成功': (r) => r.status === 200,
      });
    });
  }

  return success;
}

// ============================================================
// 旅程 2：纯浏览用户（不搜索，按分类/排序浏览）
// ============================================================

function browseOnlyJourney() {
  let success = true;

  // 加载首页推荐
  group('浏览首页', () => {
    const responses = http.batch([
      ['GET', `${BASE_URL}/health`, null, { tags: { name: 'health' } }],
      ['GET', buildSearchUrl({ limit: 20, sortBy: 'popular' }), null, { tags: { name: 'search' } }],
      ['GET', `${BASE_URL}/products/hot-searches?limit=10`, null, { tags: { name: 'hot_searches' } }],
    ]);

    for (const res of responses) {
      if (res.status !== 200) success = false;
    }
  });

  sleep(randomInt(2, 5));

  // 按排序浏览
  group('排序浏览', () => {
    const sortBy = randomItem(SORT_OPTIONS);
    const res = http.get(
      buildSearchUrl({ sortBy, limit: 20 }),
      { tags: { name: 'search' } }
    );

    let product = null;
    if (res.status === 200) {
      const body = res.json();
      if (body.data && body.data.length > 0) {
        const p = randomItem(body.data);
        if (p.id && p.slug) product = { id: p.id, slug: p.slug };
      }
    } else {
      success = false;
    }

    sleep(randomInt(2, 4));

    // 随机点进一个商品（用 slug 接口，不需要认证）
    if (product) {
      const detailRes = http.get(
        `${BASE_URL}/products/slug/${product.slug}`,
        { tags: { name: 'product_detail' } }
      );
      detailDuration.add(detailRes.timings.duration);

      // 记录点击
      http.post(`${BASE_URL}/products/${product.id}/click`, null, {
        tags: { name: 'click' },
      });

      check(detailRes, {
        '详情页成功': (r) => r.status === 200,
      });
    }
  });

  sleep(randomInt(1, 3));
  return success;
}

// ============================================================
// 旅程 3：快速搜索用户（搜索一下就走）
// ============================================================

function quickSearchJourney() {
  let success = true;

  group('快速搜索', () => {
    const keyword = randomItem([...HOT_KEYWORDS, ...CN_KEYWORDS]);

    const res = http.get(
      buildSearchUrl({ search: keyword, limit: 20 }),
      { tags: { name: 'search' } }
    );

    searchDuration.add(res.timings.duration);

    if (res.status !== 200) success = false;

    check(res, {
      '搜索成功': (r) => r.status === 200,
    });
  });

  sleep(randomInt(1, 2));
  return success;
}
