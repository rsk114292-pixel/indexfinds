import { CATEGORY_LINKS, type CategoryIcon } from "./categories";
import type { SiteDefinition } from "./sites";

const ICON_MARKUP: Record<CategoryIcon, string> = {
  shoe: '<path d="M5 6v8c0 2 1.5 4 4 4h10c1.7 0 3-1.3 3-3v-1.5c0-1.2-.8-2.3-2-2.7l-5.8-1.9L11 5.5 8.5 9H5"/><path d="M8 14h5"/>',
  shirt:
    '<path d="M8.5 4 4 6.5 6.2 11 9 9.5V21h10V9.5l2.8 1.5L24 6.5 19.5 4A6 6 0 0 1 14 7a6 6 0 0 1-5.5-3Z"/>',
  hanger:
    '<path d="M13 7a3 3 0 1 1 3 3v2"/><path d="m16 12 8 6a2 2 0 0 1-1.2 3.6H5.2A2 2 0 0 1 4 18l8-6"/>',
  pants:
    '<path d="M7 4h14l-1 18h-5l-1-10-1 10H8L7 4Z"/><path d="M8 8h12M14 4v5"/>',
  bag: '<path d="M7 9h14l-1 13H8L7 9Z"/><path d="M10 10V7a4 4 0 0 1 8 0v3"/>',
  watch:
    '<path d="M10 3h8l1 4-1 2h-8L9 7l1-4ZM10 19h8l1 2-1 4h-8l-1-4 1-2Z"/><rect x="8" y="8" width="12" height="12" rx="3"/><path d="M14 11v4l3 2"/>',
  jewelry:
    '<path d="M5 8h18l-9 13L5 8Z"/><path d="m8 8 3-4h6l3 4M10 8l4 13 4-13"/>',
  electronics:
    '<path d="M8 6h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z"/><path d="M10 3v3m8-3v3M9 23h10M9 12h2m3 0h2m3 0h1"/>',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createCategoryUrl(
  site: SiteDefinition,
  categorySlug: string,
): string {
  const params = new URLSearchParams({
    utm_source: site.domain,
    utm_medium: "referral",
    utm_campaign: "subsite_category_directory",
    utm_content: categorySlug,
  });
  if (site.agentKey) params.set("agent", site.agentKey);

  return `https://indexfinds.com/en/categories/${encodeURIComponent(categorySlug)}?${params.toString()}`;
}

function renderCategoryCard(site: SiteDefinition, index: number): string {
  const category = CATEGORY_LINKS[index];
  const url = createCategoryUrl(site, category.slug);

  return `<a class="category-card" data-category-card="${escapeHtml(category.slug)}" href="${escapeHtml(url)}" aria-label="Open ${escapeHtml(category.title)} on IndexFinds">
    <span class="icon-shell" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICON_MARKUP[category.icon]}</svg></span>
    <span class="category-copy">
      <strong>${escapeHtml(category.title)}</strong>
      <span>${escapeHtml(category.description)}</span>
    </span>
    <span class="open-link">Open directory <span aria-hidden="true">→</span></span>
  </a>`;
}

export function renderDirectoryPage(site: SiteDefinition): string {
  const title = `${site.title} Category Directory`;
  const description = `Browse eight current shopping categories. Product listings and details are maintained on IndexFinds.`;
  const canonicalUrl = `https://${site.domain}/`;
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: CATEGORY_LINKS.length,
    itemListElement: CATEGORY_LINKS.map((category, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: category.title,
      url: createCategoryUrl(site, category.slug),
    })),
  };
  const structuredData = JSON.stringify(itemList).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} | IndexFinds</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta name="theme-color" content="#fffdf8">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <script type="application/ld+json">${structuredData}</script>
  <style>
    :root{color-scheme:light;--ink:#0b1f3a;--muted:#66758a;--line:#d9e3df;--wash:#f3f7f5;--paper:#fffdf8;--card:#fff;--accent:#e96418;--green:#087a4b;--shadow:0 18px 46px rgba(11,31,58,.07)}
    *{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#fff 0,#fffdf8 72%,#f8fbf8 100%);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;min-height:100vh}
    a{color:inherit}.shell{width:min(1500px,calc(100% - 40px));margin:0 auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:28px 0}.brand{display:flex;align-items:center;gap:12px;text-decoration:none;font-weight:900;letter-spacing:-.02em}.brand-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:var(--ink);color:#fff}.brand-mark svg{width:23px}.main-link{font-size:14px;font-weight:800;text-decoration:none;color:var(--green)}
    .hero{padding:54px 0 48px;text-align:center}.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:8px 13px;border:1px solid #cfe0d8;border-radius:999px;background:#f7fbf8;color:var(--green);font-size:12px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.hero h1{max-width:900px;margin:24px auto 14px;font-size:clamp(38px,6vw,76px);line-height:1.02;letter-spacing:-.055em}.hero p{max-width:720px;margin:0 auto;color:var(--muted);font-size:clamp(17px,2vw,21px);line-height:1.65}
    .category-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;padding:8px 0 72px}.category-card{min-height:340px;padding:26px 26px 24px;border:1px solid var(--line);border-radius:24px;background:var(--card);box-shadow:var(--shadow);display:flex;flex-direction:column;align-items:center;text-align:center;text-decoration:none;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}.category-card:hover,.category-card:focus-visible{transform:translateY(-4px);border-color:#8dc5ad;box-shadow:0 22px 54px rgba(11,31,58,.11);outline:none}.icon-shell{width:112px;height:112px;border:1px solid #d7e2de;border-radius:25px;background:linear-gradient(145deg,#fff,#eef3f1);box-shadow:0 7px 0 #e4ebe8;display:grid;place-items:center;color:var(--accent)}.icon-shell svg{width:54px;height:54px}.category-copy{display:block}.category-copy strong{display:block;margin-top:28px;font-size:22px;line-height:1.18;letter-spacing:-.035em}.category-copy>span{display:block;margin-top:13px;color:var(--muted);font-size:16px;line-height:1.5}.open-link{margin-top:auto;padding-top:30px;color:var(--green);font-size:16px;font-weight:900}.open-link span{display:inline-block;margin-left:6px;transition:transform .2s ease}.category-card:hover .open-link span{transform:translateX(4px)}
    .notice{margin-bottom:70px;padding:26px 30px;border:1px solid #d8e4df;border-radius:22px;background:#f7fbf8;display:flex;align-items:center;justify-content:space-between;gap:28px}.notice strong{display:block;font-size:18px}.notice p{margin:6px 0 0;color:var(--muted);line-height:1.6}.notice a{flex:none;padding:12px 18px;border-radius:999px;background:var(--green);color:#fff;font-weight:850;text-decoration:none}.footer{padding:28px 0 42px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;color:var(--muted);font-size:13px}
    @media(max-width:1120px){.category-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.category-card{min-height:315px}}
    @media(max-width:680px){.shell{width:min(100% - 24px,1500px)}.topbar{padding:18px 0}.main-link{display:none}.hero{padding:36px 0}.hero h1{font-size:42px}.category-grid{grid-template-columns:1fr;gap:14px;padding-bottom:46px}.category-card{min-height:0;padding:22px;display:grid;grid-template-columns:76px 1fr;grid-template-rows:auto auto;align-items:center;text-align:left;column-gap:18px}.icon-shell{grid-row:1/3;width:76px;height:76px;border-radius:19px;box-shadow:0 5px 0 #e4ebe8}.icon-shell svg{width:40px;height:40px}.category-copy strong{margin:0;font-size:19px}.category-copy>span{margin-top:7px;font-size:14px}.open-link{margin:0;padding:12px 0 0;font-size:14px}.notice{margin-bottom:45px;align-items:flex-start;flex-direction:column}.footer{flex-direction:column}}
    @media(prefers-reduced-motion:reduce){.category-card,.open-link span{transition:none}}
  </style>
</head>
<body>
  <header class="shell topbar">
    <a class="brand" href="/" aria-label="${escapeHtml(site.title)} home"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 7h16M7 4v6m10-6v6M5 12h14v8H5z"/></svg></span><span>${escapeHtml(site.title)}</span></a>
    <a class="main-link" href="https://indexfinds.com/en/products?utm_source=${encodeURIComponent(site.domain)}&amp;utm_medium=referral&amp;utm_campaign=subsite_category_directory">Visit IndexFinds →</a>
  </header>
  <main class="shell">
    <section class="hero">
      <span class="eyebrow">Current category directory</span>
      <h1>Choose what you want to explore.</h1>
      <p>This subsite no longer stores product listings. Pick one of eight categories to browse current products and details directly on IndexFinds.</p>
    </section>
    <section class="category-grid" aria-label="Product categories">
      ${CATEGORY_LINKS.map((_, index) => renderCategoryCard(site, index)).join("\n")}
    </section>
    <section class="notice">
      <div><strong>One catalog, always current.</strong><p>Product names, prices, images and availability are maintained only on the IndexFinds main site.</p></div>
      <a href="https://indexfinds.com/en/products?utm_source=${encodeURIComponent(site.domain)}&amp;utm_medium=referral&amp;utm_campaign=subsite_category_directory">Browse all products</a>
    </section>
  </main>
  <footer class="shell footer"><span>${escapeHtml(site.domain)}</span><span>Directory powered by IndexFinds</span></footer>
</body>
</html>`;
}

export function renderRobots(site: SiteDefinition): string {
  return `User-agent: *\nAllow: /\nSitemap: https://${site.domain}/sitemap.xml\n`;
}

export function renderSitemap(site: SiteDefinition): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${site.domain}/</loc><lastmod>2026-08-14</lastmod></url></urlset>`;
}

export function renderFavicon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#0b1f3a"/><path d="M16 22h32M22 14v16m20-16v16M18 34h28v18H18z" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
