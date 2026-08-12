'use client';

import { useTranslations } from 'next-intl';
import { Share2 } from 'lucide-react';
import useSWR from 'swr';
import { useLgUp } from '@/hooks/useLgUp';
import { MobileSheet } from '@/components/mobile/ui/MobileSheet';
import { ShareChannelGrid } from './ShareChannelGrid';
import { ShareCopyLink } from './ShareCopyLink';
import { ShareQRCode } from './ShareQRCode';
import { appendUTMParams, type ShareCampaign } from '@/lib/utm';
import ShareRewardsHint from '@/components/rewards/ShareRewardsHint';
import { useShareUrl } from '@/hooks/useShareUrl';
import { fetcher } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { Dialog } from '@/components/ui/Dialog';

interface ShareRewardStatus {
  claimedChannels: string[];
  dailyCount: number;
  dailyLimit: number;
}

export interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  description?: string;
  imageUrl?: string;
  campaign?: ShareCampaign;
  onShareSuccess?: (channelId: string) => void | Promise<void>;
}

export function ShareModal({
  open,
  onClose,
  title,
  url,
  imageUrl,
  campaign,
  onShareSuccess,
}: ShareModalProps) {
  const t = useTranslations('share');
  const lgUp = useLgUp();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const referralAwareUrl = useShareUrl(url);
  const effectiveUrl =
    referralAwareUrl || url || (typeof window !== 'undefined' ? window.location.href : '');
  const copyUrl = effectiveUrl
    ? appendUTMParams(effectiveUrl, 'copy', campaign ? { campaign } : undefined)
    : '';
  const { data: shareStatus, mutate: mutateShareStatus } = useSWR<ShareRewardStatus>(
    open && isAuthenticated ? '/points/share-status' : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const handleRewardableShareSuccess = async (channelId: string) => {
    await onShareSuccess?.(channelId);
    if (isAuthenticated) {
      await mutateShareStatus();
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, url: copyUrl });
      await onShareSuccess?.('native_share');
    } catch {
      // user cancelled
    }
  };

  const content = (
    <div className="space-y-6">
      <ShareRewardsHint />

      {/* 渠道网格 */}
      <ShareChannelGrid
        url={effectiveUrl}
        title={title}
        imageUrl={imageUrl}
        campaign={campaign}
        claimedChannels={shareStatus?.claimedChannels}
        onShareSuccess={handleRewardableShareSuccess}
      />

      {/* 移动端 "More..." 按钮 → navigator.share */}
      {!lgUp && typeof navigator !== 'undefined' && !!navigator.share && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          {t('moreOptions')}
        </button>
      )}

      {/* 复制链接 */}
      <ShareCopyLink url={copyUrl} onCopySuccess={() => onShareSuccess?.('copy_link')} />

      {/* QR Code */}
      <ShareQRCode url={copyUrl} />
    </div>
  );

  // 桌面端：antd Modal
  if (lgUp) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        title={t('title')}
        panelClassName="max-w-[480px]"
      >
        {content}
      </Dialog>
    );
  }

  // 移动端：MobileSheet
  return (
    <MobileSheet open={open} onClose={onClose} title={t('title')} maxHeight="85vh">
      {content}
    </MobileSheet>
  );
}
