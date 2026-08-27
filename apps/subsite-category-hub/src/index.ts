import {
  renderDirectoryPage,
  renderFavicon,
  renderRobots,
  renderSitemap,
} from "./render";
import {
  getSiteDefinition,
  isSiteReleasedForIndexing,
  type SiteDefinition,
} from "./sites";

export interface WorkerEnv {
  ORIGIN_URL?: string;
  TENANT_PROXY_SECRET?: string;
  SITE_ALLOWLIST?: string;
}

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
} as const;

function getCookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function isPreviewHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".workers.dev")
  );
}

function resolveSite(request: Request, url: URL): SiteDefinition | undefined {
  const directMatch = getSiteDefinition(url.hostname);
  if (directMatch) return directMatch;

  if (!isPreviewHostname(url.hostname)) return undefined;
  return getSiteDefinition(
    url.searchParams.get("site") ||
      getCookieValue(request, "indexfinds_preview_site") ||
      "",
  );
}

function siteAllowed(site: SiteDefinition, allowlist?: string): boolean {
  if (!allowlist?.trim()) return true;
  const allowed = new Set(
    allowlist
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
  );
  return allowed.has(site.domain);
}

function responseWithHeaders(
  body: BodyInit | null,
  init: ResponseInit,
): Response {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(body, { ...init, headers });
}

function asHeadResponse(request: Request, response: Response): Response {
  return request.method === "HEAD"
    ? new Response(null, { status: response.status, headers: response.headers })
    : response;
}

export function handleRequest(request: Request): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return responseWithHeaders("Method not allowed", {
      status: 405,
      headers: {
        Allow: "GET, HEAD",
        "Content-Type": "text/plain; charset=UTF-8",
      },
    });
  }

  const url = new URL(request.url);
  const site = resolveSite(request, url);
  if (!site) {
    return responseWithHeaders("Unknown IndexFinds subsite", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  if (url.pathname === "/robots.txt") {
    return asHeadResponse(
      request,
      responseWithHeaders(renderRobots(site), {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
      }),
    );
  }

  if (url.pathname === "/sitemap.xml") {
    return asHeadResponse(
      request,
      responseWithHeaders(renderSitemap(site), {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=UTF-8",
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
      }),
    );
  }

  if (url.pathname === "/favicon.svg") {
    return asHeadResponse(
      request,
      responseWithHeaders(renderFavicon(), {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=UTF-8",
          "Cache-Control": "public, max-age=86400, s-maxage=604800",
        },
      }),
    );
  }

  return asHeadResponse(
    request,
    responseWithHeaders(renderDirectoryPage(site), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Content-Language": "en",
        "Cache-Control":
          "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
        ...(!isSiteReleasedForIndexing(site) && {
          "X-Robots-Tag": "noindex, follow",
        }),
      },
    }),
  );
}

async function proxyTenantRequest(
  request: Request,
  env: WorkerEnv,
  site: SiteDefinition,
  url: URL,
): Promise<Response> {
  const isPreview = isPreviewHostname(url.hostname);
  if (!isPreview && (url.protocol !== "https:" || url.hostname.startsWith("www."))) {
    return Response.redirect(
      `https://${site.domain}${url.pathname}${url.search}`,
      308,
    );
  }

  let origin: URL;
  try {
    origin = new URL(env.ORIGIN_URL!);
  } catch {
    return responseWithHeaders("Tenant origin is not configured", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const upstreamUrl = new URL(origin);
  upstreamUrl.pathname = url.pathname;
  upstreamUrl.search = url.search;
  upstreamUrl.searchParams.delete("site");

  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete("host");
  upstreamHeaders.set("x-indexfinds-tenant-host", site.domain);
  upstreamHeaders.set("x-indexfinds-tenant-secret", env.TENANT_PROXY_SECRET!);
  upstreamHeaders.set("x-forwarded-host", site.domain);
  upstreamHeaders.set("x-forwarded-proto", "https");

  try {
    const upstream = await fetch(
      new Request(upstreamUrl, {
        method: request.method,
        headers: upstreamHeaders,
        redirect: "manual",
      }),
    );
    const responseHeaders = new Headers(upstream.headers);
    if (isPreview) {
      responseHeaders.set("Cache-Control", "no-store");
      responseHeaders.set("X-Robots-Tag", "noindex, nofollow");
      responseHeaders.append(
        "Set-Cookie",
        `indexfinds_preview_site=${encodeURIComponent(site.domain)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=86400`,
      );
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return responseWithHeaders("Tenant origin is temporarily unavailable", {
      status: 502,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
}

export async function handleRequestWithEnv(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  if (!env.ORIGIN_URL || !env.TENANT_PROXY_SECRET) {
    return handleRequest(request);
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return responseWithHeaders("Method not allowed", {
      status: 405,
      headers: {
        Allow: "GET, HEAD",
        "Content-Type": "text/plain; charset=UTF-8",
      },
    });
  }

  const url = new URL(request.url);
  const site = resolveSite(request, url);
  if (!site || !siteAllowed(site, env.SITE_ALLOWLIST)) {
    return responseWithHeaders("Unknown IndexFinds subsite", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  return proxyTenantRequest(request, env, site, url);
}

export default {
  fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleRequestWithEnv(request, env);
  },
};
