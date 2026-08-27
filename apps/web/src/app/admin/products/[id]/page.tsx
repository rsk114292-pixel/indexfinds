'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { App, Button, Breadcrumb } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { ProductForm } from '../components/ProductForm';
import { SeoIndexReviewPanel } from '../components/SeoIndexReviewPanel';
import { get, post, patch } from '@/lib/api';
import { FormSkeleton } from '../../components/PageSkeleton';
import type { Product, ProductFormData } from '@/types';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';

function getAdminProductReturnPath(from: string | null): string {
  if (from === 'hot') {
    return '/admin/products/hot';
  }

  return '/admin/products';
}

export default function ProductEditPage() {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady } = useAdminAuthReady();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isNew = params.id === 'new';
  const productId = params.id as string;
  const returnPath = getAdminProductReturnPath(searchParams.get('from'));
  const breadcrumbBaseTitle = returnPath === '/admin/products/hot' ? '热门管理' : '产品管理';

  useEffect(() => {
    const fetchProduct = async () => {
      if (!isReady) {
        return;
      }

      if (isNew) {
        setLoading(false);
        return;
      }

      try {
        const data = await get<Product>(`/products/${productId}`);
        setProduct({
          ...data,
          slug: data.slug,
          brandId: data.brand?.id,
          primaryCategoryId: data.primaryCategory?.id,
          aiAttributes: data.aiAttributes || {},
          weidianShopName: data.weidianShopName,
          weidianShopId: data.weidianShopId,
          weidianItemId: data.weidianItemId,
          splitSourceWeidianId: data.splitSourceWeidianId,
          sourceUrl: data.sourceUrl,
        });
      } catch {
        message.error('获取产品失败');
        router.push(returnPath);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [
    productId,
    isNew,
    router,
    message,
    isReady,
    returnPath,
  ]);

  const handleSubmit = async (data: ProductFormData) => {
    setSubmitting(true);
    try {
      if (isNew) {
        await post<Product>('/products', data);
      } else {
        await patch<Product>(`/products/${productId}`, data);
      }

      message.success(isNew ? '产品已创建' : '产品已更新');

      router.push(returnPath);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : '保存产品失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <FormSkeleton />;
  }

  return (
    <div>
      <div className="mb-4">
        <Breadcrumb
          items={[
            { title: breadcrumbBaseTitle, href: returnPath },
            { title: isNew ? '新建产品' : '编辑产品' },
          ]}
        />
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push(returnPath)}
        >
          返回
        </Button>
        <h1 className="text-2xl font-bold m-0">
          {isNew ? '新建产品' : '编辑产品'}
        </h1>
      </div>

      <ProductForm
        initialData={product || undefined}
        onSubmit={handleSubmit}
        loading={submitting}
      />
      {!isNew && product && (
        <SeoIndexReviewPanel
          product={product}
          onReviewed={(seoIndexable) =>
            setProduct((current) =>
              current ? { ...current, seoIndexable } : current,
            )
          }
        />
      )}
    </div>
  );
}
