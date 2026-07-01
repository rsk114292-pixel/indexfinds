import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3001';
const REFERRAL_CODE = __ENV.REFERRAL_CODE || 'V9ARNU';
const PRODUCT_ID =
  __ENV.PRODUCT_ID || '00000000-0000-4000-8000-000000000001';
const PLATFORM_URL =
  __ENV.PLATFORM_URL || 'https://example.com/products/test-item';
const FIXED_IP = __ENV.FIXED_IP || '198.51.100.23';
const FIXED_VISITOR_ID = __ENV.FIXED_VISITOR_ID || 'vid_k6_referral_replay';
const UA =
  __ENV.USER_AGENT ||
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15';
const REFERER = __ENV.REFERER || 'https://instagram.com/reel/test';
const unexpectedErrors = new Rate('unexpected_errors');

export const options = {
  thresholds: {
    unexpected_errors: ['rate<0.05'],
    'http_req_duration{endpoint:referral_track_click}': ['p(95)<800'],
    'http_req_duration{endpoint:product_view}': ['p(95)<800'],
    'http_req_duration{endpoint:outbound_click}': ['p(95)<800'],
  },
  scenarios: {
    replay_clicks: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      stages: [
        { target: 2, duration: '10s' },
        { target: 12, duration: '20s' },
        { target: 30, duration: '20s' },
        { target: 0, duration: '10s' },
      ],
      exec: 'replayReferralFlow',
    },
  },
};

function requestParams(extraCookies = {}) {
  const cookies = {
    mf_vid: FIXED_VISITOR_ID,
    ...extraCookies,
  };

  return {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'X-Forwarded-For': FIXED_IP,
      Referer: REFERER,
    },
    cookies,
  };
}

export function replayReferralFlow() {
  const clickRes = http.post(
    `${BASE_URL}/referral/track-click`,
    JSON.stringify({
      code: REFERRAL_CODE,
      landingPage: `/products/${PRODUCT_ID}`,
      redirectTo: `/products/${PRODUCT_ID}`,
    }),
    {
      ...requestParams(),
      tags: { endpoint: 'referral_track_click' },
    },
  );

  check(clickRes, {
    'track-click accepted or intentionally throttled': (res) =>
      res.status === 200 || res.status === 201 || res.status === 429,
  });
  unexpectedErrors.add(![200, 201, 429].includes(clickRes.status));

  let attributionCookie = '';
  try {
    const body = clickRes.json();
    attributionCookie = body?.cookieValue || '';
  } catch {
    attributionCookie = '';
  }

  if (attributionCookie) {
    const viewRes = http.post(
      `${BASE_URL}/products/${PRODUCT_ID}/view`,
      null,
      {
        ...requestParams({ mf_ref_attrib: attributionCookie }),
        tags: { endpoint: 'product_view' },
      },
    );

    check(viewRes, {
      'product view accepted': (res) => res.status === 204,
    });
    unexpectedErrors.add(viewRes.status !== 204);

    const outboundRes = http.post(
      `${BASE_URL}/outbound/click`,
      JSON.stringify({
        productId: PRODUCT_ID,
        platformType: 'kakobuy',
        platformUrl: PLATFORM_URL,
        source: 'search',
        pageType: 'product',
        pagePath: `/products/${PRODUCT_ID}`,
      }),
      {
        ...requestParams({ mf_ref_attrib: attributionCookie }),
        tags: { endpoint: 'outbound_click' },
      },
    );

    check(outboundRes, {
      'outbound click responded': (res) => res.status === 200,
    });
    unexpectedErrors.add(outboundRes.status !== 200);
  }

  sleep(0.2);
}
