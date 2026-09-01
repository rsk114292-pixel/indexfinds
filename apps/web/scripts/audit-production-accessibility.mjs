import { readFile, readdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const rawArgs = process.argv.slice(2);
const outputFlag = rawArgs.indexOf("--output");
const outputPath = outputFlag >= 0 ? rawArgs[outputFlag + 1] : null;
const domains = rawArgs.filter(
  (value, index) =>
    (outputFlag < 0 || (index !== outputFlag && index !== outputFlag + 1)) &&
    !value.startsWith("--"),
);

if (!outputPath || domains.length === 0) {
  console.error(
    "Usage: node scripts/audit-production-accessibility.mjs <domain> [...domain] --output report.json",
  );
  process.exit(2);
}

const viewports = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 },
};

const pnpmPackages = await readdir(
  new URL("../node_modules/.pnpm/", import.meta.url),
);
const axePackage = pnpmPackages.find((name) => name.startsWith("axe-core@"));
if (!axePackage) throw new Error("axe-core is missing from the installed lockfile");
const axeSource = await readFile(
  new URL(
    `../node_modules/.pnpm/${axePackage}/node_modules/axe-core/axe.min.js`,
    import.meta.url,
  ),
  "utf8",
);

const browser = await chromium.launch({ headless: true });

async function auditViewport(domain, viewportName, viewport) {
  const page = await browser.newPage({ viewport });
  try {
    const response = await page.goto(`https://${domain}/en`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.addScriptTag({ content: axeSource });
    const accessibility = await page.evaluate(async () =>
      globalThis.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
      }),
    );

    return {
      viewport: viewportName,
      status: response?.status() || null,
      violations: accessibility.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
        })),
      })),
    };
  } catch (error) {
    return {
      viewport: viewportName,
      status: null,
      error: error instanceof Error ? error.message : String(error),
      violations: [],
    };
  } finally {
    await page.close();
  }
}

const results = [];
for (const domain of domains) {
  const viewResults = [];
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    viewResults.push(await auditViewport(domain, viewportName, viewport));
  }
  const violationCount = viewResults.reduce(
    (sum, result) => sum + result.violations.length,
    0,
  );
  const seriousOrCriticalCount = viewResults.reduce(
    (sum, result) =>
      sum +
      result.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact),
      ).length,
    0,
  );
  const requestFailureCount = viewResults.filter(
    (result) => result.status !== 200 || result.error,
  ).length;
  results.push({
    domain,
    result:
      seriousOrCriticalCount === 0 && requestFailureCount === 0
        ? "pass"
        : "fail",
    violationCount,
    seriousOrCriticalCount,
    requestFailureCount,
    views: viewResults,
  });
  console.log(
    `${domain}: ${results.at(-1).result}, violations=${violationCount}, seriousOrCritical=${seriousOrCriticalCount}`,
  );
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  domainCount: results.length,
  viewCount: results.length * Object.keys(viewports).length,
  passedDomainCount: results.filter((result) => result.result === "pass").length,
  failedDomainCount: results.filter((result) => result.result === "fail").length,
  violationCount: results.reduce(
    (sum, result) => sum + result.violationCount,
    0,
  ),
  seriousOrCriticalCount: results.reduce(
    (sum, result) => sum + result.seriousOrCriticalCount,
    0,
  ),
  requestFailureCount: results.reduce(
    (sum, result) => sum + result.requestFailureCount,
    0,
  ),
  results,
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.error(
  JSON.stringify({
    domainCount: report.domainCount,
    viewCount: report.viewCount,
    passedDomainCount: report.passedDomainCount,
    failedDomainCount: report.failedDomainCount,
    violationCount: report.violationCount,
    seriousOrCriticalCount: report.seriousOrCriticalCount,
    requestFailureCount: report.requestFailureCount,
    outputPath,
  }),
);

if (report.failedDomainCount > 0) process.exitCode = 1;
