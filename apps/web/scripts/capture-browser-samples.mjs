import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const baseUrl = option('--base', 'http://127.0.0.1:3191');
const outputDir = option('--output', '../../deploy/indexfinds/hostinger/deep-page-screenshots-20260901');

const samples = [
  { domain: 'acbuyindex.com', pathname: '/en/products', viewport: 'desktop' },
  { domain: 'acbuyindex.com', pathname: '/en/brands/air-jordan', viewport: 'desktop' },
  { domain: 'litbuyindex.com', pathname: '/en/categories/earphones', viewport: 'desktop' },
  { domain: 'itaobuyindex.com', pathname: '/en/site-guide', viewport: 'desktop' },
  { domain: 'usfansindex.net', pathname: '/en/usfans-spreadsheet', viewport: 'desktop' },
  { domain: 'acbuyindex.com', pathname: '/en/products', viewport: 'mobile' },
  { domain: 'acbuyindex.com', pathname: '/en/brands/air-jordan', viewport: 'mobile' },
];

const viewports = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 },
};

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const sample of samples) {
  const context = await browser.newContext({
    viewport: viewports[sample.viewport],
    deviceScaleFactor: sample.viewport === 'mobile' ? 2 : 1,
    isMobile: sample.viewport === 'mobile',
    hasTouch: sample.viewport === 'mobile',
    extraHTTPHeaders: { 'x-forwarded-host': sample.domain },
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}${sample.pathname}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForLoadState('load', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(500);
  const fileName = `${sample.domain}-${sample.viewport}-${sample.pathname
    .replace(/^\//, '')
    .replaceAll('/', '-')}.png`;
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
  console.log(fileName);
  await context.close();
}

await browser.close();
