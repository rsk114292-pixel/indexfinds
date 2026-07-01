'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { App } from 'antd';
import useSWR from 'swr';
import { ArrowDownToLine } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { usePathname, useRouter } from '@/i18n/navigation';
import MobileSubPageHeader from '@/components/mobile/MobileSubPageHeader';
import { useAuthStore } from '@/stores/useAuthStore';
import { fetcher, post } from '@/lib/api';
import { buildAuthRedirectPath, buildLoginHref } from '@/lib/auth-redirect';

interface BalanceData {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
}

const PAYMENT_METHODS = [
  { value: 'paypal', label: 'PayPal' },
  { value: 'crypto', label: 'Crypto' },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

export default function AccountPointsWithdrawPage() {
  const t = useTranslations('account');
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('paypal');
  const [account, setAccount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const loginHref = buildLoginHref(buildAuthRedirectPath(pathname, searchParams));

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace(loginHref);
    }
  }, [_hasHydrated, isAuthenticated, loginHref, router]);

  // Fetch balance
  const { data: balanceData, isLoading: balanceLoading } = useSWR<BalanceData>(
    token ? '/points/balance' : null,
    fetcher,
    { dedupingInterval: 30_000 },
  );

  const numericAmount = parseInt(amount, 10) || 0;
  const cashEquivalent = (numericAmount / 10).toFixed(2);

  const handleSubmit = async () => {
    if (numericAmount <= 0) {
      message.error(t('withdrawAmountRequired'));
      return;
    }
    if (balanceData && numericAmount > balanceData.balance) {
      message.error(t('insufficientPoints'));
      return;
    }
    if (!account.trim()) {
      message.error(t('paymentAccountRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await post('/withdrawals', {
        amount: numericAmount,
        paymentMethod: method,
        paymentAccount: account.trim(),
      });
      message.success(t('withdrawalSubmitted'));
      router.push('/account/points');
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : t('withdrawalFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const loading = !token || balanceLoading;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MobileSubPageHeader title={t('withdrawPoints')} />
      <h2 className="text-lg font-bold text-foreground">{t('withdrawPoints')}</h2>

      <Card padding="lg">
        <div className="flex items-center gap-2 mb-6">
          <ArrowDownToLine className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">{t('withdrawPoints')}</h3>
        </div>

        {/* Current balance */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-xs text-muted mb-1">{t('pointsBalance')}</p>
          <p className="text-2xl font-bold text-primary">{balanceData?.balance ?? 0}</p>
        </div>

        {/* Amount input */}
        <div className="space-y-4">
          <div>
            <label htmlFor="withdraw-amount" className="block text-sm font-medium text-foreground mb-1.5">
              {t('withdrawAmount')}
            </label>
            <input
              id="withdraw-amount"
              type="number"
              min="1"
              max={balanceData?.balance ?? 0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full min-h-[44px] px-3 text-sm bg-white border border-border rounded-md
                         text-foreground placeholder:text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            {numericAmount > 0 && (
              <p className="text-sm text-muted mt-1.5">
                {t('cashEquivalent')}: <span className="font-semibold text-green-600">${cashEquivalent}</span>
              </p>
            )}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('paymentMethod')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`
                    min-h-[44px] px-3 py-2 rounded-md text-sm font-medium border transition-colors cursor-pointer
                    ${method === m.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-white text-foreground hover:bg-gray-50'
                    }
                  `}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment account */}
          <div>
            <label htmlFor="payment-account" className="block text-sm font-medium text-foreground mb-1.5">
              {t('paymentAccount')}
            </label>
            <input
              id="payment-account"
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={
                method === 'paypal' ? 'your@email.com' : 'Wallet address'
              }
              className="w-full min-h-[44px] px-3 text-sm bg-white border border-border rounded-md
                         text-foreground placeholder:text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              loading={submitting}
              onClick={handleSubmit}
              disabled={numericAmount <= 0 || !account.trim()}
              className="w-full"
            >
              {t('submitWithdrawal')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
