import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import {
  getSiteName,
  getSiteUrl,
  getContactEmail,
  getPrivacyEmail,
  getLegalEmail,
} from '@/lib/site-config';

/**
 * 预处理 i18n 消息：将站点占位符替换为实际值。
 * next-intl 4.x 不支持 getRequestConfig 的 defaultTranslationValues，
 * 因此在加载消息时直接替换 {siteName} 等占位符。
 */
function injectSiteValues(messages: Record<string, unknown>): Record<string, unknown> {
  const replacements: Record<string, string> = {
    '{siteName}': getSiteName(),
    '{siteUrl}': getSiteUrl(),
    '{contactEmail}': getContactEmail(),
    '{privacyEmail}': getPrivacyEmail(),
    '{legalEmail}': getLegalEmail(),
  };
  const pattern = /\{(siteName|siteUrl|contactEmail|privacyEmail|legalEmail)\}/g;
  return JSON.parse(
    JSON.stringify(messages).replace(pattern, (match) => replacements[match] || match),
  );
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming locale is supported
  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    locale = routing.defaultLocale;
  }

  const raw = (await import(`./messages/${locale}.json`)).default;

  return {
    locale,
    messages: injectSiteValues(raw),
  };
});
