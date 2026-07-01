import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  DESKTOP_PRODUCT_GRID_CLASS,
  DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS,
  DESKTOP_PRODUCT_SIDEBAR_CLASS,
  DESKTOP_PRODUCT_SKELETON_COUNT,
} from '@/lib/product-list-layout';

export default function SearchLoadingShell() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-6`}>
        <div className="mb-6 space-y-3">
          <div className="h-8 w-56 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
        </div>

        <div className="hidden lg:flex gap-6">
          <div className={`${DESKTOP_PRODUCT_SIDEBAR_CLASS} space-y-4`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-gray-200 animate-pulse" />
            ))}
          </div>

          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="h-9 w-48 rounded bg-gray-200 animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="h-9 w-28 rounded bg-gray-200 animate-pulse" />
                <div className="h-9 w-24 rounded bg-gray-200 animate-pulse" />
              </div>
            </div>

            <div className={DESKTOP_PRODUCT_GRID_CLASS}>
              {Array.from({ length: DESKTOP_PRODUCT_SKELETON_COUNT }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="sticky top-0 z-10 -mx-4 h-12 border-b border-border bg-surface" />
          <div className="px-4 py-3">
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3 px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} className="shadow-sm" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
