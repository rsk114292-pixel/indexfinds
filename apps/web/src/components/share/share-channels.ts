/**
 * 分享渠道配置数据
 */
import type { ShareChannel } from '@/lib/utm';

export interface ChannelConfig {
  id: ShareChannel;
  /** i18n key under "share" namespace */
  labelKey: string;
  /** 图标来源: 'social' = SocialIcon, 'lucide' = lucide-react */
  iconType: 'social' | 'lucide';
  /** SocialIcon name or lucide icon name */
  iconName: string;
  /** 背景色 */
  color: string;
  /** 'external' = 打开外部链接, 'copy' = 复制链接并提示 */
  action: 'external' | 'copy';
  /** 复制链接后的提示 i18n key */
  copyToastKey?: string;
}

export const SHARE_CHANNELS: ChannelConfig[] = [
  {
    id: 'whatsapp',
    labelKey: 'whatsapp',
    iconType: 'social',
    iconName: 'whatsapp',
    color: '#25D366',
    action: 'external',
  },
  {
    id: 'telegram',
    labelKey: 'telegram',
    iconType: 'social',
    iconName: 'telegram',
    color: '#26A5E4',
    action: 'external',
  },
  {
    id: 'twitter',
    labelKey: 'twitter',
    iconType: 'social',
    iconName: 'twitter',
    color: '#000000',
    action: 'external',
  },
  {
    id: 'reddit',
    labelKey: 'reddit',
    iconType: 'social',
    iconName: 'reddit',
    color: '#FF4500',
    action: 'external',
  },
  {
    id: 'email',
    labelKey: 'email',
    iconType: 'lucide',
    iconName: 'mail',
    color: '#6B7280',
    action: 'external',
  },
  {
    id: 'pinterest',
    labelKey: 'pinterest',
    iconType: 'social',
    iconName: 'pinterest',
    color: '#E60023',
    action: 'external',
  },
  {
    id: 'discord',
    labelKey: 'discord',
    iconType: 'social',
    iconName: 'discord',
    color: '#5865F2',
    action: 'copy',
    copyToastKey: 'copiedForDiscord',
  },
  {
    id: 'tiktok',
    labelKey: 'tiktok',
    iconType: 'social',
    iconName: 'tiktok',
    color: '#000000',
    action: 'copy',
    copyToastKey: 'copiedForTiktok',
  },
];

/**
 * 构建渠道外部分享 URL
 */
export function buildShareUrl(
  channelId: ShareChannel,
  url: string,
  title: string,
  imageUrl?: string,
): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  switch (channelId) {
    case 'whatsapp':
      return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    case 'reddit':
      return `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
    case 'email':
      return `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
    case 'pinterest':
      return `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}${imageUrl ? `&media=${encodeURIComponent(imageUrl)}` : ''}`;
    default:
      return url;
  }
}
