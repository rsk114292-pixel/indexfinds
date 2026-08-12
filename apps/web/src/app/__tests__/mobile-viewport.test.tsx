/**
 * 移动端视口 & 触控防护测试
 *
 * 验证 viewport 配置和 globals.css 中的移动端防护属性：
 * - 禁止缩放（viewport maximumScale + userScalable）
 * - 禁止水平弹性回弹（overscroll-behavior-x）
 * - 禁止水平偏移（overflow-x: hidden/clip）
 * - 触控手势控制（touch-action: manipulation）
 */
import { viewport } from '../layout';
import fs from 'fs';
import path from 'path';

// --- 1. Viewport 配置测试 ---

describe('Viewport configuration', () => {
  it('sets device-width and initial scale', () => {
    expect(viewport.width).toBe('device-width');
    expect(viewport.initialScale).toBe(1);
  });

  it('allows user scaling for accessibility', () => {
    expect(viewport.maximumScale).toBeUndefined();
    expect(viewport.userScalable).toBeUndefined();
  });

  it('uses viewport-fit cover for notched devices', () => {
    expect(viewport.viewportFit).toBe('cover');
  });

  it('sets theme color', () => {
    expect(viewport.themeColor).toBe('#FFFFFF');
  });
});

// --- 2. Global CSS 移动端防护测试 ---

describe('globals.css mobile protections', () => {
  let cssContent: string;

  beforeAll(() => {
    cssContent = fs.readFileSync(
      path.resolve(__dirname, '../globals.css'),
      'utf-8',
    );
  });

  it('sets touch-action: manipulation on html to block pinch zoom (iOS+Android)', () => {
    expect(cssContent).toMatch(/html\s*\{[^}]*touch-action:\s*manipulation/s);
  });

  it('sets overscroll-behavior-x: none on html to prevent horizontal rubber-band bounce', () => {
    expect(cssContent).toMatch(/html\s*\{[^}]*overscroll-behavior-x:\s*none/s);
  });

  it('sets overflow-x: hidden on html to prevent horizontal shift', () => {
    expect(cssContent).toMatch(/html\s*\{[^}]*overflow-x:\s*hidden/s);
  });

  it('sets overscroll-behavior-x: none on body as double guard', () => {
    const bodyBlocks = cssContent.match(/body\s*\{[^}]*\}/gs) || [];
    const hasOverscroll = bodyBlocks.some((block) =>
      /overscroll-behavior-x:\s*none/.test(block),
    );
    expect(hasOverscroll).toBe(true);
  });

  it('sets overflow-x: clip on body as double guard (clip preserves sticky)', () => {
    const bodyBlocks = cssContent.match(/body\s*\{[^}]*\}/gs) || [];
    const hasOverflowX = bodyBlocks.some((block) =>
      /overflow-x:\s*clip/.test(block),
    );
    expect(hasOverflowX).toBe(true);
  });

  it('removes tap highlight for clean touch experience', () => {
    expect(cssContent).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
  });
});
