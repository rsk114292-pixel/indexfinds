/**
 * 商品详情页加载状态
 * 显示骨架屏，提升用户体验
 */
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProductLoading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 面包屑骨架 */}
      <div className="mb-6">
        <Skeleton className="h-4 w-[300px]" />
      </div>

      {/* 主要内容区 */}
      <div className="grid lg:grid-cols-2 gap-12 mb-12">
        {/* 左侧：图片骨架 */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* 右侧：信息骨架 */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-4/5" />
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <Skeleton className="h-8 w-[120px]" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 rounded" />
            ))}
          </div>

          <div className="flex gap-4">
            <Skeleton className="flex-1 h-12 rounded" />
            <Skeleton className="w-12 h-12 rounded" />
            <Skeleton className="w-12 h-12 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
