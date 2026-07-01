'use client';

import { Alert, Button, Card, Empty, Skeleton } from 'antd';
import type { AdminProductShopOverview } from '@/types';

interface ShopOverviewPanelProps {
  data?: AdminProductShopOverview;
  loading?: boolean;
  errorMessage?: string;
  selectedShopIds: string[];
  onSelectShop: (shopId: string) => void;
  onClear: () => void;
}

const SUMMARY_ITEMS = [
  { key: 'totalShops', label: '店铺数' },
  { key: 'totalProducts', label: '商品数' },
  { key: 'pendingReviewCount', label: '待审核' },
  { key: 'withoutQcCount', label: '无 QC' },
  { key: 'missingProductCount', label: '未识别店铺商品' },
  { key: 'deadLinkCount', label: '死链' },
] as const;

export function ShopOverviewPanel({
  data,
  loading,
  errorMessage,
  selectedShopIds,
  onSelectShop,
  onClear,
}: ShopOverviewPanelProps) {
  return (
    <Card
      size="small"
      className="mb-4"
      title="店铺概览"
      extra={
        selectedShopIds.length > 0 ? (
          <Button size="small" onClick={onClear}>
            清空店铺筛选
          </Button>
        ) : null
      }
    >
      {errorMessage ? (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          message="店铺概览加载失败"
          description={errorMessage}
        />
      ) : null}

      {loading && !data ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : null}

      {!loading && !data && !errorMessage ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无店铺数据" />
      ) : null}

      {data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {SUMMARY_ITEMS.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3"
              >
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="mt-1 text-xl font-semibold text-gray-900">
                  {data.meta[item.key]}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">
              Top 店铺
            </div>
            {data.data.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {data.data.map((shop) => {
                  const selected = selectedShopIds.includes(shop.shopId);
                  return (
                    <button
                      key={shop.shopId}
                      type="button"
                      onClick={() => onSelectShop(shop.shopId)}
                      className={`rounded-lg border px-3 py-3 text-left transition ${
                        selected
                          ? 'border-orange-400 bg-orange-50 text-orange-700'
                          : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/40'
                      }`}
                    >
                      <div className="truncate text-sm font-medium">
                        {shop.shopName}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        商品 {shop.productCount}
                        {' · '}待审 {shop.pendingReviewCount}
                        {' · '}无 QC {shop.withoutQcCount}
                        {shop.deadLinkCount > 0 ? ` · 死链 ${shop.deadLinkCount}` : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="当前条件下没有店铺聚合结果"
              />
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
