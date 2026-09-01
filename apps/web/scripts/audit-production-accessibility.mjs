import { readFile, readdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const rawArgs = process.argv.slice(2);
const outputFlag = rawArgs.indexOf("--output");
const outputPath = outputFlag >= 0 ? rawArgs[outputFlag + 1] : null;
const localPortFlag = rawArgs.indexOf("--local-port");
const localPort = localPortFlag >= 0 ? rawArgs[localPortFlag + 1] : null;
const deepReportFlag = rawArgs.indexOf("--deep-report");
const deepReportPath =
  deepReportFlag >= 0 ? rawArgs[deepReportFlag + 1] : null;
const optionIndexes = new Set();
for (const flagIndex of [outputFlag, localPortFlag, deepReportFlag]) {
  if (flagIndex >= 0) {
    optionIndexes.add(flagIndex);
    optionIndexes.add(flagIndex + 1);
  }
}
const domains = rawArgs.filter(
  (value, index) => !optionIndexes.has(index) && !value.startsWith("--"),
);

if (!outputPath || (domains.length === 0 && !deepReportPath)) {
  console.error(
    "Usage: node scripts/audit-production-accessibility.mjs <domain> [...domain] [--deep-report seo-report.json] [--local-port 3191] --output report.json",
  );
  process.exit(2);
}

const targets = deepReportPath
  ? JSON.parse(await readFile(deepReportPath, "utf8")).results.flatMap(
      (result) =>
        [...(result.pages || []), ...(result.deepPages || [])].map(
          (page) => page.url,
        ),
    )
  : domains;

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

async function auditViewport(target, viewportName, viewport) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  try {
    const sourceUrl = target.startsWith("http")
      ? new URL(target)
      : new URL(`https://${target}/en`);
    const origin = localPort
      ? `http://${sourceUrl.hostname}.localhost:${localPort}`
      : sourceUrl.origin;
    const response = await page.goto(
      `${origin}${sourceUrl.pathname}${sourceUrl.search}`,
      {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      },
    );
    await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
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
for (const target of targets) {
  const sourceUrl = target.startsWith("http")
    ? new URL(target)
    : new URL(`https://${target}/en`);
  const viewResults = [];
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    viewResults.push(await auditViewport(target, viewportName, viewport));
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
    domain: sourceUrl.hostname,
    target: sourceUrl.href,
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
    `${sourceUrl.hostname}${sourceUrl.pathname}: ${results.at(-1).result}, violations=${violationCount}, seriousOrCritical=${seriousOrCriticalCount}`,
  );
}

await browser.close();

const domainCount = new Set(results.map((result) => result.domain)).size;
const failedDomains = new Set(
  results
    .filter((result) => result.result === "fail")
    .map((result) => result.domain),
);
const report = {
  generatedAt: new Date().toISOString(),
  domainCount,
  targetCount: results.length,
  viewCount: results.length * Object.keys(viewports).length,
  passedDomainCount: domainCount - failedDomains.size,
  failedDomainCount: failedDomains.size,
  passedTargetCount: results.filter((result) => result.result === "pass").length,
  failedTargetCount: results.filter((result) => result.result === "fail").length,
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
    targetCount: report.targetCount,
    viewCount: report.viewCount,
    passedDomainCount: report.passedDomainCount,
    failedDomainCount: report.failedDomainCount,
    passedTargetCount: report.passedTargetCount,
    failedTargetCount: report.failedTargetCount,
    violationCount: report.violationCount,
    seriousOrCriticalCount: report.seriousOrCriticalCount,
    requestFailureCount: report.requestFailureCount,
    outputPath,
  }),
);

if (report.failedTargetCount > 0) process.exitCode = 1;
