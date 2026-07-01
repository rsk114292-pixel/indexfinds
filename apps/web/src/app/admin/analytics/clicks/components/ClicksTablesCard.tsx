'use client';

import { ShoppingOutlined } from '@ant-design/icons';
import { Card, Image, Segmented, Table } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { EmptyState } from '../../../components/EmptyState';
import type { ClicksData } from '../types';
import {
  pageTypeLabels,
  platformColors,
  sourceLabels,
  viewportDeviceTypeLabels,
} from '../clicks-formatters';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface ClicksTablesCardProps {
  data: ClicksData | null;
  page: number;
  pageSize: number;
  tableMode: 'records' | 'products';
  onTableModeChange: (value: 'records' | 'products') => void;
  onPaginationChange: (nextPage: number, nextPageSize: number) => void;
}

export default function ClicksTablesCard({
  data,
  page,
  pageSize,
  tableMode,
  onTableModeChange,
  onPaginationChange,
}: ClicksTablesCardProps) {
  const rankedProducts = (data?.topProducts || []).map((product, index) => ({
    ...product,
    rank: index + 1,
  }));

  const recordColumns = [
    {
      title: '商品',
      key: 'product',
      render: (_: unknown, record: ClicksData['records'][0]) => (
        <div className="flex items-center gap-3">
          {record.productImage ? (
            <Image
              src={record.productImage}
              alt={record.productName}
              width={40}
              height={40}
              className="rounded object-cover"
              fallback="/placeholder.png"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
              <ShoppingOutlined className="text-gray-400" />
            </div>
          )}
          <span
            className="text-sm truncate max-w-[200px]"
            title={record.productName}
          >
            {record.productName}
          </span>
        </div>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
          {sourceLabels[source] || source}
        </span>
      ),
    },
    {
      title: '页面类型',
      dataIndex: 'pageType',
      key: 'pageType',
      render: (pageType?: string | null) =>
        pageType ? (
          <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
            {pageTypeLabels[pageType] || pageType}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        ),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => (
        <span
          className="px-2 py-1 rounded text-xs text-white"
          style={{ backgroundColor: platformColors[platform] || '#666' }}
        >
          {platform}
        </span>
      ),
    },
    {
      title: '搜索词',
      dataIndex: 'query',
      key: 'query',
      render: (query?: string | null) => (
        <span className="text-sm text-gray-600">{query || '-'}</span>
      ),
    },
    {
      title: '按钮位',
      dataIndex: 'buttonVariant',
      key: 'buttonVariant',
      render: (buttonVariant?: string | null) => (
        <span className="text-sm text-gray-600">{buttonVariant || '-'}</span>
      ),
    },
    {
      title: '视口',
      dataIndex: 'viewportDeviceType',
      key: 'viewportDeviceType',
      render: (viewportDeviceType?: string | null) => (
        <span className="text-sm text-gray-600">
          {viewportDeviceType
            ? viewportDeviceTypeLabels[viewportDeviceType] ||
              viewportDeviceType
            : '-'}
        </span>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => (
        <span className="text-gray-500 text-sm">
          {dayjs(time).add(8, 'hour').fromNow()}
        </span>
      ),
    },
  ];

  const productRankingColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 88,
      render: (rank: number) => (
        <span className="font-semibold text-gray-700">#{rank}</span>
      ),
    },
    {
      title: '商品',
      key: 'product',
      render: (_: unknown, record: (typeof rankedProducts)[number]) => (
        <div className="flex items-center gap-3">
          {record.productImage ? (
            <Image
              src={record.productImage}
              alt={record.productName}
              width={40}
              height={40}
              className="rounded object-cover"
              fallback="/placeholder.png"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
              <ShoppingOutlined className="text-gray-400" />
            </div>
          )}
          <div className="min-w-0">
            <div
              className="text-sm truncate max-w-[260px]"
              title={record.productName}
            >
              {record.productName}
            </div>
            <div className="text-xs text-gray-400">{record.productId}</div>
          </div>
        </div>
      ),
    },
    {
      title: '购买意图',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      defaultSortOrder: 'descend' as const,
      sorter: (
        a: (typeof rankedProducts)[number],
        b: (typeof rankedProducts)[number],
      ) => a.count - b.count,
      render: (count: number) => (
        <span className="font-medium text-gray-700">{count}</span>
      ),
    },
  ];

  return (
    <Card
      title="外跳产品"
      extra={(
        <Segmented
          value={tableMode}
          onChange={(value) =>
            onTableModeChange(value as 'records' | 'products')
          }
          options={[
            { label: '明细', value: 'records' },
            { label: '意图商品排名', value: 'products' },
          ]}
        />
      )}
    >
      {tableMode === 'products' ? (
        <Table
          dataSource={rankedProducts}
          columns={productRankingColumns}
          rowKey="productId"
          locale={{
            emptyText: (
              <EmptyState
                icon={(
                  <ShoppingOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                )}
                title="暂无购买意图商品数据"
                description="选定时间范围和筛选条件下暂无意图商品排行"
              />
            ),
          }}
          pagination={false}
        />
      ) : (
        <Table
          dataSource={data?.records || []}
          columns={recordColumns}
          rowKey="id"
          locale={{
            emptyText: (
              <EmptyState
                icon={(
                  <ShoppingOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                )}
                title="暂无外跳记录"
                description="选定时间范围内暂无点击数据"
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize,
            total: data?.pagination.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: onPaginationChange,
          }}
        />
      )}
    </Card>
  );
}
