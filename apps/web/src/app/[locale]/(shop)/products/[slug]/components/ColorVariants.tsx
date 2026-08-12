'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from '@/i18n/navigation';
import { fetcher } from '@/lib/api';
import { getImageReferrerPolicy, getProductDetailThumbnail } from '@/lib/image-utils';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface SiblingProduct {
  id: string;
  slug: string;
  title: string;
  mainImage: string;
  skuVariantKey?: string;
  priceMin?: number;
}

interface ColorVariantsProps {
  productGroupId: string;
  currentProductId: string;
}

const PC_COLLAPSED_COUNT = 24;

export default function ColorVariants({
  productGroupId,
  currentProductId,
}: ColorVariantsProps) {
  const t = useTranslations('product');
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const { data: siblings } = useSWR<SiblingProduct[]>(
    `/products/sku-split/siblings?productGroupId=${productGroupId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  );

  if (!siblings || siblings.length <= 1) return null;

  // 当前产品排到首位
  const sorted = [...siblings].sort((a, b) => {
    if (a.id === currentProductId) return -1;
    if (b.id === currentProductId) return 1;
    return 0;
  });

  const hasMore = sorted.length > PC_COLLAPSED_COUNT;
  const pcDisplaySiblings = expanded
    ? sorted
    : sorted.slice(0, PC_COLLAPSED_COUNT);

  const handleVariantClick = (slug: string) => {
    router.replace(`/products/${slug}`, { scroll: false });
  };

  return (
    <div>
      {/* 移动端标题: 和 MobileInlineSKU 一致 */}
      <div className="lg:hidden text-sm font-medium text-foreground mb-2">
        {t('style')}
      </div>
      {/* PC端标题: 和 SKUSelector 一致 */}
      <div className="hidden lg:block font-medium mb-2 text-gray-600 text-sm">
        {t('style')}
      </div>

      {/* 移动端: 全部横向滑动，和 MobileInlineSKU 一致 */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {sorted.map((sibling) => {
          const isCurrent = sibling.id === currentProductId;
          return (
            <button
              key={sibling.id}
              onClick={() => !isCurrent && handleVariantClick(sibling.slug)}
              className={`relative w-14 h-14 flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all duration-150 ${
                isCurrent
                  ? 'border-primary ring-1 ring-primary/30 scale-105'
                  : 'border-border active:scale-95'
              }`}
              title={sibling.title}
            >
              <span className="absolute inset-0 flex items-center justify-center bg-slate-50 text-xs font-semibold text-slate-400">
                {(sibling.skuVariantKey || sibling.title).slice(0, 1).toUpperCase()}
              </span>
              <Image
                src={getProductDetailThumbnail(sibling.mainImage)}
                alt={sibling.title}
                fill
                className="z-10 bg-white object-cover"
                sizes="56px"
                referrerPolicy={getImageReferrerPolicy(getProductDetailThumbnail(sibling.mainImage))}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </button>
          );
        })}
      </div>

      {/* PC端: flex-wrap + 折叠展开，和 SKUSelector ImageOptionGrid 一致 */}
      <div
        className={`hidden lg:flex gap-1 flex-wrap ${expanded ? 'max-h-[230px] overflow-y-auto pr-1' : ''}`}
      >
        {pcDisplaySiblings.map((sibling) => {
          const isCurrent = sibling.id === currentProductId;
          return (
            <button
              key={sibling.id}
              onClick={() => !isCurrent && handleVariantClick(sibling.slug)}
              className={`relative w-[70px] h-[70px] flex-shrink-0 border-2 rounded overflow-hidden transition-all duration-200 cursor-pointer ${
                isCurrent
                  ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-gray-400 hover:shadow-md hover:scale-105'
              }`}
              title={sibling.title}
            >
              <span className="absolute inset-0 flex items-center justify-center bg-slate-50 text-sm font-semibold text-slate-400">
                {(sibling.skuVariantKey || sibling.title).slice(0, 1).toUpperCase()}
              </span>
              <Image
                src={getProductDetailThumbnail(sibling.mainImage)}
                alt={sibling.title}
                fill
                className="z-10 bg-white object-cover"
                referrerPolicy={getImageReferrerPolicy(getProductDetailThumbnail(sibling.mainImage))}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </button>
          );
        })}
      </div>

      {/* PC端展开按钮，和 SKUSelector 一致 */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="hidden lg:inline-block mt-2 text-xs text-blue-600 hover:text-blue-700 hover:underline"
        >
          {expanded
            ? t('collapseOptions')
            : t('viewAllOptions', { count: sorted.length })}
        </button>
      )}
    </div>
  );
}
