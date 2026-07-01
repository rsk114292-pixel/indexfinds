'use client';

import { useEffect, useState } from 'react';
import { App, Spin, Result, Button, Space, Checkbox } from 'antd';
import { useRouter } from 'next/navigation';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { DuplicateCard } from './DuplicateCard';
import { get, post } from '@/lib/api';
import { CopyOutlined } from '@ant-design/icons';
import type { ReviewItem } from '@/types';
import { EmptyState } from '../../../components/EmptyState';

export function DuplicatesList() {
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
        const data = await get<ReviewItem[]>('/admin/batch/items/duplicates');
        if (!active) return;
        setItems(data || []);
      } catch (error) {
        if (active) {
          message.error(error instanceof Error ? error.message : '获取疑似重复项目失败');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchItems();
    return () => { active = false; };
  }, [isReady, message]);

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
        subTitle="请先登录后再进行操作"
        extra={<Button type="primary" onClick={() => router.replace('/admin/login')}>去登录</Button>}
      />
    );
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setSelectedIds(prev => prev.filter(sid => sid !== id));
  };

  const handleRegenerate = async (id: string) => {
    try {
      await post(`/admin/batch/items/${id}/regenerate`);
      message.success('已加入 AI 分析队列');
      removeItem(id);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await post<{ deleted: number }>('/admin/batch/items/batch-delete', { itemIds: [id] });
      message.success('已跳过');
      removeItem(id);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleBatchSkip = async () => {
    if (selectedIds.length === 0) {
      message.warning('请选择要跳过的项目');
      return;
    }
    try {
      const result = await post<{ deleted: number }>('/admin/batch/items/batch-delete', { itemIds: selectedIds });
      message.success(`已跳过 ${result.deleted} 个项目`);
      setItems(prev => prev.filter(item => !selectedIds.includes(item.id)));
      setSelectedIds([]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量操作失败');
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
        icon={<CopyOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
        title="没有疑似重复的产品"
        description="所有导入产品均未检测到视觉重复"
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
          <Button
            danger
            disabled={selectedIds.length === 0}
            onClick={handleBatchSkip}
          >
            批量跳过 ({selectedIds.length})
          </Button>
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
            <DuplicateCard
              item={item}
              onRegenerate={() => handleRegenerate(item.id)}
              onSkip={() => handleSkip(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
