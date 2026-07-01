'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ChevronDown,
  ChevronUp,
  ImageIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { usePathname, useRouter } from '@/i18n/navigation';
import MobileSubPageHeader from '@/components/mobile/MobileSubPageHeader';
import { useAuthStore } from '@/stores/useAuthStore';
import { fetcher } from '@/lib/api';
import { getWithdrawalMethodLabel } from '@/lib/withdrawal-methods';
import { buildAuthRedirectPath, buildLoginHref } from '@/lib/auth-redirect';

interface Withdrawal {
  id: string;
  amount: number;
  cashAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  paymentMethod: string;
  paymentAccount: string;
  adminNote: string | null;
  proofImage: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50', label: 'withdrawalPending' },
  approved: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'withdrawalApproved' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'withdrawalRejected' },
  cancelled: { icon: Ban, color: 'text-gray-400', bg: 'bg-gray-50', label: 'withdrawalCancelled' },
} as const;

function WithdrawalItem({ item, t, locale }: { item: Withdrawal; t: (key: string) => string; locale: string }) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[item.status];
  const StatusIcon = config.icon;
  const paymentMethodLabel = getWithdrawalMethodLabel(item.paymentMethod, t('legacyPaymentMethod'));

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
            <StatusIcon className={`w-4.5 h-4.5 ${config.color}`} />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-foreground">
              {item.amount} {t('pointsUnit')} → ${item.cashAmount}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {paymentMethodLabel} · {new Date(item.createdAt).toLocaleDateString(locale)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
            {t(config.label)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted">{t('paymentMethod')}</span>
              <span className="text-foreground font-medium">{paymentMethodLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t('paymentAccount')}</span>
              <span className="text-foreground font-medium truncate ml-4 max-w-[200px]">{item.paymentAccount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t('submittedAt')}</span>
              <span className="text-foreground">{new Date(item.createdAt).toLocaleString(locale)}</span>
            </div>
            {item.reviewedAt && (
              <div className="flex justify-between">
                <span className="text-muted">{t('reviewedAt')}</span>
                <span className="text-foreground">{new Date(item.reviewedAt).toLocaleString(locale)}</span>
              </div>
            )}
          </div>

          {item.status === 'pending' && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm text-orange-700">{t('withdrawalPendingDesc')}</p>
            </div>
          )}

          {item.status === 'approved' && item.proofImage && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-green-500" />
                <p className="text-sm font-medium text-foreground">{t('transferProof')}</p>
              </div>
              <a href={item.proofImage} target="_blank" rel="noopener noreferrer">
                <img
                  src={item.proofImage}
                  alt="Transfer proof"
                  className="w-full max-w-[300px] rounded-lg border border-border"
                />
              </a>
            </div>
          )}

          {item.status === 'rejected' && item.adminNote && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">{t('rejectReason')}</p>
                <p className="text-sm text-red-600 mt-0.5">{item.adminNote}</p>
                <p className="text-xs text-red-500 mt-1">{t('withdrawalRejectedRefund')}</p>
              </div>
            </div>
          )}

          {item.status === 'approved' && item.adminNote && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">{item.adminNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const DESKTOP_LIMIT = 20;
const MOBILE_LIMIT = 15;

export default function WithdrawalRecordsPage() {
  const t = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const [page, setPage] = useState(1);
  const loginHref = buildLoginHref(buildAuthRedirectPath(pathname, searchParams));

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace(loginHref);
    }
  }, [_hasHydrated, isAuthenticated, loginHref, router]);

  // Desktop: SWR pagination
  const { data, isLoading } = useSWR<{ items: Withdrawal[]; total: number }>(
    token ? `/withdrawals?page=${page}&limit=${DESKTOP_LIMIT}` : null,
    fetcher,
    { dedupingInterval: 30_000 },
  );

  const totalPages = data ? Math.ceil(data.total / DESKTOP_LIMIT) : 1;

  if (!token) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MobileSubPageHeader title={t('withdrawalRecords')} />
      <h2 className="text-lg font-bold text-foreground">{t('withdrawalRecords')}</h2>

      {/* Desktop: pagination */}
      <div className="hidden lg:block">
        <Card padding="none">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : !data?.items?.length ? (
            <div className="py-12 text-center text-sm text-muted">
              {t('noWithdrawals')}
            </div>
          ) : (
            <>
              {data.items.map((item) => (
                <WithdrawalItem key={item.id} item={item} t={t} locale={locale} />
              ))}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-sm rounded-md border border-border disabled:opacity-40"
                  >
                    &lt;
                  </button>
                  <span className="text-sm text-muted">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-sm rounded-md border border-border disabled:opacity-40"
                  >
                    &gt;
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Mobile: infinite scroll */}
      <div className="lg:hidden">
        <MobileWithdrawals token={token} locale={locale} t={t} />
      </div>
    </div>
  );
}

function MobileWithdrawals({ token, locale, t }: { token: string | null; locale: string; t: (key: string) => string }) {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (!token) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await fetcher<{ items: Withdrawal[]; total: number }>(`/withdrawals?page=${pageNum}&limit=${MOBILE_LIMIT}`);
      const newItems = data?.items ?? [];
      if (append) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setHasMore(newItems.length >= MOBILE_LIMIT);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const next = page + 1;
          setPage(next);
          fetchPage(next, true);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchPage]);

  return (
    <Card padding="none">
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : !items.length ? (
        <div className="py-12 text-center text-sm text-muted">{t('noWithdrawals')}</div>
      ) : (
        <>
          {items.map((item) => (
            <WithdrawalItem key={item.id} item={item} t={t} locale={locale} />
          ))}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-4"><Spinner /></div>
          )}
        </>
      )}
    </Card>
  );
}
