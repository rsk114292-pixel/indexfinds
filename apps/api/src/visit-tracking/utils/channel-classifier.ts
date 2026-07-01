import { ChannelType } from '../enums/channel-type.enum';
import { getDomainKind } from './traffic-source';

const SEARCH_ENGINES = [
  'google.com',
  'google.co.uk',
  'google.de',
  'google.fr',
  'google.es',
  'google.it',
  'google.pt',
  'google.co.jp',
  'google.com.br',
  'google.ca',
  'google.com.au',
  'google.co.in',
  'google.co.kr',
  'google.ru',
  'bing.com',
  'yahoo.com',
  'search.yahoo.com',
  'duckduckgo.com',
  'yandex.ru',
  'yandex.com',
  'ecosia.org',
  'brave.com',
  'baidu.com',
  'sogou.com',
  'so.com',
  'sm.cn',
  'naver.com',
  'daum.net',
];

const SOCIAL_PLATFORMS = [
  'facebook.com',
  'fb.com',
  'l.facebook.com',
  'twitter.com',
  'x.com',
  't.co',
  'reddit.com',
  'old.reddit.com',
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'l.instagram.com',
  'tiktok.com',
  'pinterest.com',
  'linkedin.com',
  'lnkd.in',
  'discord.com',
  'discord.gg',
  'tumblr.com',
  'threads.net',
  'weibo.com',
  'weibo.cn',
  'zhihu.com',
  'douyin.com',
  'bilibili.com',
  'b23.tv',
  'xiaohongshu.com',
  'xhslink.com',
  'wechat.com',
  'weixin.qq.com',
  'telegram.org',
  't.me',
  'wa.me',
];

function matchesList(domain: string, list: string[]): boolean {
  const normalized = domain.toLowerCase();
  return list.some(
    (item) => normalized === item || normalized.endsWith('.' + item),
  );
}

interface ClassifyInput {
  utmSource?: string;
  utmMedium?: string;
  referrerDomain?: string;
}

/**
 * 渠道自动分类
 *
 * 优先级: UTM medium > UTM source > Referrer domain > Direct
 */
export function classifyChannel(input: ClassifyInput): ChannelType {
  const { utmMedium, utmSource, referrerDomain } = input;
  const medium = utmMedium?.toLowerCase();
  const source = utmSource?.toLowerCase();
  const sourceKind = getDomainKind(source);
  const referrerKind = getDomainKind(referrerDomain);

  // 1. 有 utm_medium → 根据 medium 值分类
  if (medium) {
    if (sourceKind === 'internal') {
      return ChannelType.INTERNAL;
    }
    if (sourceKind === 'owned') {
      return ChannelType.OWNED_REFERRAL;
    }
    if (medium === 'paid_social' || medium === 'paidsocial') {
      return ChannelType.SOCIAL_PAID;
    }
    if (['cpc', 'ppc', 'paid_search', 'paidsearch'].includes(medium)) {
      // cpc/ppc 可能是社交平台付费广告
      if (source && matchesList(source, SOCIAL_PLATFORMS)) {
        return ChannelType.SOCIAL_PAID;
      }
      return ChannelType.PAID_SEARCH;
    }
    if (medium === 'email' || medium === 'e-mail') {
      return ChannelType.EMAIL;
    }
    if (medium === 'affiliate') {
      return ChannelType.AFFILIATE;
    }
    if (medium === 'social' || medium === 'social-media') {
      return ChannelType.SOCIAL_ORGANIC;
    }
    if (medium === 'organic') {
      return ChannelType.ORGANIC_SEARCH;
    }
    if (medium === 'referral') {
      return ChannelType.REFERRAL;
    }
  }

  // 2. 有 utm_source 但无 utm_medium → 根据 source 推断
  if (source && !medium) {
    if (sourceKind === 'internal') {
      return ChannelType.INTERNAL;
    }
    if (sourceKind === 'owned') {
      return ChannelType.OWNED_REFERRAL;
    }
    if (matchesList(source, SEARCH_ENGINES)) {
      return ChannelType.ORGANIC_SEARCH;
    }
    if (matchesList(source, SOCIAL_PLATFORMS)) {
      return ChannelType.SOCIAL_ORGANIC;
    }
    return ChannelType.REFERRAL;
  }

  // 3. 无 UTM，有 referrer → 根据域名分类
  if (referrerDomain) {
    if (referrerKind === 'internal') {
      return ChannelType.INTERNAL;
    }
    if (referrerKind === 'owned') {
      return ChannelType.OWNED_REFERRAL;
    }
    if (matchesList(referrerDomain, SEARCH_ENGINES)) {
      return ChannelType.ORGANIC_SEARCH;
    }
    if (matchesList(referrerDomain, SOCIAL_PLATFORMS)) {
      return ChannelType.SOCIAL_ORGANIC;
    }
    return ChannelType.REFERRAL;
  }

  // 4. 无 UTM，无 referrer → Direct
  return ChannelType.DIRECT;
}
