import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const inputPath = option("--input");
const outputPath = option("--output");
const baseUrl = option("--base-url", "https://indexfinds.com");
const delayMs = Number(option("--delay-ms", "750"));
const requestedViewports = new Set(
  option("--viewports", "desktop,mobile").split(",").map((value) => value.trim()),
);

if (!inputPath || !outputPath) {
  console.error(
    "Usage: node scripts/audit-production-brand-logos.mjs --input broken.csv --output report.json [--base-url URL] [--viewports desktop,mobile] [--delay-ms 750]",
  );
  process.exit(2);
}

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields;
}

function parseCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift());
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

const viewportDefinitions = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, placeholder: ".w-20.h-20.bg-gray-100.rounded-lg" },
  { name: "mobile", viewport: { width: 390, height: 844 }, placeholder: ".w-12.h-12.bg-gray-100.rounded-xl" },
].filter(({ name }) => requestedViewports.has(name));

const brands = parseCsv(await readFile(inputPath, "utf8"));
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const definition of viewportDefinitions) {
    const context = await browser.newContext({ viewport: definition.viewport });
    const page = await context.newPage();
    for (const brand of brands) {
      const brandName = brand.name || brand.brand;
      if (!brandName || !brand.slug) {
        throw new Error("Brand audit input requires a name/brand column and a slug column");
      }
      const url = `${baseUrl}/en/brands/${brand.slug}`;
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      const heading = page.getByRole("heading", {
        name: brandName,
        exact: true,
        level: 2,
      });
      let headingVisible = false;
      try {
        await heading.first().waitFor({ state: "visible", timeout: 10_000 });
        headingVisible = true;
      } catch {
        headingVisible = false;
      }
      await page.waitForTimeout(300);
      const imageState = await page.locator("img").evaluateAll(
        (images, expectedAlt) =>
          images
            .filter((image) => image.getAttribute("alt") === expectedAlt)
            .map((image) => ({
              src: image.currentSrc || image.getAttribute("src") || "",
              complete: image.complete,
              naturalWidth: image.naturalWidth,
            })),
        brandName,
      );
      const placeholderCount = await page.locator(definition.placeholder).count();
      const oldLogoUrl = brand.old_logo_url;
      const oldLogoRequested = imageState.some(({ src }) => {
        if (!oldLogoUrl) return false;
        try {
          return decodeURIComponent(src).includes(oldLogoUrl);
        } catch {
          return src.includes(oldLogoUrl);
        }
      });
      results.push({
        name: brandName,
        slug: brand.slug,
        viewport: definition.name,
        url,
        status: response?.status() || null,
        headingVisible,
        placeholderCount,
        matchingBrandImages: imageState,
        oldLogoRequested,
        passed:
          response?.status() === 200 &&
          headingVisible &&
          placeholderCount === 0 &&
          imageState.length === 0 &&
          !oldLogoRequested,
      });
      await page.waitForTimeout(delayMs);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  brandCount: brands.length,
  viewportCount: viewportDefinitions.length,
  checkCount: results.length,
  passedCount: results.filter(({ passed }) => passed).length,
  failedCount: results.filter(({ passed }) => !passed).length,
  results,
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    generatedAt: report.generatedAt,
    brandCount: report.brandCount,
    checkCount: report.checkCount,
    passedCount: report.passedCount,
    failedCount: report.failedCount,
  }),
);

if (report.failedCount > 0) process.exitCode = 1;
