'use client';

import { useTranslations } from 'next-intl';
import { Check, Mail } from 'lucide-react';
import { SocialIcon } from '@/lib/social-icons';
import { appendUTMParams } from '@/lib/utm';
import { SHARE_CHANNELS, buildShareUrl, type ChannelConfig } from './share-channels';
import { notice } from '@/lib/notice';

interface ShareChannelGridProps {
  url: string;
  title: string;
  imageUrl?: string;
  campaign?: string;
  claimedChannels?: string[];
  onShareSuccess?: (channelId: string) => void | Promise<void>;
}

export function ShareChannelGrid({
  url,
  title,
  imageUrl,
  campaign,
  claimedChannels = [],
  onShareSuccess,
}: ShareChannelGridProps) {
  const t = useTranslations('share');
  const claimedSet = new Set(claimedChannels);

  const handleChannelClick = async (channel: ChannelConfig) => {
    const isClaimed = claimedSet.has(channel.id);
    const trackedUrl = appendUTMParams(
      url,
      channel.id,
      campaign ? { campaign } : undefined,
    );

    if (channel.action === 'copy') {
      try {
        await navigator.clipboard.writeText(trackedUrl);
        notice.success(t(channel.copyToastKey || 'copied'));
        if (!isClaimed) {
          onShareSuccess?.(channel.id);
        }
      } catch {
        notice.error(t('copyFailed'));
      }
      return;
    }

    // external action
    const shareUrl = buildShareUrl(channel.id, trackedUrl, title, imageUrl);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    if (!isClaimed) {
      onShareSuccess?.(channel.id);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {SHARE_CHANNELS.map((channel) => {
        const isClaimed = claimedSet.has(channel.id);

        return (
          <button
            key={channel.id}
            type="button"
            onClick={() => handleChannelClick(channel)}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="relative">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform group-active:scale-95 ${
                  isClaimed ? 'opacity-45 grayscale' : 'group-hover:scale-110'
                }`}
                style={{ backgroundColor: channel.color }}
              >
                {channel.iconType === 'lucide' ? (
                  <Mail className="h-5 w-5 text-white" />
                ) : (
                  <SocialIcon name={channel.iconName} className="h-5 w-5 text-white" />
                )}
              </div>
              {isClaimed ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-500 text-white shadow-sm">
                  <Check className="h-3 w-3" />
                </span>
              ) : null}
            </div>
            <span
              className={`text-xs transition-colors ${
                isClaimed ? 'text-emerald-600' : 'text-muted group-hover:text-foreground'
              }`}
            >
              {t(channel.labelKey)}
            </span>
            {isClaimed ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
                {t('claimed')}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
