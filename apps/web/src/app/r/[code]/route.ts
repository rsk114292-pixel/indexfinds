import { NextRequest, NextResponse } from 'next/server';
import { getSiteName } from '@/lib/site-config';
import { buildReferralTrackingHeaders } from '@/lib/referral-tracking-signature';
import { hasAnalyticsConsent } from '@/lib/analytics-consent';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4101';
const TRUSTED_VISITOR_COOKIE = 'mf_vid';

const CRAWLER_UA =
  /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|bot|crawl|spider|slurp|preview/i;

function applyDefaultReferralUTMParams(
  params: URLSearchParams,
  hasRedirectTarget: boolean,
) {
  if (!params.get('utm_source')) {
    params.set('utm_source', 'referral_link');
  }
  if (!params.get('utm_medium')) {
    params.set('utm_medium', 'referral');
  }
  if (!params.get('utm_campaign')) {
    params.set(
      'utm_campaign',
      hasRedirectTarget ? 'referral_page_share' : 'referral_invite',
    );
  }
}

/** 转义 HTML 特殊字符，防止属性注入 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 校验 redirect 为站内相对路径，防止 Open Redirect */
function getSafeRedirect(raw?: string | null): string {
  if (!raw) return '/';
  try {
    const url = new URL(raw, 'http://localhost');
    if (url.origin !== 'http://localhost') return '/';
    return url.pathname + url.search;
  } catch {
    return '/';
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  // Serve OG meta HTML to crawlers / link preview bots
  const ua = req.headers.get('user-agent') || '';
  if (CRAWLER_UA.test(ua)) {
    const baseUrl = req.nextUrl.origin;
    const safeCode = escapeHtml(encodeURIComponent(code));
    const ogImageUrl = `${baseUrl}/r/${safeCode}/og`;
    const shareUrl = `${baseUrl}/r/${safeCode}`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Join ${getSiteName()} - Get $1 Bonus</title>
  <meta property="og:title" content="Join ${getSiteName()} - Get $1 Bonus" />
  <meta property="og:description" content="Discover the best streetwear deals. Sign up with this link and earn rewards!" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Join ${getSiteName()} - Get $1 Bonus" />
  <meta name="twitter:description" content="Discover the best streetwear deals. Sign up with this link and earn rewards!" />
  <meta name="twitter:image" content="${ogImageUrl}" />
</head>
<body></body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const hasRedirectTarget = req.nextUrl.searchParams.has('redirect');
  const redirect = getSafeRedirect(req.nextUrl.searchParams.get('redirect'));

  // 提取 UTM 参数用于透传
  const utmKeys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
  ];
  const utmParams = new URLSearchParams();
  for (const key of utmKeys) {
    const value = req.nextUrl.searchParams.get(key);
    if (value) utmParams.set(key, value);
  }
  applyDefaultReferralUTMParams(utmParams, hasRedirectTarget);

  // 收集请求信息传给后端
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';

  // 从请求 Cookie 中读取客户端设置的 session_id，没有则生成
  // 客户端 getOrCreateSessionId() 会将 session_id 写入非 httpOnly Cookie，
  // 所以大部分情况下这里能直接读到。仅首次访问（推荐链接即入口）时才需要生成。
  let sessionId = req.cookies.get('session_id')?.value;
  const isNewSession = !sessionId;
  if (!sessionId) {
    sessionId =
      'sess_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  }

  try {
    const trackingPayload = {
      code,
      sessionId,
      landingPage: `/r/${code}`,
      redirectTo: redirect,
      userAgent,
      ip,
      referer,
    };
    // 调用后端 API 记录点击
    const apiRes = await fetch(`${API_BASE_URL}/referral/track-click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await buildReferralTrackingHeaders(trackingPayload)),
      },
      body: JSON.stringify(trackingPayload),
    });

    const data = await apiRes.json();

    // 302 跳转到目标页面（透传 UTM 参数）
    const redirectUrl = new URL(redirect, req.url);
    utmParams.forEach((value, key) => redirectUrl.searchParams.set(key, value));
    const response = NextResponse.redirect(redirectUrl, 302);

    if (
      hasAnalyticsConsent(req.cookies.get('cookie_consent')?.value) &&
      !req.cookies.get(TRUSTED_VISITOR_COOKIE)?.value
    ) {
      response.cookies.set(
        TRUSTED_VISITOR_COOKIE,
        'vid_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24),
        {
          maxAge: 365 * 24 * 60 * 60,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        },
      );
    } else if (
      !hasAnalyticsConsent(req.cookies.get('cookie_consent')?.value) &&
      req.cookies.get(TRUSTED_VISITOR_COOKIE)?.value
    ) {
      response.cookies.delete(TRUSTED_VISITOR_COOKIE);
    }

    // 在同域响应上设置归因 cookie
    if (data.success && data.cookieValue) {
      response.cookies.set('mf_ref_attrib', data.cookieValue, {
        maxAge: 30 * 24 * 60 * 60, // 30 天（秒）
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }

    // 新 session 时设置 session_id cookie（非 httpOnly，让客户端 JS 也能读取同一个值）
    if (isNewSession) {
      response.cookies.set('session_id', sessionId, {
        maxAge: 365 * 24 * 60 * 60, // 1 年（秒）
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }

    return response;
  } catch {
    // API 调用失败仍跳转到目标页面，不阻塞用户（仍透传 UTM 参数）
    const fallbackUrl = new URL(redirect, req.url);
    utmParams.forEach((value, key) => fallbackUrl.searchParams.set(key, value));
    return NextResponse.redirect(fallbackUrl, 302);
  }
}
