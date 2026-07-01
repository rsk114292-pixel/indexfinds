import { lookup } from 'node:dns/promises';
import * as https from 'node:https';
import { URL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { runScriptMain } from './lib/script-support';

type FamilyOption = 'auto' | 4 | 6;

type ProbeTarget = {
  key: string;
  url: string;
  method: 'GET' | 'HEAD';
};

type ProbeSuccess = {
  ok: true;
  target: string;
  attempt: number;
  startedAt: string;
  url: string;
  method: string;
  requestedFamily: FamilyOption;
  selectedAddress: string | null;
  selectedFamily: number | null;
  statusCode: number;
  connectMs: number | null;
  tlsMs: number | null;
  totalMs: number;
};

type ProbeFailure = {
  ok: false;
  target: string;
  attempt: number;
  startedAt: string;
  url: string;
  method: string;
  requestedFamily: FamilyOption;
  selectedAddress: string | null;
  selectedFamily: number | null;
  errorCode: string;
  errorMessage: string;
  connectMs: number | null;
  tlsMs: number | null;
  totalMs: number;
};

type ProbeResult = ProbeSuccess | ProbeFailure;

const DEFAULT_ATTEMPTS = 5;
const DEFAULT_INTERVAL_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 10_000;

const TARGETS: ProbeTarget[] = [
  {
    key: 'oauth2-token',
    url: 'https://oauth2.googleapis.com/token',
    method: 'HEAD',
  },
  {
    key: 'accounts-openid-config',
    url: 'https://accounts.google.com/.well-known/openid-configuration',
    method: 'GET',
  },
];

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv: string[]) {
  const options = {
    attempts: DEFAULT_ATTEMPTS,
    intervalMs: DEFAULT_INTERVAL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    family: 'auto' as FamilyOption,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--attempts') {
      options.attempts = parsePositiveInt(next, options.attempts);
      i += 1;
      continue;
    }
    if (arg === '--interval-ms') {
      options.intervalMs = parsePositiveInt(next, options.intervalMs);
      i += 1;
      continue;
    }
    if (arg === '--timeout-ms') {
      options.timeoutMs = parsePositiveInt(next, options.timeoutMs);
      i += 1;
      continue;
    }
    if (arg === '--family') {
      if (next === '4') options.family = 4;
      else if (next === '6') options.family = 6;
      else options.family = 'auto';
      i += 1;
    }
  }

  return options;
}

async function logDnsResolution(targets: ProbeTarget[]): Promise<void> {
  console.log('=== DNS Resolution ===');
  for (const target of targets) {
    const hostname = new URL(target.url).hostname;
    try {
      const records = await lookup(hostname, { all: true });
      const formatted =
        records.map((record) => `${record.address} (IPv${record.family})`).join(', ') ||
        '(no records)';
      console.log(`${hostname}: ${formatted}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`${hostname}: DNS lookup failed - ${message}`);
    }
  }
  console.log('');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runProbe(
  target: ProbeTarget,
  attempt: number,
  family: FamilyOption,
  timeoutMs: number,
): Promise<ProbeResult> {
  const startedAt = new Date().toISOString();
  const startedAtMs = performance.now();
  const url = new URL(target.url);
  let selectedAddress: string | null = null;
  let selectedFamily: number | null = null;
  let connectMs: number | null = null;
  let tlsMs: number | null = null;

  return new Promise<ProbeResult>((resolve) => {
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: target.method,
        family: family === 'auto' ? undefined : family,
      },
      (response) => {
        response.resume();
        response.on('end', () => {
          resolve({
            ok: true,
            target: target.key,
            attempt,
            startedAt,
            url: target.url,
            method: target.method,
            requestedFamily: family,
            selectedAddress,
            selectedFamily,
            statusCode: response.statusCode ?? 0,
            connectMs,
            tlsMs,
            totalMs: Number((performance.now() - startedAtMs).toFixed(1)),
          });
        });
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(Object.assign(new Error('Request timed out'), { code: 'TIMEOUT' }));
    });

    request.on('socket', (socket) => {
      socket.once('lookup', (_err, address, familyValue) => {
        if (address) {
          selectedAddress = address;
          if (familyValue === 4 || familyValue === 6) {
            selectedFamily = familyValue;
          } else if (familyValue === 'IPv6') {
            selectedFamily = 6;
          } else if (familyValue === 'IPv4') {
            selectedFamily = 4;
          }
        }
      });

      socket.once('connect', () => {
        connectMs = Number((performance.now() - startedAtMs).toFixed(1));
        selectedAddress ||= socket.remoteAddress ?? null;
        selectedFamily ||= socket.remoteFamily === 'IPv6' ? 6 : 4;
      });

      socket.once('secureConnect', () => {
        tlsMs = Number((performance.now() - startedAtMs).toFixed(1));
      });
    });

    request.on('error', (error: NodeJS.ErrnoException) => {
      resolve({
        ok: false,
        target: target.key,
        attempt,
        startedAt,
        url: target.url,
        method: target.method,
        requestedFamily: family,
        selectedAddress,
        selectedFamily,
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message,
        connectMs,
        tlsMs,
        totalMs: Number((performance.now() - startedAtMs).toFixed(1)),
      });
    });

    request.end();
  });
}

function printResult(result: ProbeResult): void {
  if (result.ok) {
    console.log(
      [
        `[OK] ${result.target}#${result.attempt}`,
        `status=${result.statusCode}`,
        `family=${result.selectedFamily ?? 'n/a'}`,
        `addr=${result.selectedAddress ?? 'n/a'}`,
        `connect=${result.connectMs ?? 'n/a'}ms`,
        `tls=${result.tlsMs ?? 'n/a'}ms`,
        `total=${result.totalMs}ms`,
      ].join(' '),
    );
    return;
  }

  console.log(
    [
      `[FAIL] ${result.target}#${result.attempt}`,
      `code=${result.errorCode}`,
      `family=${result.selectedFamily ?? 'n/a'}`,
      `addr=${result.selectedAddress ?? 'n/a'}`,
      `connect=${result.connectMs ?? 'n/a'}ms`,
      `tls=${result.tlsMs ?? 'n/a'}ms`,
      `total=${result.totalMs}ms`,
      `message="${result.errorMessage}"`,
    ].join(' '),
  );
}

