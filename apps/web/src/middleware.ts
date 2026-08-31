import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { buildReferralTrackingHeaders } from '@/lib/referral-tracking-signature';
import { getLegacyHostRedirectUrl } from '@/lib/host-redirect';
import { getTenantLegacyPathRedirectUrl } from '@/lib/tenant-legacy-path-redirect';
import {
  getGuardedCatalogDetailRoute,
  resolveGuardedCatalogSlug,
} from '@/lib/catalog-route-guard';
import { hasAnalyticsConsent } from '@/lib/analytics-consent';
import { isDisabledPublicAuthPath } from '@/lib/features';
import { isPublicSeoRoute } from '@/lib/public-seo-route';
import {
  isMainSiteHost,
  isTenantLocaleIndexable,
  isTenantPathIndexable,
  resolveTenantFromHeaders,
} from '@/lib/tenant-config';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4101';
const TRUSTED_VISITOR_COOKIE = 'mf_vid';
const LEGACY_HTML_ENTRY_PATHS = new Set([
  '/shipping.html',
  '/invitation-code.html',
  '/guide.html',
  '/shipping-weight-guide.html',
  '/categories.html',
  '/faq.html',
  '/safety.html',
  '/contact.html',
  '/spreadsheet-checklist.html',
  '/privacy.html',
  '/search-ideas.html',
  '/review.html',
  '/reviews.html',
  '/reddit.html',
  '/coupons.html',
  '/buyer-safety.html',
]);

const intlMiddleware = createMiddleware(routing);

function isPrefetchLikeRequest(request: NextRequest) {
  const purpose = request.headers.get('purpose');
  const secPurpose = request.headers.get('sec-purpose');
  return (
    request.headers.has('next-router-prefetch') ||
    request.headers.has('x-middleware-prefetch') ||
    purpose === 'prefetch' ||
    secPurpose === 'prefetch'
  );
}

