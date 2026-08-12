'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { NOTICE_EVENT, type NoticeDetail, type NoticeTone } from '@/lib/notice';

const TONE_STYLES: Record<NoticeTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

const TONE_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
} satisfies Record<NoticeTone, typeof Info>;

export default function NoticeHost() {
  const [notice, setNotice] = useState<(NoticeDetail & { id: number }) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleNotice = (event: Event) => {
      const detail = (event as CustomEvent<NoticeDetail>).detail;
      if (!detail?.message) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      setNotice({ ...detail, id: Date.now() });
      timerRef.current = setTimeout(() => setNotice(null), 3200);
    };

    window.addEventListener(NOTICE_EVENT, handleNotice);
    return () => {
      window.removeEventListener(NOTICE_EVENT, handleNotice);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!notice) return null;

  const Icon = TONE_ICONS[notice.tone];

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[120] flex justify-center sm:top-6">
      <div
        key={notice.id}
        role={notice.tone === 'error' ? 'alert' : 'status'}
        aria-live={notice.tone === 'error' ? 'assertive' : 'polite'}
        className={`pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${TONE_STYLES[notice.tone]}`}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">{notice.message}</span>
        <button
          type="button"
          onClick={() => setNotice(null)}
          className="-mr-1 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
          aria-label="Close notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
