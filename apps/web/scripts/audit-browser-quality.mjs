import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const baseUrl = option('--base', 'http://127.0.0.1:3191');
const baselinePath = option('--baseline');
const outputPath = option('--output');
const concurrency = Number(option('--concurrency', '4'));

if (!baselinePath || !outputPath) {
  console.error(
    'Usage: node scripts/audit-browser-quality.mjs --baseline report.json --output report.json [--base URL] [--concurrency 4]',
  );
  process.exit(2);
}

const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
const tenants = baseline.results.map((result) => ({
  domain: result.domain,
  indexedPaths: result.pages.map((page) => new URL(page.url).pathname),
}));

const genericPaths = [
  '/en/products',
  '/en/brands/air-jordan',
  '/en/categories/earphones',
  '/en/products/design-hoodie-i71b6i',
];

const viewports = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 },
};

const browser = await chromium.launch({ headless: true });

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}

function unique(values) {
  return [...new Set(values)];
}

async function auditPage(page, domain, pathname, viewportName, indexedPaths) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedResources = [];

  const onConsole = (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  };
  const onPageError = (error) => pageErrors.push(error.message);
  const onResponse = (response) => {
    const url = response.url();
    if (
      response.status() >= 400 &&
      (url.startsWith(baseUrl) || url.startsWith('https://api-next.indexfinds.com'))
    ) {
      failedResources.push({ status: response.status(), url });
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  const response = await page.goto(`${baseUrl}${pathname}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForLoadState('load', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(350);

  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press('Tab');
  }

  const pageData = await page.evaluate(() => {
    const text = (selector) =>
      document.querySelector(selector)?.textContent?.trim() || '';
    const meta = (name) =>
      document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';
    const canonical =
      document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    const viewport =
      document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')];
    const jsonLdErrors = [];
    const jsonLdTypes = [];
    for (const script of jsonLd) {
      try {
        const parsed = JSON.parse(script.textContent || 'null');
        const values = Array.isArray(parsed) ? parsed : [parsed];
        for (const value of values) {
          const graph = Array.isArray(value?.['@graph']) ? value['@graph'] : [value];
          for (const entry of graph) {
            const type = entry?.['@type'];
            if (Array.isArray(type)) jsonLdTypes.push(...type);
            else if (type) jsonLdTypes.push(type);
          }
        }
      } catch (error) {
        jsonLdErrors.push(error instanceof Error ? error.message : String(error));
      }
    }

    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const controlName = (element) => {
      const ariaLabel = element.getAttribute('aria-label')?.trim();
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      const labelledText = ariaLabelledBy
        ? ariaLabelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() || '')
            .join(' ')
            .trim()
        : '';
      const associatedLabel =
        element.id &&
        [...document.querySelectorAll('label')].find(
          (label) => label.htmlFor === element.id,
        )?.textContent?.trim();
      const wrappedLabel = element.closest('label')?.textContent?.trim();
      const imageAlt = element.querySelector('img[alt]')?.getAttribute('alt')?.trim();
      return (
        ariaLabel ||
        labelledText ||
        associatedLabel ||
        wrappedLabel ||
        element.getAttribute('title')?.trim() ||
        element.getAttribute('placeholder')?.trim() ||
        element.getAttribute('value')?.trim() ||
        imageAlt ||
        element.textContent?.trim() ||
        ''
      );
    };

    const unlabeledControls = [
      ...document.querySelectorAll('button, input, select, textarea, a[href]'),
    ]
      .filter((element) => visible(element) && !controlName(element))
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute('type') || '',
        href: element.getAttribute('href') || '',
        className: element.getAttribute('class') || '',
      }));

    const duplicateIds = Object.entries(
      [...document.querySelectorAll('[id]')].reduce((counts, element) => {
        counts[element.id] = (counts[element.id] || 0) + 1;
        return counts;
      }, {}),
    )
      .filter(([, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));

    const brokenImages = [...document.images]
      .filter((image) => visible(image) && image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);

    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const firstContentfulPaint = paint.find(
      (entry) => entry.name === 'first-contentful-paint',
    )?.startTime;

    return {
      lang: document.documentElement.lang,
      title: document.title,
      description: meta('description'),
      robots: meta('robots'),
      canonical,
      viewport,
      h1Count: document.querySelectorAll('h1').length,
      h1: text('h1'),
      mainCount: document.querySelectorAll('main').length,
      navCount: document.querySelectorAll('nav').length,
      jsonLdCount: jsonLd.length,
      jsonLdTypes,
      jsonLdErrors,
      missingAltCount: document.querySelectorAll('img:not([alt])').length,
      unlabeledControls,
      duplicateIds,
      brokenImages,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      activeElement: document.activeElement?.tagName?.toLowerCase() || '',
      navigation: navigation
        ? {
            responseStart: navigation.responseStart,
            domContentLoaded: navigation.domContentLoadedEventEnd,
            load: navigation.loadEventEnd,
          }
        : null,
      firstContentfulPaint: firstContentfulPaint ?? null,
    };
  });

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('response', onResponse);

  const expectedCanonical = `https://${domain}${pathname}`;
  const expectedIndexable = indexedPaths.includes(pathname);
  const rateLimitedResources = failedResources.filter(
    (resource) => resource.status === 429,
  );
  const brokenAppResources = failedResources.filter(
    (resource) => resource.status !== 429,
  );
  const placeholderPattern = /search_term_string|lorem ipsum|\bundefined\b|\bnull\b/i;
  const failures = [];
  const warnings = [];

  if (response?.status() !== 200) failures.push(`HTTP ${response?.status() || 0}`);
  if (pageData.h1Count !== 1) failures.push(`H1 count ${pageData.h1Count}`);
  if (!pageData.title) failures.push('missing title');
  if (!pageData.description) failures.push('missing description');
  if (pageData.canonical !== expectedCanonical) {
    failures.push(`canonical ${pageData.canonical || '(missing)'}`);
  }
  if (expectedIndexable && !/\bindex\b/i.test(pageData.robots)) {
    failures.push(`indexed sitemap page robots ${pageData.robots || '(missing)'}`);
  }
  if (!expectedIndexable && !/\bnoindex\b/i.test(pageData.robots)) {
    failures.push(`unreviewed page robots ${pageData.robots || '(missing)'}`);
  }
  if (/IndexFinds/i.test(`${pageData.title} ${pageData.description}`)) {
    failures.push('generic IndexFinds metadata');
  }
  if (placeholderPattern.test(`${pageData.title} ${pageData.description} ${pageData.h1}`)) {
    failures.push('placeholder metadata or heading');
  }
  if (!pageData.viewport) failures.push('missing viewport');
  if (!pageData.lang) failures.push('missing document language');
  if (pageData.mainCount !== 1) failures.push(`main landmark count ${pageData.mainCount}`);
  if (pageData.jsonLdErrors.length) failures.push('invalid JSON-LD');
  if (expectedIndexable && !pageData.jsonLdCount) failures.push('missing JSON-LD');
  if (pageData.missingAltCount) failures.push(`${pageData.missingAltCount} images missing alt`);
  if (pageData.unlabeledControls.length) {
    failures.push(`${pageData.unlabeledControls.length} unlabeled controls`);
  }
  if (pageData.duplicateIds.length) failures.push('duplicate element IDs');
  if (pageData.brokenImages.length) failures.push(`${pageData.brokenImages.length} broken images`);
  if (pageData.horizontalOverflow > 2) {
    failures.push(`horizontal overflow ${pageData.horizontalOverflow}px`);
  }
  if (pageData.activeElement === 'body') warnings.push('Tab focus remained on body');
  if (consoleErrors.length) warnings.push(`${consoleErrors.length} console errors`);
  if (pageErrors.length) failures.push(`${pageErrors.length} page errors`);
  if (brokenAppResources.length) {
    failures.push(`${brokenAppResources.length} failed app resources`);
  }
  if (rateLimitedResources.length) {
    warnings.push(`${rateLimitedResources.length} audit-induced API 429 responses`);
  }

  return {
    domain,
    pathname,
    viewport: viewportName,
    expectedIndexable,
    status: response?.status() || 0,
    result: failures.length ? 'fail' : 'pass',
    failures,
    warnings,
    consoleErrors: unique(consoleErrors).slice(0, 8),
    pageErrors: unique(pageErrors).slice(0, 8),
    failedResources: brokenAppResources.slice(0, 12),
    rateLimitedResources: rateLimitedResources.slice(0, 12),
    ...pageData,
  };
}

async function auditTenant(tenant, tenantIndex) {
  const domainResults = [];
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: viewportName === 'mobile' ? 2 : 1,
      isMobile: viewportName === 'mobile',
      hasTouch: viewportName === 'mobile',
      extraHTTPHeaders: { 'x-forwarded-host': tenant.domain },
    });
    const page = await context.newPage();
    const paths =
      viewportName === 'desktop'
        ? unique([...tenant.indexedPaths, ...genericPaths])
        : genericPaths;
    for (const pathname of paths) {
      try {
        domainResults.push(
          await auditPage(
            page,
            tenant.domain,
            pathname,
            viewportName,
            tenant.indexedPaths,
          ),
        );
      } catch (error) {
        domainResults.push({
          domain: tenant.domain,
          pathname,
          viewport: viewportName,
          result: 'fail',
          failures: [error instanceof Error ? error.message : String(error)],
          warnings: [],
        });
      }
    }
    await context.close();
  }
  const failed = domainResults.filter((result) => result.result === 'fail');
  console.log(
    `[${tenantIndex + 1}/${tenants.length}] ${tenant.domain}: ${domainResults.length - failed.length}/${domainResults.length} passed`,
  );
  return {
    domain: tenant.domain,
    result: failed.length ? 'fail' : 'pass',
    pageCount: domainResults.length,
    failedPageCount: failed.length,
    pages: domainResults,
  };
}

