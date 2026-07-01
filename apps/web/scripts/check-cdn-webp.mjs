#!/usr/bin/env node
/**
 * CDN WebP 支持检测脚本
 *
 * 在构建/启动前运行，检测微店 CDN（腾讯云万象 CI）是否支持 imageView2 WebP 转换。
 * 结果写入 .env.local 的 NEXT_PUBLIC_CDN_WEBP 变量。
 *
 * 用法：node scripts/check-cdn-webp.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = resolve(__dirname, '..', '.env.local');
const ENV_KEY = 'NEXT_PUBLIC_CDN_WEBP';

// 用一张已知存在的微店 CDN 图片测试
const TEST_URL =
  'https://si.geilicdn.com/open1670961141-1234478995-448e000001944464d5a40a8133b5_800_800.jpg?imageView2/2/w/100/h/100/format/webp';

const TIMEOUT_MS = 5000;

function readCurrentEnvValue() {
  if (!existsSync(ENV_FILE)) {
    return null;
  }

  const content = readFileSync(ENV_FILE, 'utf-8');
  const match = content.match(new RegExp(`^${ENV_KEY}=(.*)$`, 'm'));
  return match?.[1] ?? null;
}

async function probe(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

function classifyResponse(res, method) {
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    return {
      result: 'unknown',
      reason: `${method} ${res.status}`,
    };
  }

  if (contentType.includes('image/webp')) {
    return {
      result: 'supported',
      reason: `${method} ${contentType || 'content-type missing'}`,
    };
  }

  if (contentType.startsWith('image/')) {
    return {
      result: 'unsupported',
      reason: `${method} returned ${contentType}`,
    };
  }

  return {
    result: 'unknown',
    reason: `${method} returned unexpected content-type: ${contentType || 'missing'}`,
  };
}

async function checkWebpSupport() {
  const attempts = [
    { method: 'HEAD' },
    {
      method: 'GET',
      headers: {
        Range: 'bytes=0-0',
      },
    },
  ];

  let lastUnknownReason = 'No probe executed';

  for (const attempt of attempts) {
    try {
      const res = await probe(TEST_URL, attempt);
      const classified = classifyResponse(res, attempt.method);

      if (classified.result !== 'unknown') {
        return classified;
      }

      lastUnknownReason = classified.reason;
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      lastUnknownReason = `${attempt.method} failed: ${message}`;
    }
  }

  return {
    result: 'unknown',
    reason: lastUnknownReason,
  };
}

function updateEnvFile(enabled) {
  const value = enabled ? 'true' : 'false';
  let content = '';

  if (existsSync(ENV_FILE)) {
    content = readFileSync(ENV_FILE, 'utf-8');

    // 替换已有的 NEXT_PUBLIC_CDN_WEBP 行
    if (content.includes(ENV_KEY)) {
      content = content.replace(
        new RegExp(`^${ENV_KEY}=.*$`, 'm'),
        `${ENV_KEY}=${value}`,
      );
      writeFileSync(ENV_FILE, content);
      return;
    }
  }

  // 追加新行
  const newLine = content.endsWith('\n') || content === '' ? '' : '\n';
  writeFileSync(ENV_FILE, content + newLine + `${ENV_KEY}=${value}\n`);
}

async function main() {
  console.log('[CDN WebP] 检测微店 CDN imageView2 WebP 支持...');

  const status = await checkWebpSupport();
  const currentValue = readCurrentEnvValue();

  if (status.result === 'supported') {
    console.log('[CDN WebP] ✓ CDN 支持 WebP，启用 imageView2 格式转换');
    updateEnvFile(true);
    console.log(`[CDN WebP] 已写入 ${ENV_FILE}: ${ENV_KEY}=true`);
    return;
  }

  if (status.result === 'unsupported') {
    console.log('[CDN WebP] ✗ CDN 不支持 WebP，降级到 ?w=&h= 模式');
    updateEnvFile(false);
    console.log(`[CDN WebP] 已写入 ${ENV_FILE}: ${ENV_KEY}=false`);
    return;
  }

  const fallbackValue = currentValue ?? 'default(true)';
  console.warn(`[CDN WebP] ! 无法可靠检测 WebP 支持，保留当前配置: ${fallbackValue}`);
  console.warn(`[CDN WebP] ! 原因: ${status.reason}`);
}

main();
