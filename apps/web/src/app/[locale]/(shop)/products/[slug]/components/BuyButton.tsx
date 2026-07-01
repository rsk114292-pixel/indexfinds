'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useBuyProduct } from '@/hooks/useBuyProduct';
import PlatformSelectModal from './PlatformSelectModal';

interface BuyButtonProps {
  productId: string;
  disabled?: boolean;
  className?: string;
  onBuySuccess?: () => void;
}

export default function BuyButton({
  productId,
  disabled,
  className,
  onBuySuccess,
}: BuyButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { message } = App.useApp();
  const t = useTranslations('buy');

  const { buyWithPlatform, loading } = useBuyProduct({
    productId,
    buttonVariant: 'desktop_buy_button',
    onError: () => message.error(t('failedToGetLink')),
    onSuccess: onBuySuccess,
  });

  const handlePlatformSelect = async (platformKey: string) => {
    await buyWithPlatform(platformKey);
    setModalOpen(false);
  };

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        icon={<ShoppingCart className="w-5 h-5" />}
        onClick={() => setModalOpen(true)}
        loading={loading}
        disabled={disabled}
        className={className}
      >
        {t('buyNow')}
      </Button>

      <PlatformSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handlePlatformSelect}
      />
    </>
  );
}
