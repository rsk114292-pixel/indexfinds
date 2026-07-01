'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check } from 'lucide-react';

interface ShareCopyLinkProps {
  url: string;
  onCopySuccess?: () => void | Promise<void>;
}

export function ShareCopyLink({ url, onCopySuccess }: ShareCopyLinkProps) {
  const t = useTranslations('share');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      await onCopySuccess?.();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select + execCommand
      inputRef.current?.select();
      document.execCommand('copy');
      await onCopySuccess?.();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-gray-50 p-2">
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={url}
        className="flex-1 min-w-0 truncate bg-transparent text-sm text-muted outline-none"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover shrink-0"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            {t('copied')}
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            {t('copyLink')}
          </>
        )}
      </button>
    </div>
  );
}
