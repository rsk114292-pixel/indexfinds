'use client';

import { useTranslations } from 'next-intl';
import { Sparkles, Heart } from 'lucide-react';
import RecommendationSection from './RecommendationSection';
import {
  useCompleteTheLook,
  useSimilarProducts,
} from './useRecommendations';

interface ProductRecommendationsProps {
  productId: string;
  /** 移动端模式：无外层 padding（由父组件控制） */
  mobile?: boolean;
}

export default function ProductRecommendations({
  productId,
  mobile = false,
}: ProductRecommendationsProps) {
  const t = useTranslations('product');

  const {
    products: ctlProducts,
    isLoading: ctlLoading,
  } = useCompleteTheLook(productId);

  const {
    products: similarProducts,
    isLoading: similarLoading,
  } = useSimilarProducts(productId);

  const showCtl = ctlLoading || ctlProducts.length > 0;
  const showSimilar = similarLoading || similarProducts.length > 0;

  if (!showCtl && !showSimilar) return null;

  return (
    <div className={mobile ? 'px-4 mt-6 space-y-8' : 'mt-10 space-y-10'}>
      {showCtl && (
        <RecommendationSection
          title={t('completeLook')}
          icon={
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
          }
          products={ctlProducts}
          isLoading={ctlLoading}
          desktopCols={4}
        />
      )}
      {showSimilar && (
        <RecommendationSection
          title={t('youMayAlsoLike')}
          icon={
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
          }
          products={similarProducts}
          isLoading={similarLoading}
          desktopCols={5}
        />
      )}
    </div>
  );
}
