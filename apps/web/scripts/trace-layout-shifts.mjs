import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const baseUrl = option('--base', 'http://127.0.0.1:3191');
const domain = option('--domain', 'acbuyindex.com');
const pathname = option('--path', '/en/products');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  extraHTTPHeaders: { 'x-forwarded-host': domain },
});

await context.addInitScript(() => {
  window.__layoutShiftAudit = [];
  const selector = (node) => {
    if (!(node instanceof Element)) return '';
    if (node.id) return `#${CSS.escape(node.id)}`;
    const parts = [];
    let element = node;
    while (element && parts.length < 5) {
      let part = element.tagName.toLowerCase();
      if (element.classList.length) {
        part += `.${[...element.classList].slice(0, 3).map(CSS.escape).join('.')}`;
      }
      parts.unshift(part);
      element = element.parentElement;
    }
    return parts.join(' > ');
  };

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      window.__layoutShiftAudit.push({
        value: entry.value,
        startTime: entry.startTime,
        sources: (entry.sources || []).map((source) => ({
          selector: selector(source.node),
          previousRect: source.previousRect,
          currentRect: source.currentRect,
        })),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
});

const page = await context.newPage();
const snapshots = [];
page.on('response', (response) => {
  if (response.status() >= 400) {
    console.log(`HTTP ${response.status()} ${response.url()}`);
  }
});

await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' });
for (const delay of [0, 100, 300, 700, 1500, 3000]) {
  if (delay) await page.waitForTimeout(delay - snapshots.at(-1).delay);
  snapshots.push(
    await page.evaluate((currentDelay) => ({
      delay: currentDelay,
      bodyHeight: document.body.getBoundingClientRect().height,
      scrollHeight: document.documentElement.scrollHeight,
      stylesheetCount: [...document.styleSheets].filter((sheet) => {
        try {
          return sheet.cssRules.length > 0;
        } catch {
          return false;
        }
      }).length,
      productCards: document.querySelectorAll('a[href*="/products/"]').length,
      skeletons: document.querySelectorAll('[class*="animate-pulse"]').length,
      desktopContentHeight:
        document.querySelector('h1 + div.hidden')?.getBoundingClientRect().height ?? null,
      productGridHeight:
        document.querySelector('[class*="xl:grid-cols-5"]')?.getBoundingClientRect().height ?? null,
      firstProductLinkRect: (() => {
        const link = document.querySelector('a[href*="/products/"]');
        if (!link) return null;
        const rect = link.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      })(),
      footerTop: document.querySelector('footer')?.getBoundingClientRect().top ?? null,
    }), delay),
  );
}

const shifts = await page.evaluate(() => window.__layoutShiftAudit || []);
console.log(JSON.stringify({ domain, pathname, snapshots, shifts }, null, 2));

await context.close();
await browser.close();
