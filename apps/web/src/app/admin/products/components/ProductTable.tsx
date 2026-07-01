'use client';

import type { ReactNode } from 'react';
import { Table, Button, Space, Tag, Image, Popconfirm, Tooltip } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PictureOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRouter } from 'next/navigation';
import { getProductListThumbnail } from '@/lib/image-utils';
import type { Product } from '@/types';
import { EmptyState } from '../../components/EmptyState';

interface ProductTableProps {
  data: Product[];
  loading: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  onPageChange: (page: number, pageSize: number) => void;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  selectedRowKeys: string[];
  onSelectChange: (keys: string[]) => void;
  extraActions?: (record: Product) => ReactNode;
  onShopFilter?: (shopId: string) => void;
}

const statusColors: Record<string, string> = {
  active: 'green',
  inactive: 'default',
  pending_review: 'orange',
  draft: 'blue',
  split: 'purple',
};

export function ProductTable(props: ProductTableProps) {
  const {
    data,
    loading,
    pagination,
    onPageChange,
    onDelete,
    selectedRowKeys,
    onSelectChange,
    extraActions,
    onShopFilter,
  } = props;
  const router = useRouter();

  const statusLabels: Record<string, string> = {
    active: '已上架',
    inactive: '已下架',
    pending_review: '待审核',
    draft: '草稿',
    split: '已拆分',
  };

  const columns: ColumnsType<Product> = [
    {
      title: '图片',
      dataIndex: 'images',
      key: 'images',
      width: 80,
      render: (images: string[], record: Product) => {
        const firstImage = images?.[0] || record.mainImage;
        const thumbnailUrl = firstImage ? getProductListThumbnail(firstImage) : '/placeholder.png';
        return (
          <Image
            src={thumbnailUrl}
            alt="产品图片"
            width={60}
            height={60}
            style={{ objectFit: 'cover' }}
            fallback="/placeholder.png"
            loading="lazy"
            placeholder={<div className="w-[60px] h-[60px] bg-gray-200 animate-pulse rounded" />}
          />
        );
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record) => (
        <div>
          <div className="font-medium">{title}</div>
          {record.originalTitle && (
            <div className="text-xs text-gray-400 truncate">
              {record.originalTitle}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '品牌',
      dataIndex: ['brand', 'name'],
      key: 'brand',
      width: 120,
      render: (name: string) => name || '-',
    },
    {
      title: '分类',
      dataIndex: ['primaryCategory', 'name'],
      key: 'category',
      width: 120,
      render: (name: string) => name || '-',
    },
    {
      title: '来源店铺',
      dataIndex: 'weidianShopName',
      key: 'weidianShopName',
      width: 120,
      ellipsis: true,
      render: (name: string, record) => {
        const shopLabel = name || '未识别店铺';
        if (!record.weidianShopId || !onShopFilter) {
          return shopLabel;
        }

        return (
          <Tooltip title={`shopId: ${record.weidianShopId}`}>
            <Button
              type="link"
              size="small"
              className="!px-0"
              onClick={() => onShopFilter(record.weidianShopId as string)}
            >
              {shopLabel}
            </Button>
          </Tooltip>
        );
      },
    },
    {
      title: '价格',
      key: 'price',
      width: 150,
      render: (_, record) => (
        <span>
          ¥{record.priceMin}
          {record.priceMax !== record.priceMin && ` - ¥${record.priceMax}`}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{statusLabels[status] || status}</Tag>
      ),
    },
    {
      title: 'QC 图',
      dataIndex: 'qcPhotoCount',
      key: 'qcPhotoCount',
      width: 80,
      align: 'center',
      render: (count?: number) => (
        <Tag color={count && count > 0 ? 'blue' : 'default'}>
          {count || 0}
        </Tag>
      ),
    },
    {
      title: (
        <Tooltip title="以图搜图嵌入">
          <PictureOutlined />
        </Tooltip>
      ),
      dataIndex: 'hasEmbedding',
      key: 'hasEmbedding',
      width: 50,
      align: 'center',
      render: (hasEmbedding: boolean) => (
        <Tooltip
          title={hasEmbedding ? '已生成嵌入' : '未生成嵌入'}
        >
          <PictureOutlined
            style={{
              color: hasEmbedding ? '#52c41a' : '#d9d9d9',
              fontSize: 16,
            }}
          />
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => router.push(`/admin/products/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此产品？"
            onConfirm={() => onDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
          {extraActions?.(record)}
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowSelection={{
        selectedRowKeys,
        onChange: (keys) => onSelectChange(keys as string[]),
      }}
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      locale={{
        emptyText: (
          <EmptyState
            icon={<ShoppingOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            title="暂无产品"
            description="开始导入您的第一批产品"
          />
        ),
      }}
      pagination={{
        ...pagination,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
        onChange: onPageChange,
      }}
    />
  );
}
