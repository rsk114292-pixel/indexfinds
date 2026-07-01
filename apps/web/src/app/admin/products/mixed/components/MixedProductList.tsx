'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  App,
  Button,
  Spin,
  Result,
  Pagination,
  Tag,
  Slider,
  Card,
} from 'antd';
import { useRouter } from 'next/navigation';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { MixedProductCard } from './MixedProductCard';
import { get } from '@/lib/api';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { MixedProduct, MixedProductsResponse } from '@/types';
import { EmptyState } from '../../../components/EmptyState';

export function MixedProductList() {
  const { message } = App.useApp();
  const router = useRouter();
  const { isReady, status } = useAdminAuthReady();

  const [products, setProducts] = useState<MixedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [minScore, setMinScore] = useState(0.3);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await get<MixedProductsResponse>('/products/mixed', {
        page,
        limit,
        minMixednessScore: minScore,
      });
      setProducts(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '获取混合产品失败'
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, minScore, message]);

  useEffect(() => {
    if (!isReady) return;
    fetchProducts();
  }, [fetchProducts, isReady]);

  if (status === 'hydrating' || status === 'recovering_token') {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (status === 'unauthenticated' || status === 'forbidden') {
    return (
      <Result
        status="403"
        title="未登录"
        subTitle="请先登录以查看混合产品"
        extra={
          <Button type="primary" onClick={() => router.replace('/admin/login')}>
            去登录
          </Button>
        }
      />
    );
  }

  return (
    <div>
      {/* Filter controls */}
      <Card className="mb-4">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">最低混合度分数:</span>
          <div className="w-64">
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={minScore}
              onChange={(value) => {
                setMinScore(value);
                setPage(1);
              }}
              marks={{
                0: '0%',
                0.5: '50%',
                1: '100%',
              }}
            />
          </div>
          <Tag color={minScore >= 0.7 ? 'red' : minScore >= 0.5 ? 'orange' : 'green'}>
            {(minScore * 100).toFixed(0)}%+
          </Tag>
          <span className="text-gray-500 text-sm">
            共 {total} 个产品
          </span>
        </div>
      </Card>

      {/* Product list */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Spin size="large" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<ExclamationCircleOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          title="未找到混合产品"
          description="当前筛选条件下暂无需要拆分的混合产品"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <MixedProductCard
                key={product.id}
                product={product}
                onSplit={() => router.push(`/admin/products/split/${product.id}`)}
                onRefresh={fetchProducts}
              />
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="mt-6 flex justify-center">
              <Pagination
                current={page}
                total={total}
                pageSize={limit}
                onChange={(newPage) => setPage(newPage)}
                showSizeChanger={false}
                showTotal={(t) => `共 ${t} 个产品`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
