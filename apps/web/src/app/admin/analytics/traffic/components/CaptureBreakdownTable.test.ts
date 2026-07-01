import { formatBreakdownValue } from './CaptureBreakdownTable';

describe('formatBreakdownValue', () => {
  it('maps browser context values to operator-friendly Chinese labels', () => {
    expect(formatBreakdownValue('browserContext', 'telegram_webview')).toBe(
      'Telegram 内置浏览器',
    );
    expect(formatBreakdownValue('browserContext', 'standard_browser')).toBe(
      '普通浏览器',
    );
  });

  it('maps device types to Chinese labels', () => {
    expect(formatBreakdownValue('deviceType', 'mobile')).toBe('手机');
    expect(formatBreakdownValue('deviceType', 'desktop')).toBe('桌面');
  });

  it('falls back to the raw value when no mapping is needed', () => {
    expect(formatBreakdownValue('source', 'referral_link')).toBe('推荐短链');
    expect(formatBreakdownValue('source', 'telegram')).toBe('Telegram');
    expect(formatBreakdownValue('browserContext', 'wechat_webview')).toBe(
      '微信内置浏览器',
    );
  });
});
