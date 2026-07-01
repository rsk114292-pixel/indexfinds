'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Card, Table, Tabs, Tag, App, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { get } from '@/lib/api';
import { TableSkeleton } from '../components/PageSkeleton';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

interface AttributeValueItem {
  id: string;
  value: string;
  slug: string;
  sortOrder: number;
  hexCode: string | null;
  productCount: number;
}

interface AttributeDimension {
  id: string;
  name: string;
  displayName: string;
  type: string;
  sortOrder: number;
  values: AttributeValueItem[];
}

const ATTRIBUTES_CACHE_KEY = 'admin:attributes:summary';
const ATTRIBUTES_CACHE_TTL_MS = 10 * 60 * 1000;

function ColorSwatch({ hex }: { hex: string | null }) {
  if (!hex) return null;
  return (
    <span
      className="inline-block w-4 h-4 rounded border border-gray-300 align-middle mr-2"
      style={{ backgroundColor: hex }}
    />
  );
}

function AttributesPageContent() {
  const { message } = App.useApp();
  const [dimensions, setDimensions] = useState<AttributeDimension[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readSessionCache<AttributeDimension[]>(
      ATTRIBUTES_CACHE_KEY,
      ATTRIBUTES_CACHE_TTL_MS,
    );
    if (!cached) return;

    setDimensions(cached);
    setLoading(false);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await get<AttributeDimension[]>('/attributes/summary');
      setDimensions(data);
      writeSessionCache(ATTRIBUTES_CACHE_KEY, data);
    } catch {
      message.error('获取属性数据失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const baseColumns: ColumnsType<AttributeValueItem> = [
    {
      title: '属性值',
      dataIndex: 'value',
      key: 'value',
      render: (value: string, record) => (
        <div className="flex items-center">
          <ColorSwatch hex={record.hexCode} />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => <code className="text-xs text-gray-500">{slug}</code>,
    },
    {
      title: '关联商品数',
      dataIndex: 'productCount',
      key: 'productCount',
      width: 140,
      sorter: (a, b) => a.productCount - b.productCount,
      defaultSortOrder: 'descend',
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>
      ),
    },
  ];

  const tabItems = dimensions.map((dim) => {
    const totalProducts = dim.values.reduce((sum, v) => sum + v.productCount, 0);
    return {
      key: dim.name,
      label: (
        <span>
          {dim.displayName}{' '}
          <Tag className="ml-1">{dim.values.length}</Tag>
        </span>
      ),
      children: (
        <div>
          <div className="mb-3 text-sm text-gray-500">
            类型: <Tag>{dim.type === 'single_select' ? '单选' : '多选'}</Tag>
            共 {dim.values.length} 个值，关联 {totalProducts} 条商品记录
          </div>
          <Table
            columns={baseColumns}
            dataSource={dim.values}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </div>
      ),
    };
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">筛选属性</h1>
        <span className="text-sm text-gray-400">只读视图 — 属性值由系统自动管理</span>
      </div>

      <Card>
        {dimensions.length > 0 ? (
          <Tabs items={tabItems} />
        ) : (
          <div className="text-center py-10 text-gray-400">
            暂无属性数据，请先运行 seed-attributes 脚本初始化
          </div>
        )}
      </Card>
    </div>
  );
}

export default function AttributesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <AttributesPageContent />
    </Suspense>
  );
}
