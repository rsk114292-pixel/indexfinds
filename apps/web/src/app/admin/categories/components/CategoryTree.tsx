'use client';

import { useState, useMemo } from 'react';
import { Table, Button, Space, Popconfirm, Tag, Input, Tooltip } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Category } from '@/types';

interface CategoryTreeProps {
  categories: Category[];
  loading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => Promise<void>;
  onAddChild: (parentId: string | null) => void;
  onToggleStatus?: (id: string, isActive: boolean) => Promise<void>;
}

/** 递归统计分类总数 */
function countCategories(cats: Category[]): number {
  let count = 0;
  for (const cat of cats) {
    count += 1;
    if (cat.children?.length) {
      count += countCategories(cat.children);
    }
  }
  return count;
}

/** 递归搜索过滤：保留匹配节点及其祖先链 */
function filterTree(cats: Category[], keyword: string): Category[] {
  const lower = keyword.toLowerCase();
  return cats.reduce<Category[]>((acc, cat) => {
    const nameMatch = cat.name.toLowerCase().includes(lower);
    const nameEnMatch = cat.nameEn?.toLowerCase().includes(lower) || false;
    const slugMatch = cat.slug.toLowerCase().includes(lower);
    const filteredChildren = cat.children?.length
      ? filterTree(cat.children, keyword)
      : [];

    if (nameMatch || nameEnMatch || slugMatch || filteredChildren.length > 0) {
      acc.push({ ...cat, children: filteredChildren.length > 0 ? filteredChildren : cat.children });
    }
    return acc;
  }, []);
}

/** 递归收集所有节点 key（用于搜索时全部展开） */
function collectAllKeys(cats: Category[]): string[] {
  const keys: string[] = [];
  for (const cat of cats) {
    if (cat.children?.length) {
      keys.push(cat.id);
      keys.push(...collectAllKeys(cat.children));
    }
  }
  return keys;
}

export function CategoryTree({
  categories,
  loading,
  onEdit,
  onDelete,
  onAddChild,
  onToggleStatus,
}: CategoryTreeProps) {
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // 初始化时展开所有节点
  if (!initialized && categories.length > 0) {
    setExpandedKeys(collectAllKeys(categories));
    setInitialized(true);
  }

  const totalCount = useMemo(() => countCategories(categories), [categories]);

  const displayData = useMemo(() => {
    if (!searchValue.trim()) return categories;
    return filterTree(categories, searchValue.trim());
  }, [categories, searchValue]);

  // 搜索时自动展开全部
  const effectiveExpandedKeys = useMemo(() => {
    if (searchValue.trim()) {
      return collectAllKeys(displayData);
    }
    return expandedKeys;
  }, [searchValue, displayData, expandedKeys]);

  const columns: ColumnsType<Category> = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      width: '35%',
      render: (_, record) => (
        <span className="inline-flex items-center gap-2">
          {record.children && record.children.length > 0 ? (
            effectiveExpandedKeys.includes(record.id) ? (
              <FolderOpenOutlined className="text-amber-500" />
            ) : (
              <FolderOutlined className="text-amber-500" />
            )
          ) : (
            <FileOutlined className="text-gray-400" />
          )}
          <span className="font-medium">{record.name}</span>
          {record.nameEn && (
            <span className="text-gray-400 text-xs">({record.nameEn})</span>
          )}
        </span>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      width: '20%',
      render: (slug: string) => (
        <code className="text-xs bg-gray-50 px-1.5 py-0.5 rounded text-gray-600">
          {slug}
        </code>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: '10%',
      align: 'center',
      render: (isActive: boolean, record) => {
        const active = isActive !== false; // default true
        if (onToggleStatus) {
          return (
            <Tooltip title={active ? '点击禁用' : '点击启用'}>
              <Tag
                color={active ? 'green' : 'default'}
                icon={active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                className="cursor-pointer select-none"
                onClick={() => onToggleStatus(record.id, !active)}
              >
                {active ? '启用' : '禁用'}
              </Tag>
            </Tooltip>
          );
        }
        return (
          <Tag
            color={active ? 'green' : 'default'}
            icon={active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          >
            {active ? '启用' : '禁用'}
          </Tag>
        );
      },
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: '8%',
      align: 'center',
      render: (val: number) => (
        <span className="text-gray-500">{val ?? 0}</span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: '180px',
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
          {record.level < 3 && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => onAddChild(record.id)}
            >
              子分类
            </Button>
          )}
          <Popconfirm
            title="确定删除此分类？"
            description="这将同时删除所有子分类"
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
    <div>
      {/* 顶部工具栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => onAddChild(null)}
          >
            添加根分类
          </Button>
          <span className="text-gray-400 text-sm">
            共 {totalCount} 个分类
          </span>
        </div>
        <Input
          placeholder="搜索分类名称、Slug..."
          prefix={<SearchOutlined className="text-gray-300" />}
          allowClear
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ width: 260 }}
        />
      </div>

      {/* 树形表格 */}
      <Table<Category>
        columns={columns}
        dataSource={displayData}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        childrenColumnName="children"
        expandable={{
          expandedRowKeys: effectiveExpandedKeys,
          onExpand: (expanded, record) => {
            setExpandedKeys((prev) =>
              expanded
                ? [...prev, record.id]
                : prev.filter((k) => k !== record.id),
            );
          },
          indentSize: 24,
        }}
        locale={{
          emptyText: searchValue ? '未找到匹配的分类' : '暂无分类，点击「添加根分类」创建',
        }}
        scroll={{ x: 700 }}
      />
    </div>
  );
}