function printSummary(results: ProbeResult[]): boolean {
  const grouped = new Map<string, ProbeResult[]>();
  for (const result of results) {
    const existing = grouped.get(result.target) ?? [];
    existing.push(result);
    grouped.set(result.target, existing);
  }

  console.log('\n=== Summary ===');
  let hasFailure = false;

  for (const [target, targetResults] of grouped) {
    const successes = targetResults.filter(
      (result): result is ProbeSuccess => result.ok,
    );
    const failures = targetResults.filter(
      (result): result is ProbeFailure => !result.ok,
    );
    hasFailure ||= failures.length > 0;
    const averageTotalMs =
      successes.length > 0
        ? Number(
            (
              successes.reduce((sum, result) => sum + result.totalMs, 0) /
              successes.length
            ).toFixed(1),
          )
        : null;

    console.log(
      [
        `${target}:`,
        `success=${successes.length}/${targetResults.length}`,
        `failures=${failures.length}`,
        `avgTotal=${averageTotalMs ?? 'n/a'}ms`,
      ].join(' '),
    );

    if (failures.length > 0) {
      const codes = new Map<string, number>();
      for (const failure of failures) {
        codes.set(failure.errorCode, (codes.get(failure.errorCode) ?? 0) + 1);
      }
      const formattedCodes = [...codes.entries()]
        .map(([code, count]) => `${code}=${count}`)
        .join(', ');
      console.log(`  failureCodes: ${formattedCodes}`);
    }
  }

  return hasFailure;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('=== Google OAuth Connectivity Probe ===');
  console.log(`attempts=${options.attempts}`);
  console.log(`intervalMs=${options.intervalMs}`);
  console.log(`timeoutMs=${options.timeoutMs}`);
  console.log(`family=${options.family}`);
  console.log('');

  await logDnsResolution(TARGETS);

  const results: ProbeResult[] = [];

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    console.log(`=== Attempt ${attempt}/${options.attempts} ===`);
    for (const target of TARGETS) {
      const result = await runProbe(
        target,
        attempt,
        options.family,
        options.timeoutMs,
      );
      results.push(result);
      printResult(result);
    }

    if (attempt < options.attempts) {
      console.log('');
      await sleep(options.intervalMs);
    }
  }

  const hasFailure = printSummary(results);
  if (hasFailure) {
    process.exitCode = 1;
  }
}

void runScriptMain('Google OAuth 连通性探测', main);
