import {
  FALLBACK_PLATFORMS,
  getLocalizedPlatformName,
  getLocalizedPlatformDescription,
  type Platform,
} from './usePlatformStore';
import { AGENT_PLATFORMS } from '@/lib/agent-platforms';

function createPlatform(overrides: Partial<Platform> = {}): Platform {
  return {
    id: 'p1',
    key: 'loongbuy',
    name: 'Loongbuy',
    description: 'Loongbuy 代购平台',
    translations: null,
    isActive: true,
    ...overrides,
  };
}

describe('usePlatformStore i18n helpers', () => {
  it('为 API 或 CORS 故障提供完整的本地代理目录', () => {
    expect(FALLBACK_PLATFORMS).toHaveLength(35);
    expect(FALLBACK_PLATFORMS.map((platform) => platform.key)).toEqual(
      AGENT_PLATFORMS.map((platform) => platform.key),
    );
    expect(new Set(FALLBACK_PLATFORMS.map((platform) => platform.id)).size).toBe(
      FALLBACK_PLATFORMS.length,
    );
    expect(FALLBACK_PLATFORMS.every((platform) => platform.isActive)).toBe(true);
  });

  it('优先返回当前 locale 的名称翻译', () => {
    const platform = createPlatform({
      translations: {
        fr: { name: 'Loongbuy FR' },
        en: { name: 'Loongbuy EN' },
      },
    });

    expect(getLocalizedPlatformName(platform, 'fr')).toBe('Loongbuy FR');
  });

  it('支持 locale 区域回退（en-US -> en）', () => {
    const platform = createPlatform({
      translations: {
        en: { name: 'Loongbuy EN', description: 'Loongbuy proxy purchase platform' },
      },
    });

    expect(getLocalizedPlatformName(platform, 'en-US')).toBe('Loongbuy EN');
    expect(getLocalizedPlatformDescription(platform, 'en-US')).toBe(
      'Loongbuy proxy purchase platform',
    );
  });

  it('非中文语言缺少翻译时回退到 en', () => {
    const platform = createPlatform({
      translations: {
        en: { description: 'Loongbuy proxy purchase platform' },
        zh: { description: 'Loongbuy 代购平台（中文）' },
      },
    });

    expect(getLocalizedPlatformDescription(platform, 'de')).toBe(
      'Loongbuy proxy purchase platform',
    );
  });

  it('中文语言缺少翻译时优先回退到 zh', () => {
    const platform = createPlatform({
      translations: {
        zh: { description: 'Loongbuy 中文描述' },
        en: { description: 'Loongbuy EN description' },
      },
    });

    expect(getLocalizedPlatformDescription(platform, 'zh')).toBe(
      'Loongbuy 中文描述',
    );
  });

  it('翻译不存在时回退到旧字段 name/description', () => {
    const platform = createPlatform({
      translations: {},
      name: 'Legacy Name',
      description: 'Legacy Description',
    });

    expect(getLocalizedPlatformName(platform, 'it')).toBe('Legacy Name');
    expect(getLocalizedPlatformDescription(platform, 'it')).toBe(
      'Legacy Description',
    );
  });

  it('描述在翻译和旧字段都不存在时返回 undefined', () => {
    const platform = createPlatform({
      description: undefined,
      translations: null,
    });

    expect(getLocalizedPlatformDescription(platform, 'en')).toBeUndefined();
  });
});
