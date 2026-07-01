'use client';

import type { ReactNode } from 'react';
import ProductCard from '@/components/ProductCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import RecommendationCarousel from './RecommendationCarousel';
import type { ProductListItem } from '@/types';
import { OutboundSource } from '@/lib/search-tracking';

interface RecommendationSectionProps {
  title: string;
  icon?: ReactNode;
  products: ProductListItem[];
  isLoading: boolean;
  /** 桌面端列数，搭配推荐 4 列，猜你喜欢 5 列 */
  desktopCols?: 4 | 5;
}

export default function RecommendationSection({
  title,
  icon,
  products,
  isLoading,
  desktopCols = 5,
}: RecommendationSectionProps) {
  // 空状态：不渲染
  if (!isLoading && products.length === 0) {
    return null;
  }

  const gridClass =
    desktopCols === 4
      ? 'hidden lg:grid grid-cols-4 gap-4'
      : 'hidden lg:grid grid-cols-5 gap-4';

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        {icon && (
          <div className="flex-shrink-0">{icon}</div>
        )}
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          {title}
        </h2>
      </div>

      {isLoading ? (
        <>
          {/* 桌面 skeleton */}
          <div className={gridClass}>
            {Array.from({ length: desktopCols }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          {/* 移动 skeleton */}
          <div className="lg:hidden flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-[0_0_42%] min-w-0">
                <SkeletonCard />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* 桌面：网格平铺 */}
          <div className={gridClass}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                source={OutboundSource.RECOMMENDATION}
                position={index + 1}
              />
            ))}
          </div>

          {/* 移动：embla 轮播 */}
          <div className="lg:hidden">
            <RecommendationCarousel products={products} />
          </div>
        </>
      )}
    </section>
  );
}
