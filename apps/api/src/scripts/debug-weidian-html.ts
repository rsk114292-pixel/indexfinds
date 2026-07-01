/**
 * 调试脚本：获取微店页面 HTML 并分析结构
 *
 * 运行方式：node scripts/diagnostics/debug/debug-weidian-html.js [itemId]
 */

import * as fs from 'fs';
import { runScriptMain } from './lib/script-support';

async function fetchWeidianPage(itemId: string): Promise<string> {
  const url = `https://weidian.com/item.html?itemID=${itemId}`;
  console.log(`抓取页面: ${url}\n`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }

  return response.text();
}

async function analyzeHtml(html: string) {
  console.log('========== HTML 结构分析 ==========\n');
  console.log(`HTML 长度: ${html.length} 字符\n`);

  // 保存完整 HTML 用于手动分析
  fs.writeFileSync('weidian-debug.html', html);
  console.log('完整 HTML 已保存到 weidian-debug.html\n');

  // 1. 检查 __INITIAL_STATE__
  console.log('--- 1. 检查 window.__INITIAL_STATE__ ---');
  const stateMatch = html.match(
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|window\.)/,
  );
  if (stateMatch) {
    console.log('找到 __INITIAL_STATE__');
    try {
      const state = JSON.parse(stateMatch[1]);
      console.log('顶层字段:', Object.keys(state));
      if (state.shop)
        console.log('state.shop:', JSON.stringify(state.shop, null, 2));
      if (state.seller)
        console.log('state.seller:', JSON.stringify(state.seller, null, 2));
      if (state.item)
        console.log('state.item 字段:', Object.keys(state.item || {}));
    } catch (e) {
      console.log(
        'JSON 解析失败，截取前500字符:',
        stateMatch[1].substring(0, 500),
      );
    }
  } else {
    console.log('未找到 __INITIAL_STATE__');
  }

  // 2. 查找包含 shop 的 JSON 对象
  console.log('\n--- 2. 查找 shop 相关 JSON ---');
  const shopPatterns = [
    /"shopId"\s*:\s*"?(\d+)"?/g,
    /"shop_id"\s*:\s*"?(\d+)"?/g,
    /"shopName"\s*:\s*"([^"]+)"/g,
    /"shop_name"\s*:\s*"([^"]+)"/g,
    /shopId['"]\s*:\s*['"]?(\d+)['"]?/g,
    /shopName['"]\s*:\s*['"]([^'"]+)['"]/g,
  ];

  for (const pattern of shopPatterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      console.log(`模式 ${pattern.source}:`);
      matches
        .slice(0, 3)
        .forEach((m) => console.log(`  匹配: ${m[0]} -> 值: ${m[1]}`));
    }
  }

  // 3. 查找 seller 相关内容
  console.log('\n--- 3. 查找 seller 相关内容 ---');
  const sellerPatterns = [
    /"seller"\s*:\s*\{[^}]*\}/g,
    /"sellerInfo"\s*:\s*\{[^}]*\}/g,
    /seller['"]\s*:\s*\{[^}]*\}/g,
  ];

  for (const pattern of sellerPatterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      console.log(`模式 ${pattern.source}:`);
      matches
        .slice(0, 2)
        .forEach((m) => console.log(`  匹配: ${m[0].substring(0, 200)}`));
    }
  }

  // 4. 查找店铺链接
  console.log('\n--- 4. 查找店铺链接 ---');
  const shopLinkPatterns = [
    /weidian\.com\/s\/(\d+)/g,
    /shop\.weidian\.com[^"']*/g,
    /href="[^"]*shop[^"]*"/gi,
  ];

  for (const pattern of shopLinkPatterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      console.log(`模式 ${pattern.source}:`);
      matches.slice(0, 3).forEach((m) => console.log(`  匹配: ${m[0]}`));
    }
  }

  // 5. 查找页面中的 script 标签内容
  console.log('\n--- 5. 查找可能包含店铺信息的 script 标签 ---');
  const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  if (scriptMatches) {
    console.log(`找到 ${scriptMatches.length} 个 script 标签`);
    scriptMatches.forEach((script, i) => {
      if (
        script.includes('shop') ||
        script.includes('seller') ||
        script.includes('Store')
      ) {
        console.log(`\nScript #${i + 1} 包含店铺相关内容 (前500字符):`);
        console.log(script.substring(0, 500));
      }
    });
  }

  // 6. 查找可能的店铺名称模式（中文店铺名）
  console.log('\n--- 6. 查找可能的店铺名称 ---');
  const namePatterns = [
    /店铺[：:]\s*([^<\n]+)/g,
    /店铺名[：:]\s*([^<\n]+)/g,
    /data-shopname="([^"]+)"/g,
    /class="[^"]*shop[^"]*"[^>]*>([^<]+)</gi,
  ];

  for (const pattern of namePatterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      console.log(`模式 ${pattern.source}:`);
      matches.slice(0, 3).forEach((m) => console.log(`  匹配: ${m[1]}`));
    }
  }

  // 7. 查找 window.xxx 变量
  console.log('\n--- 7. 查找 window 全局变量 ---');
  const windowVarPattern = /window\.(\w+)\s*=\s*/g;
  const windowVars = [...html.matchAll(windowVarPattern)];
  if (windowVars.length > 0) {
    console.log(
      '找到的 window 变量:',
      [...new Set(windowVars.map((m) => m[1]))].join(', '),
    );
  }

  // 8. 查找 JSON-LD 结构化数据
  console.log('\n--- 8. 查找 JSON-LD 结构化数据 ---');
  const jsonLdMatch = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  if (jsonLdMatch) {
    console.log('找到 JSON-LD:');
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      console.log(JSON.stringify(jsonLd, null, 2).substring(0, 500));
    } catch {
      console.log(jsonLdMatch[1].substring(0, 300));
    }
  } else {
    console.log('未找到 JSON-LD');
  }
}

async function main() {
  const itemId = process.argv[2] || '7573653453';

  const html = await fetchWeidianPage(itemId);
  await analyzeHtml(html);
}

void runScriptMain('微店 HTML 调试', main);
