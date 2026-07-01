'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  App,
  Alert,
  Table,
  Tag,
  Switch,
  InputNumber,
  Popconfirm,
  Modal,
  Form,
  DatePicker,
  Select,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import dayjs from 'dayjs';
import { get, post, patch, del } from '@/lib/api';
import { useUrlState } from '@/hooks/useUrlState';
import { TableSkeleton } from '../../components/PageSkeleton';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

const HOT_SEARCHES_CACHE_TTL_MS = 5 * 60 * 1000;

interface HotSearch {
  id: string;
  keyword: string;
  searchCount: number;
  searchCount7d: number;
  rawSearchCount7d?: number;
  dedupSearchCount7d?: number;
  suspiciousSearchCount7d?: number;
  suspiciousRate7d?: number;
  avgResultCount: number;
  isBlocked: boolean;
  isPinned: boolean;
  sortOrder: number | null;
  source: 'auto' | 'manual';
  displayStartAt: string | null;
  displayEndAt: string | null;
  createdAt: string;
}

function HotSearchesPageContent() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [data, setData] = useState<HotSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const { params: query, setParams: setQuery } = useUrlState({
    page: 1,
    limit: 20,
    search: '' as string,
    source: '' as string,
    isPinned: '' as string,
    isBlocked: '' as string,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HotSearch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const cacheKey = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(query.page));
    sp.set('limit', String(query.limit));
    if (query.search) sp.set('search', query.search);
    if (query.source) sp.set('source', query.source);
    if (query.isPinned) sp.set('isPinned', query.isPinned);
    if (query.isBlocked) sp.set('isBlocked', query.isBlocked);
    return `admin:analytics:hot-searches:${sp.toString()}`;
  }, [query.page, query.limit, query.search, query.source, query.isPinned, query.isBlocked]);

  useEffect(() => {
    const cached = readSessionCache<{ data: HotSearch[]; total: number }>(
      cacheKey,
      HOT_SEARCHES_CACHE_TTL_MS,
    );
    if (!cached) return;

    setData(cached.data);
    setTotal(cached.total);
    setLoading(false);
  }, [cacheKey]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get<{ data: HotSearch[]; total: number }>(
        '/admin/hot-searches',
        {
          page: query.page,
          limit: query.limit,
          search: query.search || undefined,
          source: query.source || undefined,
          isPinned: query.isPinned || undefined,
          isBlocked: query.isBlocked || undefined,
        },
      );
      setData(res.data || []);
      setTotal(res.total || 0);
      writeSessionCache(cacheKey, {
        data: res.data || [],
        total: res.total || 0,
      });
    } catch {
      message.error('获取热搜词失败');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, query.page, query.limit, query.search, query.source, query.isPinned, query.isBlocked, message]);

  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [fetchData, isReady]);

  useEffect(() => {
    if (formOpen) {
      if (editingItem) {
        form.setFieldsValue({
          keyword: editingItem.keyword,
          isPinned: editingItem.isPinned,
          sortOrder: editingItem.sortOrder,
          displayRange:
            editingItem.displayStartAt && editingItem.displayEndAt
              ? [dayjs(editingItem.displayStartAt), dayjs(editingItem.displayEndAt)]
              : undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [formOpen, editingItem, form]);

  const handleTogglePin = async (item: HotSearch) => {
    try {
      await post(`/admin/hot-searches/${item.id}/pin`);
      message.success(item.isPinned ? '已取消置顶' : '已置顶');
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const handleToggleBlock = async (item: HotSearch) => {
    try {
      await post(`/admin/hot-searches/${item.id}/block`);
      message.success(item.isBlocked ? '已取消屏蔽' : '已屏蔽');
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const handleSortOrderChange = async (item: HotSearch, value: number | null) => {
    try {
      await patch(`/admin/hot-searches/${item.id}`, { sortOrder: value });
      message.success('排序已更新');
      fetchData();
    } catch {
      message.error('更新排序失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del(`/admin/hot-searches/${id}`);
      message.success('已删除');
      fetchData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload: Record<string, unknown> = {};

      if (editingItem) {
        if (values.isPinned !== undefined) payload.isPinned = values.isPinned;
        payload.sortOrder = values.sortOrder ?? null;
        if (values.displayRange && values.displayRange.length === 2) {
          payload.displayStartAt = values.displayRange[0].toISOString();
          payload.displayEndAt = values.displayRange[1].toISOString();
        } else {
          payload.displayStartAt = null;
          payload.displayEndAt = null;
        }
        await patch(`/admin/hot-searches/${editingItem.id}`, payload);
        message.success('已更新');
      } else {
        payload.keyword = values.keyword;
        payload.isPinned = values.isPinned ?? false;
        payload.sortOrder = values.sortOrder ?? undefined;
        if (values.displayRange && values.displayRange.length === 2) {
          payload.displayStartAt = values.displayRange[0].toISOString();
          payload.displayEndAt = values.displayRange[1].toISOString();
        }
        await post('/admin/hot-searches', payload);
        message.success('已添加');
      }

      setFormOpen(false);
      fetchData();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<HotSearch> = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 90,
      render: (source: string) => (
        <Tag color={source === 'manual' ? 'green' : 'blue'}>
          {source === 'manual' ? '手动' : '自动'}
        </Tag>
      ),
    },
    {
      title: '7天可信搜索',
      dataIndex: 'dedupSearchCount7d',
      key: 'dedupSearchCount7d',
      width: 110,
      sorter: (a, b) =>
        (a.dedupSearchCount7d || a.searchCount7d) -
        (b.dedupSearchCount7d || b.searchCount7d),
      render: (_: number, record: HotSearch) => (
        <div>
          <div>{record.dedupSearchCount7d ?? record.searchCount7d}</div>
          <div className="text-xs text-gray-400">原始 {record.rawSearchCount7d ?? record.searchCount7d}</div>
        </div>
      ),
    },
    {
      title: '可疑占比',
      dataIndex: 'suspiciousRate7d',
      key: 'suspiciousRate7d',
      width: 110,
      render: (_: number, record: HotSearch) => {
        const rate = Math.round((record.suspiciousRate7d || 0) * 100);
        const color = rate >= 30 ? 'red' : rate >= 10 ? 'orange' : 'green';
        return (
          <Tag color={color}>
            {record.suspiciousSearchCount7d || 0} / {rate}%
          </Tag>
        );
      },
    },
    {
      title: '平均结果数',
      dataIndex: 'avgResultCount',
      key: 'avgResultCount',
      width: 110,
    },
    {
      title: '置顶',
      dataIndex: 'isPinned',
      key: 'isPinned',
      width: 80,
      render: (_: boolean, record: HotSearch) => (
        <Switch
          size="small"
          checked={record.isPinned}
          onChange={() => handleTogglePin(record)}
        />
      ),
    },
    {
      title: '屏蔽',
      dataIndex: 'isBlocked',
      key: 'isBlocked',
      width: 80,
      render: (_: boolean, record: HotSearch) => (
        <Switch
          size="small"
          checked={record.isBlocked}
          onChange={() => handleToggleBlock(record)}
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
      render: (_: number | null, record: HotSearch) =>
        record.isPinned ? (
          <InputNumber
            size="small"
            min={0}
            value={record.sortOrder}
            onChange={(val) => handleSortOrderChange(record, val)}
            style={{ width: 70 }}
          />
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: '展示时间',
      key: 'displayTime',
      width: 200,
      render: (_: unknown, record: HotSearch) => {
        if (!record.displayStartAt && !record.displayEndAt) {
          return <span className="text-gray-400">永久</span>;
        }
        const start = record.displayStartAt
          ? dayjs(record.displayStartAt).format('MM-DD HH:mm')
          : '∞';
        const end = record.displayEndAt
          ? dayjs(record.displayEndAt).format('MM-DD HH:mm')
          : '∞';
        return (
          <span className="text-xs">
            {start} ~ {end}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      render: (_: unknown, record: HotSearch) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingItem(record);
              setFormOpen(true);
            }}
          >
            编辑
          </Button>
          {record.source === 'manual' && (
            <Popconfirm
              title="确定删除？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">热搜管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingItem(null);
            setFormOpen(true);
          }}
        >
          添加热搜词
        </Button>
      </div>

      <Card className="mb-4">
        <Alert
          className="mb-4"
          type="info"
          showIcon
          message="热搜默认看可信搜索量，不只看原始次数"
          description="表格主值是近 7 天按可信访客与时间窗去重后的搜索量，灰字“原始”保留所有未去重请求。可疑占比高的词，说明它更可能是被重复搜索顶上来的。"
        />
        <Space wrap>
          <Input
            placeholder="搜索关键词..."
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={query.search || ''}
            onChange={(e) => setQuery({ search: e.target.value, page: 1 })}
            onPressEnter={() => fetchData()}
          />
          <Select
            placeholder="来源"
            style={{ width: 110 }}
            allowClear
            value={query.source || undefined}
            onChange={(value) => setQuery({ source: value || '', page: 1 })}
            options={[
              { value: 'auto', label: '自动' },
              { value: 'manual', label: '手动' },
            ]}
          />
          <Select
            placeholder="置顶状态"
            style={{ width: 120 }}
            allowClear
            value={query.isPinned || undefined}
            onChange={(value) => setQuery({ isPinned: value || '', page: 1 })}
            options={[
              { value: 'true', label: '已置顶' },
              { value: 'false', label: '未置顶' },
            ]}
          />
          <Select
            placeholder="屏蔽状态"
            style={{ width: 120 }}
            allowClear
            value={query.isBlocked || undefined}
            onChange={(value) => setQuery({ isBlocked: value || '', page: 1 })}
            options={[
              { value: 'true', label: '已屏蔽' },
              { value: 'false', label: '未屏蔽' },
            ]}
          />
          <Button type="primary" onClick={() => fetchData()}>
            搜索
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: query.page,
            pageSize: query.limit,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (page, pageSize) => setQuery({ page, limit: pageSize }),
          }}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑热搜词' : '添加热搜词'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        forceRender
        destroyOnHidden={false}
      >
        <Form form={form} layout="vertical">
          {!editingItem && (
            <Form.Item
              name="keyword"
              label="关键词"
              rules={[{ required: true, message: '请输入关键词' }]}
            >
              <Input placeholder="输入热搜关键词" maxLength={255} />
            </Form.Item>
          )}
          <Form.Item name="isPinned" label="置顶" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序权重（越小越靠前）">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示不排序" />
          </Form.Item>
          <Form.Item name="displayRange" label="展示时间范围">
            <DatePicker.RangePicker
              showTime
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function HotSearchesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <HotSearchesPageContent />
    </Suspense>
  );
}
