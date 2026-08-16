import {
  renderDirectoryPage,
  renderFavicon,
  renderRobots,
  renderSitemap,
} from "./render";
import { getSiteDefinition, type SiteDefinition } from "./sites";

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
} as const;

function resolveSite(url: URL): SiteDefinition | undefined {
  const directMatch = getSiteDefinition(url.hostname);
  if (directMatch) return directMatch;

  const previewAllowed =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname.endsWith(".workers.dev");
  return previewAllowed
    ? getSiteDefinition(url.searchParams.get("site") || "")
    : undefined;
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
  const site = resolveSite(url);
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
      },
    }),
  );
}

export default {
  fetch(request: Request): Response {
    return handleRequest(request);
  },
};
