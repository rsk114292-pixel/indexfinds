'use client';

import { useState, useEffect } from 'react';
import { App } from 'antd';
import { Copy, Gift } from 'lucide-react';
import { Spinner } from '@/components/ui';
import {
  generateTrackedShareUrl,
  copyToClipboard,
} from '@/lib/referral';
import { useAuthStore } from '@/stores/useAuthStore';
import { get } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface ReferralData {
  code: string;
  shareUrl: string;
  totalClicks: number;
  totalConversions: number;
}

export default function ReferralCard() {
  const { message } = App.useApp();
  const { token } = useAuthStore();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations('account');


  useEffect(() => {
    const fetchReferralCode = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await get<ReferralData>('/referral/my-code');
        setData(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchReferralCode();
  }, [token]);

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    message[success ? 'success' : 'error'](success ? t('copied') : t('copyFailed'));
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-primary" aria-hidden="true" />
          <h3 className="text-base font-semibold text-foreground">{t('yourReferralCode')}</h3>
        </div>
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-primary" aria-hidden="true" />
          <h3 className="text-base font-semibold text-foreground">{t('yourReferralCode')}</h3>
        </div>
        <p className="text-gray-500 text-center">{t('loginForReferral')}</p>
      </div>
    );
  }

  const fullShareUrl = generateTrackedShareUrl(data.code);
  return (
    <div className="bg-surface rounded-lg border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-primary" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">{t('yourReferralCode')}</h3>
      </div>

      {/* Referral code display */}
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-primary tracking-widest mb-2">
          {data.code}
        </div>
        <button
          type="button"
          onClick={() => handleCopy(data.code)}
          aria-label={t('copyReferralCode')}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 text-sm
                     bg-primary text-white rounded-md
                     cursor-pointer transition-colors duration-200
                     hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <Copy className="w-4 h-4" aria-hidden="true" />
          <span>{t('copyCode')}</span>
        </button>
      </div>

      {/* Share URL input with copy button */}
      <div className="flex mb-4">
        <input
          type="text"
          value={fullShareUrl}
          readOnly
          aria-label={t('referralShareUrl')}
          className="flex-1 min-h-[44px] px-3 text-sm bg-gray-50 border border-border rounded-l-md rtl:rounded-r-md rtl:rounded-l-none
                     text-foreground focus:outline-none"
        />
        <button
          type="button"
          onClick={() => handleCopy(fullShareUrl)}
          aria-label={t('copyShareUrl')}
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3
                     bg-primary text-white border border-primary rounded-r-md rtl:rounded-l-md rtl:rounded-r-none
                     cursor-pointer transition-colors duration-200
                     hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <Copy className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{data.totalClicks}</div>
          <div className="text-xs text-muted mt-1">{t('totalClicks')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{data.totalConversions}</div>
          <div className="text-xs text-muted mt-1">{t('conversions')}</div>
        </div>
      </div>
    </div>
  );
}
