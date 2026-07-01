'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, ChevronDown } from 'lucide-react';

interface ShareQRCodeProps {
  url: string;
}

export function ShareQRCode({ url }: ShareQRCodeProps) {
  const t = useTranslations('share');
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-center gap-2 py-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        <QrCode className="h-4 w-4" />
        {t('showQrCode')}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="flex flex-col items-center gap-2 pb-4">
          <div className="rounded-xl border border-border bg-white p-4">
            <QRCodeSVG value={url} size={160} level="M" />
          </div>
          <p className="text-xs text-muted">{t('scanToShare')}</p>
        </div>
      )}
    </div>
  );
}
