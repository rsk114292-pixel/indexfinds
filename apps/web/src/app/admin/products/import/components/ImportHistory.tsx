'use client';

import { useCallback, useEffect, useState } from 'react';
import { Table, Tag, Button, App, Tabs, Modal, Timeline } from 'antd';
import { DeleteOutlined, CloudUploadOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, post, del } from '@/lib/api';
import type { BatchJob, BatchItem, ProcessingLogEntry } from '@/types';
import { EmptyState } from '../../../components/EmptyState';

const STATUS_COLORS: Record<string, string> = {
  pending: 'default',
  processing: 'blue',
  completed: 'green',
  partial: 'orange',
  failed: 'red',
  cancelled: 'default',
};

const ITEM_STATUS_COLORS: Record<string, string> = {
  pending: 'default',
  fetching: 'blue',
  fetched: 'cyan',
  generating: 'purple',
  review: 'orange',
  approved: 'green',
  published: 'green',
  failed: 'red',
  skipped: 'default',
  cancelled: 'default',
};

const ITEM_STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  fetching: '抓取中',
  fetched: '已抓取',
  generating: 'AI 生成中',
  review: '待审核',
  approved: '已审核',
  published: '已发布',
  failed: '失败',
  skipped: '已跳过',
  cancelled: '已取消',
};

/** 日志详情弹窗 */
function LogModal({
  open,
  onClose,
  logs,
  sourceUrl,
}: {
  open: boolean;
  onClose: () => void;
  logs: ProcessingLogEntry[];
  sourceUrl: string;
}) {
  return (
    <Modal
      title="处理日志"
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      <div className="text-xs text-gray-400 mb-3 truncate">{sourceUrl}</div>
      {logs.length === 0 ? (
        <div className="text-gray-400 text-center py-4">暂无日志</div>
      ) : (
        <Timeline
          items={logs.map((entry) => ({
            children: (
              <div>
                <div className="font-medium">{entry.event}</div>
                <div className="text-xs text-gray-400">
                  {new Date(entry.ts).toLocaleString()}
                </div>
                {entry.data && (
                  <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-40">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                )}
              </div>
            ),
          }))}
        />
      )}
    </Modal>
  );
}

/** 展开行内的 items 详情 */
function JobItemsDetail({ jobId, job }: { jobId: string; job: BatchJob }) {
  const { message } = App.useApp();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [logModal, setLogModal] = useState<{ open: boolean; logs: ProcessingLogEntry[]; sourceUrl: string }>({
    open: false,
    logs: [],
    sourceUrl: '',
  });

  const fetchItems = useCallback(
    async (p: number, status?: string) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page: p, limit: 20 };
        if (status) params.status = status;
        const res = await get<{ data: BatchItem[]; total: number }>(
          `/admin/batch/jobs/${jobId}/items`,
          params,
        );
        setItems(res.data);
        setTotal(res.total);
      } catch {
        message.error('获取 items 列表失败');
      } finally {
        setLoading(false);
      }
    },
    [jobId, message],
  );

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  const handleStatusTab = (key: string) => {
    const status = key === 'all' ? undefined : key;
    setStatusFilter(status);
    setPage(1);
    fetchItems(1, status);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchItems(p, statusFilter);
  };

  const itemColumns: ColumnsType<BatchItem> = [
    {
      title: '链接',
      dataIndex: 'sourceUrl',
      key: 'sourceUrl',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={ITEM_STATUS_COLORS[status] || 'default'}>
          {ITEM_STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      render: (v: string | null) => v || '-',
    },
    {
      title: '日志',
      key: 'log',
      width: 70,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<FileTextOutlined />}
          onClick={() =>
            setLogModal({
              open: true,
              logs: record.processingLog || [],
              sourceUrl: record.sourceUrl,
            })
          }
        />
      ),
    },
  ];

  return (
    <div className="py-2">
      <Tabs
        activeKey={statusFilter || 'all'}
        onChange={handleStatusTab}
        size="small"
        items={[
          { key: 'all', label: `全部 ${job.totalItems}` },
          ...(job.failedItems > 0
            ? [{ key: 'failed', label: `失败 ${job.failedItems}` }]
            : []),
          { key: 'skipped', label: '已跳过' },
          { key: 'review', label: '待审核' },
          { key: 'pending', label: '待处理' },
        ]}
      />
      <Table
        dataSource={items}
        columns={itemColumns}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          onChange: handlePageChange,
          showTotal: (t) => `共 ${t} 条`,
          showSizeChanger: false,
        }}
      />
      <LogModal
        open={logModal.open}
        onClose={() => setLogModal((s) => ({ ...s, open: false }))}
        logs={logModal.logs}
        sourceUrl={logModal.sourceUrl}
      />
    </div>
  );
}

export function ImportHistory() {
  const { message, modal } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [data, setData] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await get<{ data: BatchJob[]; total: number }>('/admin/batch/jobs', { page, limit: 20 });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '获取任务列表失败',
      );
    } finally {
      setLoading(false);
    }
  }, [page, message]);

  useEffect(() => {
    if (!isReady) return;
    fetchJobs();
  }, [fetchJobs, isReady]);

  const handleRetry = async (jobId: string) => {
    try {
      await post(`/admin/batch/jobs/${jobId}/retry`);
      message.success('已加入重试队列');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重试失败');
    }
  };

  const handleRetryStuck = async (jobId: string) => {
    try {
      const result = await post<{ retried: number }>(`/admin/batch/jobs/${jobId}/retry-stuck`);
      message.success(`已恢复 ${result.retried} 个卡住的项目`);
      fetchJobs();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '恢复失败');
    }
  };

  const handleDelete = (jobId: string) => {
    modal.confirm({
      title: '删除导入任务',
      content: '确定要删除此导入任务吗？此操作无法撤销。',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await del(`/admin/batch/jobs/${jobId}`);
          message.success('任务已成功删除');
          fetchJobs();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除失败');
        }
      },
    });
  };

  const columns: ColumnsType<BatchJob> = [
    {
      title: '任务 ID',
      dataIndex: 'id',
      key: 'id',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: '项目',
      key: 'items',
      render: (_, record) => `${record.processedItems}/${record.totalItems}`,
    },
    {
      title: '成功/失败',
      key: 'result',
      render: (_, record) => `${record.successItems}/${record.failedItems}`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          {record.failedItems > 0 && (
            <Button size="small" onClick={() => handleRetry(record.id)}>
              重试失败
            </Button>
          )}
          {record.processedItems < record.totalItems && (
            <Button size="small" type="dashed" onClick={() => handleRetryStuck(record.id)}>
              恢复卡住
            </Button>
          )}
          <Button
            size="small"
            type="primary"
            href={`/admin/products?tab=review&jobId=${record.id}`}
          >
            审核
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="id"
      loading={loading}
      expandable={{
        expandedRowRender: (record) => (
          <JobItemsDetail jobId={record.id} job={record} />
        ),
      }}
      locale={{
        emptyText: (
          <EmptyState
            icon={<CloudUploadOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            title="暂无导入记录"
            description="使用「URL 导入」开始您的第一次导入"
          />
        ),
      }}
      pagination={{
        current: page,
        pageSize: 20,
        total,
        onChange: (p) => setPage(p),
      }}
    />
  );
}
