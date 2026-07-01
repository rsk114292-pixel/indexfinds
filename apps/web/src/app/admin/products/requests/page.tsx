'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Image,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { get, patch } from '@/lib/api';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';

type ProductSourcingRequestStatus =
  | 'new'
  | 'reviewing'
  | 'planned'
  | 'fulfilled'
  | 'rejected';

interface ProductSourcingRequestItem {
  id: string;
  searchQuery: string | null;
  productName: string;
  description: string | null;
  referenceUrl: string | null;
  imageUrls: string[] | null;
  budgetMin: string | null;
  budgetMax: string | null;
  locale: string | null;
  searchLogId: string | null;
  filtersSnapshot: Record<string, string> | null;
  status: ProductSourcingRequestStatus;
  adminNotes: string | null;
  linkedProductId: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    username: string | null;
  };
}

const STATUS_LABELS: Record<ProductSourcingRequestStatus, string> = {
  new: '新建',
  reviewing: '处理中',
  planned: '计划上架',
  fulfilled: '已满足',
  rejected: '已拒绝',
};

const STATUS_COLORS: Record<ProductSourcingRequestStatus, string> = {
  new: 'blue',
  reviewing: 'gold',
  planned: 'purple',
  fulfilled: 'green',
  rejected: 'default',
};

