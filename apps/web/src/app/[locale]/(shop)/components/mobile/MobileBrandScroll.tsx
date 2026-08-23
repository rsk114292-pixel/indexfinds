'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import BrandLogo from '@/components/brands/BrandLogo';
import { fetcher } from '@/lib/api';
import { SkeletonBlock } from '@/components/mobile/ui/MobileSkeleton';
import type { Brand } from '@/types';
import { useTenant } from '@/components/TenantProvider';

interface BrandsResponse {
  data: Brand[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/**
 * 移动端首页品牌横滑区域
 *
 * 线框：
 * ⭐ 精选品牌 [查看全部 >]
 * [Brand1] [Brand2] [Brand3] →    ← Logo 卡片横滑
 */
export default function MobileBrandScroll() {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const tenant = useTenant();
  const isTenant = Boolean(tenant?.branding?.editorial);

  const { data, isLoading } = useSWR<BrandsResponse>(
    '/brands?status=active&isFeatured=true&limit=12',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  // Backend already sorts by featuredSort ASC, name ASC
  const brands = data?.data ?? [];

  if (!isLoading && brands.length === 0) return null;

  return (
    <section className={isTenant ? 'bg-[#f7f4ef] py-5' : 'py-4'}>
      {/* 标题行 */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-base font-semibold text-foreground">
          {isTenant ? `${tenant?.title} brand index` : t('featuredBrands.title')}
        </h2>
        <Link
          href="/brands"
          className="flex items-center gap-0.5 text-xs font-semibold text-red-700"
        >
          {tc('viewAll')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 横向滚动 */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => <BrandItemSkeleton key={i} />)
          : brands.map((brand) => (
              <BrandItem key={brand.id} brand={brand} isTenant={isTenant} />
            ))}
      </div>
    </section>
  );
}

function BrandItem({ brand, isTenant }: { brand: Brand; isTenant: boolean }) {
  const t = useTranslations('brands');

  return (
    <Link
      href={`/brands/${brand.slug}`}
      className={
        isTenant
          ? 'flex w-40 shrink-0 items-center gap-3 rounded-2xl border border-[#ded4c9] bg-white p-3 text-left transition-transform duration-150 active:scale-95'
          : 'flex w-24 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface p-3 transition-transform duration-150 active:scale-95'
      }
    >
      <BrandLogo name={brand.name} logoUrl={brand.logoUrl} size="md" />
      <div className={isTenant ? 'min-w-0 flex-1 text-left' : 'w-full min-w-0 text-center'}>
        <p className="text-xs font-medium text-foreground truncate">{brand.name}</p>
        <p className="text-[10px] text-muted mt-0.5">
          {t('productCount', { count: brand.productCount || 0 })}
        </p>
      </div>
    </Link>
  );
}

function BrandItemSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 shrink-0 w-24 p-3 rounded-xl border border-border">
      <SkeletonBlock className="w-10 h-10 rounded-lg" />
      <div className="w-full space-y-1">
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-2.5 w-2/3 mx-auto" />
      </div>
    </div>
  );
}
