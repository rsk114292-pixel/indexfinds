/**
 * 视觉搜索压力测试
 *
 * 测试目标: POST /visual-search/search (图片搜索)
 *          GET /visual-search/by-product/:id (相似商品)
 *
 * 注意: 视觉搜索涉及 Embedding 服务（CLIP 模型推理），
 *       是整个系统最可能的性能瓶颈。Rate Limit 为 5 req/sec。
 *
 * 前置准备:
 *   1. 在 scripts/load-test/fixtures/ 放几张测试图片
 *   2. 或者运行 setup 阶段自动获取商品图片 URL
 *
 * 用法:
 *   k6 run scripts/load-test/visual-search.k6.js
 *   k6 run -e STAGE=stress scripts/load-test/visual-search.k6.js
 *   k6 run -e BASE_URL=http://your-vps:4000 scripts/load-test/visual-search.k6.js
 */

import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import {
  BASE_URL,
  randomItem,
  randomInt,
} from './config.js';

// ============================================================
// 自定义指标
// ============================================================

const visualSearchDuration = new Trend('visual_search_duration', true);
const similarProductDuration = new Trend('similar_product_duration', true);
const visualSearchErrors = new Rate('visual_search_errors');
const embeddingServiceDown = new Counter('embedding_service_down');

// ============================================================
// 配置 — 视觉搜索有独立 Rate Limit（5 req/sec）
// 用 arrival-rate 精确控制在 4 RPS 以内
// ============================================================

const scenarioMap = {
  baseline: {
    visual: {
      executor: 'ramping-arrival-rate',
      startRate: 1, timeUnit: '1s',
      preAllocatedVUs: 5, maxVUs: 10,
      stages: [{ duration: '30s', target: 1 }],
    },
  },
  load: {
    visual: {
      executor: 'ramping-arrival-rate',
      startRate: 1, timeUnit: '1s',
      preAllocatedVUs: 10, maxVUs: 20,
      stages: [
        { duration: '30s', target: 2 },
        { duration: '1m', target: 4 },    // 接近 5 req/sec limit
        { duration: '1m', target: 4 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  stress: {
    visual: {
      executor: 'ramping-arrival-rate',
      startRate: 1, timeUnit: '1s',
      preAllocatedVUs: 20, maxVUs: 40,
      stages: [
        { duration: '30s', target: 3 },
        { duration: '1m', target: 5 },    // 触及 rate limit
        { duration: '1m', target: 8 },    // 超限，观察降级
        { duration: '1m', target: 8 },
        { duration: '30s', target: 0 },
      ],
    },
  },
};

const stage = __ENV.STAGE || 'load';

export const options = {
  scenarios: scenarioMap[stage] || scenarioMap.load,
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{name:visual_search}': ['p(95)<3000', 'p(99)<5000'],
    'http_req_duration{name:similar_products}': ['p(95)<1000'],
  },
};

// ============================================================
// 存储 setup 阶段获取的商品 ID
// ============================================================

let productIds = [];

export function setup() {
  // 先检查视觉搜索服务是否可用
  const statusRes = http.get(`${BASE_URL}/visual-search/status`);
  const status = statusRes.status === 200 ? statusRes.json() : { available: false };

  console.log(`视觉搜索服务状态: ${status.available ? '可用' : '不可用'}`);
  if (status.stats) {
    console.log(`  有 embedding 的商品: ${status.stats.productsWithEmbedding}`);
    console.log(`  覆盖率: ${status.stats.coverage}%`);
  }

  if (!status.available) {
    console.warn('⚠️  Embedding 服务不可用，将只测试相似商品接口');
  }

  // 获取一些商品 ID，用于 "相似商品" 接口测试
  const productsRes = http.get(`${BASE_URL}/products?limit=50&status=PUBLISHED`);
  if (productsRes.status === 200) {
    const body = productsRes.json();
    const ids = body.data
      .map((item) => item.id)
      .filter(Boolean);
    console.log(`获取到 ${ids.length} 个商品 ID 用于测试`);
    return { productIds: ids, embeddingAvailable: status.available };
  }

  return { productIds: [], embeddingAvailable: status.available };
}

// ============================================================
// 测试场景
// ============================================================

export default function (data) {
  productIds = data.productIds;

  const scenario = Math.random();

  if (scenario < 0.4 && data.embeddingAvailable) {
    imageSearchWithUrl();         // 40% 图片 URL 搜索
  } else if (scenario < 0.8 && productIds.length > 0) {
    similarProductSearch(data);   // 40% 相似商品搜索
  } else {
    checkServiceStatus();         // 20% 健康检查
  }

  // arrival-rate 模式下由 k6 控制请求节奏
}

// ============================================================
// 场景实现
// ============================================================

/**
 * 使用图片 URL 进行视觉搜索
 * 从已有商品中获取图片 URL，下载后上传搜索
 */
function imageSearchWithUrl() {
  // 先获取一个随机商品的图片 URL
  const productsRes = http.get(
    `${BASE_URL}/products?limit=5&page=${randomInt(1, 10)}&status=PUBLISHED`
  );

  if (productsRes.status !== 200) {
    visualSearchErrors.add(true);
    return;
  }

  const body = productsRes.json();
  const products = Array.isArray(body?.data) ? body.data : [];
  if (!products || products.length === 0) return;

  const product = randomItem(products);
  const imageUrl = product.mainImage;

  if (!imageUrl) return;

  // 下载图片
  const imageRes = http.get(imageUrl, { responseType: 'binary' });
  if (imageRes.status !== 200) {
    console.warn(`图片下载失败: ${imageUrl}`);
    return;
  }

  // 上传图片进行视觉搜索
  const payload = {
    image: http.file(imageRes.body, 'test-image.jpg', 'image/jpeg'),
  };

  const res = http.post(`${BASE_URL}/visual-search/search`, payload, {
    tags: { name: 'visual_search' },
  });

  visualSearchDuration.add(res.timings.duration);
  visualSearchErrors.add(res.status !== 200);

  check(res, {
    '视觉搜索状态码 200': (r) => r.status === 200,
    '返回搜索结果': (r) => {
      if (r.status !== 200) return false;
      const body = r.json();
      return body && Array.isArray(body.results);
    },
    '视觉搜索 < 3s': (r) => r.timings.duration < 3000,
  });
}

/** 相似商品搜索（基于已有商品 ID） */
function similarProductSearch(data) {
  const productId = randomItem(data.productIds);

  const res = http.get(
    `${BASE_URL}/visual-search/by-product/${productId}?limit=20&minSimilarity=30`,
    { tags: { name: 'similar_products' } }
  );

  similarProductDuration.add(res.timings.duration);

  check(res, {
    '相似商品状态码 200': (r) => r.status === 200,
    '相似商品 < 1s': (r) => r.timings.duration < 1000,
  });
}

/** 服务状态检查 */
function checkServiceStatus() {
  const res = http.get(`${BASE_URL}/visual-search/status`, {
    tags: { name: 'health_check' },
  });

  if (res.status === 200) {
    const body = res.json();
    if (!body.available) {
      embeddingServiceDown.add(1);
    }
  }

  check(res, {
    '状态检查 200': (r) => r.status === 200,
  });
}