export default async function middleware(request: NextRequest) {
  const requestHost =
    request.headers.get('x-forwarded-host') || request.headers.get('host');
  const legacyHostRedirectUrl = getLegacyHostRedirectUrl(
    request.nextUrl.toString(),
    requestHost,
  );

  if (legacyHostRedirectUrl) {
    return NextResponse.redirect(legacyHostRedirectUrl, 308);
  }

  const tenant = resolveTenantFromHeaders(
    request.headers,
    process.env.INDEXFINDS_LOCAL_TENANT_HOST,
  );
  if (!tenant && !isMainSiteHost(requestHost)) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  }

  const tenantLegacyPathRedirectUrl = tenant
    ? getTenantLegacyPathRedirectUrl(
        request.nextUrl.toString(),
        tenant.domain,
      )
    : null;
  if (tenantLegacyPathRedirectUrl) {
    return NextResponse.redirect(tenantLegacyPathRedirectUrl, 308);
  }
  if (LEGACY_HTML_ENTRY_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith('/tenants/1to1reps/')) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  }

  if (request.nextUrl.pathname === '/favicon.ico') {
    const faviconPath = tenant?.branding?.faviconPath;

    if (faviconPath) {
      const faviconUrl = request.nextUrl.clone();
      faviconUrl.pathname = faviconPath;
      faviconUrl.search = '';
      const response = NextResponse.rewrite(faviconUrl);
      response.headers.set(
        'cache-control',
        'public, max-age=86400, stale-while-revalidate=604800',
      );
      return response;
    }
  }

  // Next.js owns these host-aware SEO endpoints. Sending them through the
  // locale middleware changes /sitemap.xml into /en/sitemap.xml and makes the
  // crawl entry points return 404.
  if (isPublicSeoRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (isDisabledPublicAuthPath(request.nextUrl.pathname)) {
    const locale = request.nextUrl.pathname.split('/')[1] || routing.defaultLocale;
    const response = NextResponse.rewrite(
      new URL(`/${locale}/_not-found`, request.url),
      { status: 404 },
    );
    response.headers.set('x-robots-tag', 'noindex, nofollow');
    response.headers.set('x-pathname', request.nextUrl.pathname);
    return response;
  }

  const guardedCatalogRoute = getGuardedCatalogDetailRoute(
    request.nextUrl.pathname,
  );
  if (
    guardedCatalogRoute &&
    (request.method === 'GET' || request.method === 'HEAD') &&
    !isPrefetchLikeRequest(request)
  ) {
    const slugResolution = await resolveGuardedCatalogSlug(
      guardedCatalogRoute.entityType,
      guardedCatalogRoute.slug,
    );

    if (slugResolution.exists === false) {
      const notFoundUrl = new URL(
        `/${guardedCatalogRoute.locale}/_not-found`,
        request.url,
      );
      const response = NextResponse.rewrite(notFoundUrl, { status: 404 });
      response.headers.set('x-robots-tag', 'noindex, nofollow');
      response.headers.set('x-pathname', request.nextUrl.pathname);
      return response;
    }

    if (
      slugResolution.exists === true &&
      slugResolution.canonicalSlug &&
      slugResolution.canonicalSlug !== guardedCatalogRoute.slug
    ) {
      const canonicalUrl = request.nextUrl.clone();
      canonicalUrl.pathname =
        `/${guardedCatalogRoute.locale}/${guardedCatalogRoute.entityType}/` +
        slugResolution.canonicalSlug;
      return NextResponse.redirect(canonicalUrl, 308);
    }
  }

  const response = intlMiddleware(request);
  // Forward pathname for hreflang generation in [locale]/layout.tsx
  response.headers.set('x-pathname', request.nextUrl.pathname);

  const tenantLocale = request.nextUrl.pathname.match(/^\/([^/]+)/)?.[1];
  if (
    tenant &&
    tenantLocale &&
    (!isTenantLocaleIndexable(tenant, tenantLocale) ||
      !isTenantPathIndexable(tenant, request.nextUrl.pathname))
  ) {
    const isNotFoundRewrite = /^\/[a-z]{2}\/_not-found\/?$/i.test(
      request.nextUrl.pathname,
    );
    response.headers.set(
      'x-robots-tag',
      isNotFoundRewrite ? 'noindex, nofollow' : 'noindex, follow',
    );
  }

  const analyticsConsent = request.cookies.get('cookie_consent')?.value;
  const trustedVisitorId = request.cookies.get(TRUSTED_VISITOR_COOKIE)?.value;
  if (hasAnalyticsConsent(analyticsConsent) && !trustedVisitorId) {
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
  } else if (!hasAnalyticsConsent(analyticsConsent) && trustedVisitorId) {
    response.cookies.delete(TRUSTED_VISITOR_COOKIE);
  }

  // --- ?ref=CODE referral tracking ---
  const refCode = request.nextUrl.searchParams.get('ref');
  if (refCode) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';

    let sessionId = request.cookies.get('session_id')?.value;
    const isNewSession = !sessionId;
    if (!sessionId) {
      sessionId =
        'sess_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    }

    try {
      const trackingPayload = {
        code: refCode,
        sessionId,
        landingPage: request.nextUrl.pathname + request.nextUrl.search,
        redirectTo: request.nextUrl.pathname,
        userAgent,
        ip,
        referer,
      };
      const apiRes = await fetch(`${API_BASE_URL}/referral/track-click`, {
        method: 'POST',
        signal: AbortSignal.timeout(1500),
        headers: {
          'Content-Type': 'application/json',
          ...(await buildReferralTrackingHeaders(trackingPayload)),
        },
        body: JSON.stringify(trackingPayload),
      });

      const data = await apiRes.json();
      if (data.success && data.cookieValue) {
        response.cookies.set('mf_ref_attrib', data.cookieValue, {
          maxAge: 30 * 24 * 60 * 60, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      }
    } catch {
      // Referral tracking should not block page render.
    }

    if (isNewSession) {
      response.cookies.set('session_id', sessionId, {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/sitemaps/:path*',
    '/shipping.html',
    '/invitation-code.html',
    '/guide.html',
    '/shipping-weight-guide.html',
    '/categories.html',
    '/faq.html',
    '/safety.html',
    '/contact.html',
    '/spreadsheet-checklist.html',
    '/privacy.html',
    '/search-ideas.html',
    '/review.html',
    '/reviews.html',
    '/reddit.html',
    '/coupons.html',
    '/buyer-safety.html',
    '/tenants/1to1reps/:path*',
    // Match all pathnames except:
    // - /api (backend proxy rewrite)
    // - /admin (no i18n)
    // - /r (referral links, outside [locale])
    // - /auth/callback (OAuth callback, outside [locale])
    // - /_next (Next.js internals)
    // - Static files
    '/((?!api|admin|r/|auth/callback|_next|favicon.ico|robots.txt|sitemap.xml|sitemaps/|.*\\.).*)',
  ],
};
