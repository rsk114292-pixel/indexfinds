'use client';

import { Table, Button, Space, Tag, Popconfirm, Switch, InputNumber } from 'antd';
import { EditOutlined, DeleteOutlined, MergeCellsOutlined, TagOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import type { Brand } from '@/types';
import { EmptyState } from '../../components/EmptyState';

interface BrandTableProps {
  data: Brand[];
  loading: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  onPageChange: (page: number, pageSize: number) => void;
  onEdit: (brand: Brand) => void;
  onDelete: (id: string) => Promise<void>;
  onMerge: (brand: Brand) => void;
  onToggleFeatured: (brand: Brand) => Promise<void>;
  onUpdateFeaturedSort: (brand: Brand, sort: number) => Promise<void>;
  rowSelection?: TableRowSelection<Brand>;
}

const tierColors: Record<number, string> = {
  0: 'default',
  1: 'gold',
  2: 'blue',
};

const tierLabels: Record<number, string> = {
  0: '标准',
  1: '奢侈品',
  2: '高端',
};

export function BrandTable({
  data,
  loading,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onMerge,
  onToggleFeatured,
  onUpdateFeaturedSort,
  rowSelection,
}: BrandTableProps) {
  const columns: ColumnsType<Brand> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div className="flex items-center gap-3">
          {record.logoUrl ? (
             
            <img
              src={record.logoUrl}
              alt={name}
              className="w-10 h-10 object-contain rounded border"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-gray-400 font-bold">
              {name.charAt(0)}
            </div>
          )}
          <div>
            <div className="font-medium">{name}</div>
            {record.aliases && record.aliases.length > 0 && (
              <div className="text-xs text-gray-400">
                别名: {record.aliases.slice(0, 3).join(', ')}
                {record.aliases.length > 3 && ` +${record.aliases.length - 3}`}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '父品牌/合并到',
      dataIndex: 'parent',
      key: 'parent',
      width: 150,
      render: (_: Brand['parent'], record: Brand) => {
        if (record.parent) {
          return <span className="text-blue-600">{record.parent.name}</span>;
        }
        if (record.status === 'merged' && record.mergedIntoName) {
          return <span className="text-orange-500">→ {record.mergedIntoName}</span>;
        }
        return <span className="text-gray-400">-</span>;
      },
    },
    {
      title: '等级',
      dataIndex: 'tier',
      key: 'tier',
      width: 120,
      render: (tier: number) =>
        tier ? (
          <Tag color={tierColors[tier]}>{tierLabels[tier]}</Tag>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: '精选',
      dataIndex: 'isFeatured',
      key: 'isFeatured',
      width: 130,
      render: (_: boolean, record: Brand) => (
        <div className="flex items-center gap-2">
          <Switch
            size="small"
            checked={!!record.isFeatured}
            onChange={() => onToggleFeatured(record)}
          />
          {record.isFeatured && (
            <InputNumber
              size="small"
              min={0}
              value={record.featuredSort || 0}
              style={{ width: 56 }}
              onBlur={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val !== (record.featuredSort || 0)) {
                  onUpdateFeaturedSort(record, val);
                }
              }}
              onPressEnter={(e) => {
                (e.target as HTMLInputElement).blur();
              }}
            />
          )}
        </div>
      ),
    },
    {
      title: '产品数',
      dataIndex: 'productCount',
      key: 'productCount',
      width: 100,
      render: (count: number) => count || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<MergeCellsOutlined />}
            onClick={() => onMerge(record)}
          >
            合并
          </Button>
          <Popconfirm
            title="确定删除此品牌？"
            onConfirm={() => onDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      rowSelection={rowSelection}
      loading={loading}
      locale={{
        emptyText: (
          <EmptyState
            icon={<TagOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            title="暂无品牌"
            description="点击「添加品牌」创建第一个品牌"
          />
        ),
      }}
      pagination={{
        ...pagination,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 个品牌`,
        onChange: onPageChange,
      }}
    />
  );
}