export default function ProductSourcingRequestsPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [items, setItems] = useState<ProductSourcingRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProductSourcingRequestStatus | ''>('');
  const [search, setSearch] = useState('');
  const [hasImagesFilter, setHasImagesFilter] = useState<'true' | ''>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<ProductSourcingRequestItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProductSourcingRequestStatus>('new');
  const [editingNotes, setEditingNotes] = useState('');
  const [editingLinkedProductId, setEditingLinkedProductId] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get<{ items: ProductSourcingRequestItem[]; total: number }>(
        '/admin/product-sourcing-requests',
        {
          page,
          limit: 20,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          hasImages: hasImagesFilter || undefined,
        },
      );
      setItems(res.items);
      setTotal(res.total);
    } catch {
      message.error('加载找货需求失败');
    } finally {
      setLoading(false);
    }
  }, [hasImagesFilter, message, page, search, statusFilter]);

  useEffect(() => {
    if (!isReady) return;
    fetchItems();
  }, [fetchItems, isReady]);

  const openDrawer = useCallback((item: ProductSourcingRequestItem) => {
    setActiveItem(item);
    setEditingStatus(item.status);
    setEditingNotes(item.adminNotes || '');
    setEditingLinkedProductId(item.linkedProductId || '');
    setDrawerOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!activeItem) return;
    setSaving(true);
    try {
      const updated = await patch<ProductSourcingRequestItem>(
        `/admin/product-sourcing-requests/${activeItem.id}`,
        {
          status: editingStatus,
          adminNotes: editingNotes,
          linkedProductId: editingLinkedProductId || null,
        },
      );
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setActiveItem(updated);
      message.success('找货需求已更新');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更新失败');
    } finally {
      setSaving(false);
    }
  }, [activeItem, editingLinkedProductId, editingNotes, editingStatus, message]);

  const columns: ColumnsType<ProductSourcingRequestItem> = useMemo(
    () => [
      {
        title: '提交时间',
        dataIndex: 'createdAt',
        width: 170,
        render: (value: string) => new Date(value).toLocaleString('zh-CN'),
      },
      {
        title: '用户',
        key: 'user',
        width: 220,
        render: (_, record) => (
          <div>
            <div className="font-medium">{record.user.username || '未设置用户名'}</div>
            <div className="text-xs text-gray-500">{record.user.email}</div>
          </div>
        ),
      },
      {
        title: '搜索词 / 目标商品',
        key: 'request',
        render: (_, record) => (
          <div>
            <div className="font-medium">{record.productName}</div>
            {record.searchQuery ? (
              <div className="text-xs text-gray-500">搜索词：{record.searchQuery}</div>
            ) : null}
          </div>
        ),
      },
      {
        title: '图片',
        key: 'images',
        width: 100,
        render: (_, record) => (
          <Tag color={(record.imageUrls?.length || 0) > 0 ? 'success' : 'default'}>
            {(record.imageUrls?.length || 0) > 0
              ? `${record.imageUrls?.length} 张`
              : '无图'}
          </Tag>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (value: ProductSourcingRequestStatus) => (
          <Tag color={STATUS_COLORS[value]}>{STATUS_LABELS[value]}</Tag>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_, record) => (
          <Button size="small" onClick={() => openDrawer(record)}>
            查看详情
          </Button>
        ),
      },
    ],
    [openDrawer],
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">找货需求</h1>
          <p className="mt-1 text-sm text-gray-500">
            搜索未命中时，登录用户提交的找货线索会汇总到这里。
          </p>
        </div>
      </div>

      <Card className="mb-4">
        <Space wrap>
          <Input
            placeholder="搜索用户、搜索词或商品名..."
            style={{ width: 280 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              fetchItems();
            }}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 150 }}
            value={statusFilter || undefined}
            onChange={(value) => {
              setStatusFilter((value as ProductSourcingRequestStatus) || '');
              setPage(1);
            }}
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Select
            placeholder="是否有图"
            allowClear
            style={{ width: 140 }}
            value={hasImagesFilter || undefined}
            onChange={(value) => {
              setHasImagesFilter((value as 'true') || '');
              setPage(1);
            }}
            options={[{ value: 'true', label: '有图片' }]}
          />
          <Button
            type="primary"
            onClick={() => {
              setPage(1);
              fetchItems();
            }}
          >
            搜索
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<ProductSourcingRequestItem>
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: (nextPage) => setPage(nextPage),
          }}
        />
      </Card>

      <Drawer
        title="找货需求详情"
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        extra={
          <Button type="primary" loading={saving} onClick={handleSave}>
            保存
          </Button>
        }
      >
        {activeItem ? (
          <div className="space-y-6">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="用户">
                {activeItem.user.username || '未设置用户名'} / {activeItem.user.email}
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {new Date(activeItem.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="搜索词">
                {activeItem.searchQuery || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="目标商品">
                {activeItem.productName}
              </Descriptions.Item>
              <Descriptions.Item label="预算">
                {activeItem.budgetMin || activeItem.budgetMax
                  ? `${activeItem.budgetMin || '-'} ~ ${activeItem.budgetMax || '-'}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Locale">
                {activeItem.locale || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="搜索日志 ID" span={2}>
                {activeItem.searchLogId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="参考链接" span={2}>
                {activeItem.referenceUrl ? (
                  <a href={activeItem.referenceUrl} target="_blank" rel="noreferrer">
                    {activeItem.referenceUrl}
                  </a>
                ) : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="用户描述">
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {activeItem.description || '用户未填写描述'}
              </p>
            </Card>

            {(activeItem.imageUrls?.length || 0) > 0 ? (
              <Card size="small" title="用户上传图片">
                <div className="flex flex-wrap gap-3">
                  {activeItem.imageUrls?.map((imageUrl) => (
                    <Image
                      key={imageUrl}
                      src={imageUrl}
                      alt="找货需求图片"
                      width={120}
                      height={120}
                      className="rounded object-cover"
                    />
                  ))}
                </div>
              </Card>
            ) : null}

            {activeItem.filtersSnapshot ? (
              <Card size="small" title="搜索上下文">
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-gray-600">
                  {JSON.stringify(activeItem.filtersSnapshot, null, 2)}
                </pre>
              </Card>
            ) : null}

            <Card size="small" title="运营处理">
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium">状态</div>
                  <Select
                    style={{ width: 200 }}
                    value={editingStatus}
                    onChange={(value) => setEditingStatus(value)}
                    options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">关联商品 ID</div>
                  <Input
                    placeholder="可选：填入已上架商品 ID"
                    value={editingLinkedProductId}
                    onChange={(e) => setEditingLinkedProductId(e.target.value)}
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">管理员备注</div>
                  <Input.TextArea
                    rows={5}
                    placeholder="记录是否准备上架、找货渠道、处理结果等"
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                  />
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
