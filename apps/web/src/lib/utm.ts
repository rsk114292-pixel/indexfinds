/**
 * UTM 追踪工具 — 为分享链接附加 UTM 参数
 */

export type ShareChannel =
  | 'whatsapp'
  | 'telegram'
  | 'twitter'
  | 'reddit'
  | 'email'
  | 'pinterest'
  | 'discord'
  | 'tiktok'
  | 'copy';

export type ShareCampaign =
  | 'product_share'
  | 'referral_invite'
  | 'referral_page_share';

const UTM_CONFIG: Record<ShareChannel, { source: string; medium: string }> = {
  whatsapp: { source: 'whatsapp', medium: 'social' },
  telegram: { source: 'telegram', medium: 'social' },
  twitter: { source: 'twitter', medium: 'social' },
  reddit: { source: 'reddit', medium: 'social' },
  email: { source: 'email', medium: 'email' },
  pinterest: { source: 'pinterest', medium: 'social' },
  discord: { source: 'discord', medium: 'social' },
  tiktok: { source: 'tiktok', medium: 'social' },
  copy: { source: 'copy_link', medium: 'referral' },
};

interface AppendUTMOptions {
  campaign?: ShareCampaign | string;
  source?: string;
  medium?: string;
  content?: string;
}

function isReferralWrappedUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    return url.pathname.startsWith('/r/') || url.searchParams.has('ref');
  } catch {
    return false;
  }
}

function resolveDefaultCampaign(
  baseUrl: string,
  campaign?: ShareCampaign | string,
): ShareCampaign | string {
  if (campaign) return campaign;
  if (isReferralWrappedUrl(baseUrl)) return 'referral_page_share';
  return 'product_share';
}

/**
 * 给 URL 附加 UTM 参数
 */
export function appendUTMParams(
  baseUrl: string,
  channel: ShareChannel,
  options: AppendUTMOptions = {},
): string {
  if (!baseUrl) return baseUrl;
  const url = new URL(baseUrl);
  const config = UTM_CONFIG[channel];
  url.searchParams.set('utm_source', options.source || config.source);
  url.searchParams.set('utm_medium', options.medium || config.medium);
  url.searchParams.set(
    'utm_campaign',
    resolveDefaultCampaign(baseUrl, options.campaign),
  );
  if (options.content) {
    url.searchParams.set('utm_content', options.content);
  }
  return url.toString();
}

export function appendReferralInviteUTMParams(
  baseUrl: string,
  channel?: ShareChannel,
): string {
  if (!baseUrl) return baseUrl;

  if (channel) {
    return appendUTMParams(baseUrl, channel, { campaign: 'referral_invite' });
  }

  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', 'referral_link');
  url.searchParams.set('utm_medium', 'referral');
  url.searchParams.set('utm_campaign', 'referral_invite');
  return url.toString();
}

/**
 * 从 URLSearchParams 中提取 UTM 参数
 */
export function extractUTMParams(searchParams: URLSearchParams): Record<string, string> {
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const result: Record<string, string> = {};
  for (const key of utmKeys) {
    const value = searchParams.get(key);
    if (value) result[key] = value;
  }
  return result;
}