const results = await mapLimit(tenants, concurrency, auditTenant);
await browser.close();

const pages = results.flatMap((result) => result.pages);
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  scope: {
    tenantCount: tenants.length,
    desktop: 'all indexed sitemap pages plus four shared deep routes',
    mobile: 'four shared deep routes for every tenant',
    fieldData: false,
    performanceNote:
      'Navigation and FCP values are local laboratory observations, not CrUX field Core Web Vitals or GSC data.',
  },
  tenantCount: tenants.length,
  passedTenantCount: results.filter((result) => result.result === 'pass').length,
  failedTenantCount: results.filter((result) => result.result === 'fail').length,
  pageCount: pages.length,
  passedPageCount: pages.filter((page) => page.result === 'pass').length,
  failedPageCount: pages.filter((page) => page.result === 'fail').length,
  failureCount: pages.reduce((sum, page) => sum + (page.failures?.length || 0), 0),
  warningCount: pages.reduce((sum, page) => sum + (page.warnings?.length || 0), 0),
  results,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify({
    outputPath,
    tenantCount: report.tenantCount,
    pageCount: report.pageCount,
    failedPageCount: report.failedPageCount,
    failureCount: report.failureCount,
    warningCount: report.warningCount,
  }),
);

if (report.failedPageCount) process.exitCode = 1;
