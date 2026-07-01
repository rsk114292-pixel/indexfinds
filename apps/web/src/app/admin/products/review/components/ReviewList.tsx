'use client';

import { useEffect, useState } from 'react';
import { App, Button, Space, Checkbox, Spin, Result } from 'antd';
import { useRouter } from 'next/navigation';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { ReviewCard } from './ReviewCard';
import { get, post } from '@/lib/api';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { ReviewItem } from '@/types';
import { EmptyState } from '../../../components/EmptyState';

export function ReviewList({ jobId }: { jobId?: string | null }) {
  const { message } = App.useApp();
  const router = useRouter();
  const { isReady, status } = useAdminAuthReady();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isReady) return;
    let active = true;
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await get<ReviewItem[]>('/admin/batch/items/review', jobId ? { jobId } : undefined);
        if (!active) return;
        setItems(data || []);
      } catch (error) {
        if (active) {
          message.error(
            error instanceof Error ? error.message : '获取审核项目失败',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchItems();
    return () => {
      active = false;
    };
  }, [isReady, jobId, message]);

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
        subTitle="请先登录后再进行审核操作"
        extra={
          <Button type="primary" onClick={() => router.replace('/admin/login')}>
            去登录
          </Button>
        }
      />
    );
  }

  const handleRegenerate = async (id: string) => {
    try {
      await post(`/admin/batch/items/${id}/regenerate`);
      message.success('已加入 AI 重新分析队列');
      setItems(items.filter(item => item.id !== id));
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重跑失败');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await post(`/admin/batch/items/${id}/approve`);
      message.success('已批准');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批准失败');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await post(`/admin/batch/items/${id}/publish`);
      message.success('已发布');
      setItems(items.filter(item => item.id !== id));
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '发布失败');
    }
  };

  const handleBatchPublish = async () => {
    if (selectedIds.length === 0) {
      message.warning('请选择要发布的项目');
      return;
    }
    try {
      const result = await post<{ success: number }>('/admin/batch/items/batch-publish', { itemIds: selectedIds });
      message.success(`已发布 ${result.success} 个项目`);
      setItems(items.filter(item => !selectedIds.includes(item.id)));
      setSelectedIds([]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量发布失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      message.warning('请选择要删除的项目');
      return;
    }
    try {
      const result = await post<{ deleted: number }>('/admin/batch/items/batch-delete', { itemIds: selectedIds });
      message.success(`已删除 ${result.deleted} 个项目`);
      setItems(items.filter(item => !selectedIds.includes(item.id)));
      setSelectedIds([]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量删除失败');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  if (!loading && items.length === 0) {
    return (
      <EmptyState
        icon={<ClockCircleOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
        title="没有待审核的项目"
        description="所有产品均已审核完毕"
      />
    );
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded flex justify-between items-center">
          <Space>
            <Checkbox
              checked={selectedIds.length === items.length}
              indeterminate={selectedIds.length > 0 && selectedIds.length < items.length}
              onChange={handleSelectAll}
            >
              全选 ({selectedIds.length}/{items.length})
            </Checkbox>
          </Space>
          <Space>
            <Button
              type="primary"
              disabled={selectedIds.length === 0}
              onClick={handleBatchPublish}
            >
              发布选中的 ({selectedIds.length})
            </Button>
            <Button
              danger
              disabled={selectedIds.length === 0}
              onClick={handleBatchDelete}
            >
              删除选中的 ({selectedIds.length})
            </Button>
          </Space>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="relative">
            <Checkbox
              className="absolute top-2 left-2 z-10"
              checked={selectedIds.includes(item.id)}
              onChange={() => handleToggleSelect(item.id)}
            />
            <ReviewCard
              item={item}
              onEdit={() => {
                if (!isReady) {
                  message.error('请先登录');
                  router.replace('/admin/login');
                  return;
                }
                router.push(`/admin/products/review/${item.id}`);
              }}
              onApprove={() => handleApprove(item.id)}
              onPublish={() => handlePublish(item.id)}
              onRegenerate={() => handleRegenerate(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
