'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, App, Button, Result, Spin } from 'antd';
import { CategoryTree } from './components/CategoryTree';
import { CategoryForm } from './components/CategoryForm';
import { fetcher, post, patch, del } from '@/lib/api';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { PageSkeleton } from '../components/PageSkeleton';
import type { Category } from '@/types';

export default function CategoriesPage() {
  const { message } = App.useApp();
  const { isReady, status } = useAdminAuthReady();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const swrKey = isReady ? '/categories/admin/list?includeLegacy=false' : null;

  const {
    data: categories,
    isLoading: loading,
    error,
    mutate,
  } = useSWR<Category[]>(
    swrKey,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setParentId(null);
    setFormOpen(true);
  };

  const handleAddChild = (pId: string | null) => {
    setEditingCategory(null);
    setParentId(pId);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await del(`/categories/${id}`);
      message.success('分类已删除');
      mutate();
    } catch {
      message.error('删除分类失败');
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await patch(`/categories/${id}`, { isActive });
      message.success(isActive ? '分类已启用' : '分类已禁用');
      mutate();
    } catch {
      message.error('状态更新失败');
    }
  };

  const handleSubmit = async (data: {
    name: string;
    nameEn?: string;
    slug?: string;
    coverImage?: string;
  }) => {
    setSubmitting(true);
    try {
      if (editingCategory) {
        await patch(`/categories/${editingCategory.id}`, data);
      } else {
        await post('/categories', { ...data, parentId: parentId || undefined });
      }
      message.success(editingCategory ? '分类已更新' : '分类已创建');
      setFormOpen(false);
      mutate();
    } catch {
      message.error('保存分类失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'hydrating' || status === 'recovering_token') {
    return (
      <div className="flex justify-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  if (status === 'unauthenticated' || status === 'forbidden') {
    return (
      <Result
        status="403"
        title="未登录"
        subTitle="请先登录以查看分类管理"
      />
    );
  }

  if (loading && !categories) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <Result
        status="error"
        title="分类加载失败"
        subTitle={error instanceof Error ? error.message : '请稍后重试'}
        extra={
          <Button type="primary" onClick={() => mutate()}>
            重试
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">分类管理</h1>

      <Card>
        <CategoryTree
          categories={categories || []}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddChild={handleAddChild}
          onToggleStatus={handleToggleStatus}
        />
      </Card>

      <CategoryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        category={editingCategory}
        parentId={parentId}
        loading={submitting}
      />
    </div>
  );
}
