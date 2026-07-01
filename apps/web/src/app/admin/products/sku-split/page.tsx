'use client';

import { useState } from 'react';
import {
  App,
  Card,
  Button,
  Table,
  Tag,
  Space,
  Progress,
  Modal,
} from 'antd';
import { PlusOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { post, get, del } from '@/lib/api';
import useSWR from 'swr';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { fetcher } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface ListEntry {
  type: 'batch' | 'single';
  entryId: string;
  batchKind?: 'legacy_job_group' | 'auto_batch';
  progressUnit?: 'variants' | 'urls';
  jobCount: number;
  totalVariants: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  skippedCount?: number;
  cancelledCount?: number;
  processedCount: number;
  actionableFailureCount: number;
  publishDecisionStats: {
    active: number;
    pendingReview: number;
  };
  failureReasonStats: Array<{
    code: string;
    label: string;
    count: number;
    actionableCount: number;
  }>;
  status: string;
  createdAt: string;
  completedAt?: string;
  weidianItemId?: string;
  weidianTitle?: string;
  splitDimension?: string;
  sourceUrl?: string;
  productGroupId?: string;
}

interface ListResponse {
  data: ListEntry[];
  total: number;
  page: number;
  pageSize: number;
}

interface BatchJob {
  id: string;
  status: string;
  weidianItemId: string;
  weidianTitle?: string;
  splitDimension: string;
  totalVariantCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  actionableFailureCount: number;
  publishDecisionStats: {
    active: number;
    pendingReview: number;
  };
  failureReasonStats: Array<{
    code: string;
    label: string;
    count: number;
    actionableCount: number;
  }>;
  createdAt: string;
}

interface AutoBatchItem {
  id: string;
  sourceUrl: string;
  status: string;
  weidianItemId?: string;
  splitJobId?: string;
  splitJobStatus?: string;
  splitJobTitle?: string;
  selectedCount: number;
  errorMessage?: string;
  actionable?: boolean;
  failureStage?: 'preview' | 'create_job' | 'split_job';
  failureReasonCode?: string;
  failureReasonLabel?: string;
  failureReasonStats?: Array<{
    code: string;
    label: string;
    count: number;
    actionableCount: number;
  }>;
  suggestedAction?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

interface AutoBatchDetail {
  id: string;
  status: string;
  totalUrls: number;
  processedUrls: number;
  successUrls: number;
  failedUrls: number;
  skippedUrls: number;
  cancelledUrls: number;
  createdAt: string;
  completedAt?: string;
  items: AutoBatchItem[];
}

export default function SkuSplitPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedLegacyBatches, setExpandedLegacyBatches] = useState<
    Record<string, BatchJob[]>
  >({});
  const [expandedAutoBatches, setExpandedAutoBatches] = useState<
    Record<string, AutoBatchDetail>
  >({});
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [loadingBatch, setLoadingBatch] = useState<string | null>(null);
  const [retryingAutoBatchId, setRetryingAutoBatchId] = useState<string | null>(
    null,
  );
  const [controllingAutoBatchId, setControllingAutoBatchId] = useState<string | null>(
    null,
  );

  const { data: listData, mutate: refresh } = useSWR<ListResponse>(
    isReady ? `/products/sku-split?page=${page}&pageSize=${pageSize}` : null,
    fetcher,
    { revalidateOnFocus: false, errorRetryCount: 3, refreshInterval: 5000 },
  );

  const handleRetry = async (jobId: string) => {
    try {
      await post(`/products/sku-split/${jobId}/retry`);
      message.success('任务已重新加入队列');
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '重试失败';
      message.error(msg);
    }
  };

  const handleDelete = (jobId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，已创建的产品不受影响。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await del(`/products/sku-split/${jobId}`);
          message.success('任务已删除');
          refresh();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : '删除失败';
          message.error(msg);
        }
      },
    });
  };

  const toggleBatch = async (record: ListEntry) => {
    const batchId = record.entryId;
    const isExpanded = expandedRowKeys.includes(batchId);
    if (isExpanded) {
      setExpandedRowKeys((prev) => prev.filter((key) => key !== batchId));
      return;
    }

    setLoadingBatch(batchId);
    try {
      if (record.batchKind === 'auto_batch') {
        if (!expandedAutoBatches[batchId]) {
          const detail = await get<AutoBatchDetail>(
            `/products/sku-split/auto-batch/${batchId}`,
          );
          setExpandedAutoBatches((prev) => ({ ...prev, [batchId]: detail }));
        }
      } else if (!expandedLegacyBatches[batchId]) {
        const jobs = await get<BatchJob[]>(`/products/sku-split/batch/${batchId}`);
        setExpandedLegacyBatches((prev) => ({ ...prev, [batchId]: jobs }));
      }
    } catch {
      message.error('加载批次详情失败');
      return;
    } finally {
      setLoadingBatch(null);
    }

    setExpandedRowKeys((prev) => [...prev, batchId]);
  };

  const refreshAutoBatchDetail = async (batchId: string) => {
    const detail = await get<AutoBatchDetail>(
      `/products/sku-split/auto-batch/${batchId}`,
    );
    setExpandedAutoBatches((prev) => ({ ...prev, [batchId]: detail }));
    return detail;
  };

  const handleRetryAutoBatchFailed = async (batchId: string) => {
    setRetryingAutoBatchId(batchId);
    try {
      const result = await post<{ retryCount: number }>(
        `/products/sku-split/auto-batch/${batchId}/retry-failed`,
      );
      message.success(`已重新提交 ${result.retryCount} 条失败链接`);
      await refreshAutoBatchDetail(batchId);
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '重试失败链接失败';
      message.error(msg);
    } finally {
      setRetryingAutoBatchId(null);
    }
  };

  const handleAutoBatchControl = async (
    batchId: string,
    action: 'pause' | 'resume' | 'cancel',
  ) => {
    setControllingAutoBatchId(batchId);
    try {
      await post(`/products/sku-split/auto-batch/${batchId}/${action}`);
      const labels = {
        pause: '批次已暂停',
        resume: '批次已恢复',
        cancel: '批次已取消',
      } as const;
      message.success(labels[action]);
      await refreshAutoBatchDetail(batchId);
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '批次操作失败';
      message.error(msg);
    } finally {
      setControllingAutoBatchId(null);
    }
  };

  const statusTag = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '等待中' },
      analyzing: { color: 'processing', text: '分析中' },
      processing: { color: 'processing', text: '处理中' },
      creating_job: { color: 'processing', text: '创建任务' },
      waiting_job: { color: 'processing', text: '等待子任务' },
      paused: { color: 'warning', text: '已暂停' },
      cancelled: { color: 'default', text: '已取消' },
      completed: { color: 'success', text: '已完成' },
      partial_failed: { color: 'warning', text: '部分失败' },
      failed: { color: 'error', text: '失败' },
      skipped: { color: 'default', text: '已跳过' },
    };
    const info = map[status] || { color: 'default', text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const progressCell = (params: {
    processed: number;
    total: number;
    success: number;
    failed: number;
    duplicate: number;
    skipped?: number;
    cancelled?: number;
    actionableFailureCount: number;
    status: string;
    progressUnit?: 'variants' | 'urls';
  }) => (
    <div>
      <Progress
        percent={params.total > 0 ? Math.round((params.processed / params.total) * 100) : 0}
        size="small"
        status={params.status === 'failed' ? 'exception' : undefined}
      />
      <span className="text-xs text-gray-500">
        {params.progressUnit === 'urls'
          ? `${params.success} 成功链接 / ${params.failed} 失败 / ${params.skipped || 0} 跳过${params.cancelled ? ` / ${params.cancelled} 取消` : ''}`
          : `${params.success} 成功 / ${params.failed} 失败 / ${params.duplicate} 重复`}
        {params.actionableFailureCount > 0
          ? ` / ${params.actionableFailureCount} 待处理`
          : ''}
      </span>
    </div>
  );

  const renderAutoBatch = (record: ListEntry) => {
    const detail = expandedAutoBatches[record.entryId];
    if (loadingBatch === record.entryId && !detail) {
      return <div className="px-4 py-6 text-gray-500">加载中...</div>;
    }

    if (!detail || detail.items.length === 0) {
      return <div className="px-4 py-6 text-gray-500">暂无链接任务</div>;
    }

    return (
      <div className="px-4 py-3 bg-gray-50">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm text-gray-500">
            共 {detail.totalUrls} 个链接，已处理 {detail.processedUrls} 个
          </div>
          <Space size="small">
            {(detail.status === 'pending' || detail.status === 'processing') && (
              <Button
                size="small"
                onClick={() => handleAutoBatchControl(record.entryId, 'pause')}
                loading={controllingAutoBatchId === record.entryId}
              >
                暂停
              </Button>
            )}
            {detail.status === 'paused' && (
              <Button
                size="small"
                type="primary"
                onClick={() => handleAutoBatchControl(record.entryId, 'resume')}
                loading={controllingAutoBatchId === record.entryId}
              >
                恢复
              </Button>
            )}
            {(detail.status === 'pending' ||
              detail.status === 'processing' ||
              detail.status === 'paused') && (
              <Button
                size="small"
                danger
                onClick={() => handleAutoBatchControl(record.entryId, 'cancel')}
                loading={controllingAutoBatchId === record.entryId}
              >
                取消
              </Button>
            )}
            {detail.failedUrls > 0 && (
              <Button
                size="small"
                onClick={() => handleRetryAutoBatchFailed(record.entryId)}
                loading={retryingAutoBatchId === record.entryId}
              >
                仅重试失败链接
              </Button>
            )}
          </Space>
        </div>
        <Table
          dataSource={detail.items}
          rowKey={(item) => item.id}
          size="small"
          pagination={false}
          columns={[
            {
              title: '链接任务',
              key: 'task',
              ellipsis: true,
              render: (_, item) => (
                <div className="text-gray-600">
                  <div className="truncate" title={item.sourceUrl}>
                    {item.sourceUrl}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {item.weidianItemId || '待解析'}
                    {item.selectedCount > 0 ? ` · ${item.selectedCount} 个待建款式` : ''}
                  </div>
                </div>
              ),
            },
            {
              title: '状态',
              key: 'status',
              width: 240,
              render: (_, item) => (
                <div className="flex flex-col gap-1">
                  {statusTag(item.status)}
                  {item.splitJobStatus && statusTag(item.splitJobStatus)}
                  {item.failureReasonLabel && (
                    <Tag color={item.actionable ? 'orange' : 'default'}>
                      {item.failureReasonLabel}
                    </Tag>
                  )}
                </div>
              ),
            },
            {
              title: '失败信息',
              key: 'failure',
              render: (_, item) => (
                <div className="text-xs text-gray-500">
                  {item.errorMessage ? (
                    <div className="mb-1 text-red-500">{item.errorMessage}</div>
                  ) : null}
                  {item.suggestedAction ? (
                    <div className="mb-1">建议: {item.suggestedAction}</div>
                  ) : null}
                  {item.failureReasonStats && item.failureReasonStats.length > 0 ? (
                    <div>
                      原因分布:{' '}
                      {item.failureReasonStats
                        .map((reason) => `${reason.label} x ${reason.count}`)
                        .join(' / ')}
                    </div>
                  ) : (
                    <div>
                      更新时间{' '}
                      {new Date(item.updatedAt || item.createdAt).toLocaleString(
                        'zh-CN',
                      )}
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: '操作',
              key: 'action',
              width: 180,
              render: (_, item) => (
                <Space size="small">
                  {item.splitJobId && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() =>
                        router.push(`/admin/products/sku-split/${item.splitJobId}`)
                      }
                    >
                      子任务详情
                    </Button>
                  )}
                  {item.errorMessage && (
                    <span className="text-xs text-red-500" title={item.errorMessage}>
                      错误
                    </span>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </div>
    );
  };

  const renderLegacyBatch = (record: ListEntry) => {
    const jobs = expandedLegacyBatches[record.entryId];
    if (loadingBatch === record.entryId && !jobs) {
      return <div className="px-4 py-6 text-gray-500">加载中...</div>;
    }

    if (!jobs || jobs.length === 0) {
      return <div className="px-4 py-6 text-gray-500">暂无子任务</div>;
    }

    return (
      <div className="px-4 py-3 bg-gray-50">
        <div className="mb-3 text-sm text-gray-500">共 {jobs.length} 个链接</div>
        <Table
          dataSource={jobs}
          rowKey={(job) => job.id}
          size="small"
          pagination={false}
          columns={[
            {
              title: '链接任务',
              dataIndex: 'weidianTitle',
              key: 'task',
              ellipsis: true,
              render: (_, job) => (
                <div className="text-gray-600">
                  <span className="text-xs text-gray-400 mr-2">{job.weidianItemId}</span>
                  {job.weidianTitle || '-'}
                  <span className="text-xs text-gray-400 ml-2">
                    ({job.splitDimension})
                  </span>
                </div>
              ),
            },
            {
              title: '进度',
              key: 'progress',
              width: 220,
              render: (_, job) =>
                progressCell({
                  processed: job.processedCount,
                  total: job.totalVariantCount,
                  success: job.successCount,
                  failed: job.failedCount,
                  duplicate: job.duplicateCount,
                  actionableFailureCount: job.actionableFailureCount,
                  status: job.status,
                  progressUnit: 'variants',
                }),
            },
            {
              title: '状态',
              key: 'status',
              width: 120,
              render: (_, job) => (
                <div className="flex flex-col gap-1">
                  {statusTag(job.status)}
                  {job.actionableFailureCount > 0 && (
                    <Tag color="orange">待处理 {job.actionableFailureCount}</Tag>
                  )}
                </div>
              ),
            },
            {
              title: '时间',
              key: 'createdAt',
              width: 180,
              render: (_, job) => new Date(job.createdAt).toLocaleString('zh-CN'),
            },
            {
              title: '操作',
              key: 'action',
              width: 160,
              render: (_, job) => (
                <Space size="small">
                  <Button
                    type="link"
                    size="small"
                    onClick={() => router.push(`/admin/products/sku-split/${job.id}`)}
                  >
                    详情
                  </Button>
                  {(job.status === 'failed' || job.status === 'partial_failed') && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleRetry(job.id)}
                    >
                      重试
                    </Button>
                  )}
                  <Button
                    danger
                    type="link"
                    size="small"
                    onClick={() => handleDelete(job.id)}
                  >
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SKU 智能拆分上架</h1>
          <p className="text-gray-500 mt-1">
            将微店聚合链接按配色/款式维度拆分为独立产品
          </p>
        </div>
        <Space>
          <Button
            icon={<UnorderedListOutlined />}
            size="large"
            onClick={() => router.push('/admin/products/sku-split/batch')}
          >
            批量拆分
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => router.push('/admin/products/sku-split/new')}
          >
            新建拆分
          </Button>
        </Space>
      </div>

      <Card title="拆分任务">
        <Table
          dataSource={listData?.data || []}
          rowKey={(row) => row.entryId}
          size="small"
          pagination={{
            current: page,
            pageSize,
            total: listData?.total || 0,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
              setExpandedRowKeys([]);
            },
          }}
          expandable={{
            expandedRowKeys,
            rowExpandable: (record) => record.type === 'batch',
            onExpand: (_, record) => {
              if (record.type === 'batch') {
                void toggleBatch(record);
              }
            },
            expandedRowRender: (record) => {
              if (record.type !== 'batch') return null;
              return record.batchKind === 'auto_batch'
                ? renderAutoBatch(record)
                : renderLegacyBatch(record);
            },
          }}
          columns={[
            {
              title: '任务',
              key: 'task',
              ellipsis: true,
              render: (_, row) => {
                if (row.type === 'batch') {
                  return (
                    <div className="flex items-center gap-2">
                      <Tag color="blue">批量</Tag>
                      <span className="font-medium">{row.jobCount} 个链接</span>
                      {row.batchKind === 'auto_batch' && (
                        <Tag color="cyan">后台自动</Tag>
                      )}
                    </div>
                  );
                }
                return (
                  <div>
                    <span className="text-xs text-gray-400 mr-2">
                      {row.weidianItemId}
                    </span>
                    {row.weidianTitle || '-'}
                    <span className="text-xs text-gray-400 ml-2">
                      ({row.splitDimension})
                    </span>
                  </div>
                );
              },
            },
            {
              title: '进度',
              key: 'progress',
              width: 220,
              render: (_, row) =>
                progressCell({
                  processed: row.processedCount,
                  total: row.totalVariants,
                  success: row.successCount,
                  failed: row.failedCount,
                  duplicate: row.duplicateCount,
                  skipped: row.skippedCount,
                  cancelled: row.cancelledCount,
                  actionableFailureCount: row.actionableFailureCount,
                  status: row.status,
                  progressUnit: row.progressUnit,
                }),
            },
            {
              title: '状态',
              key: 'status',
              width: 120,
              render: (_, row) => (
                <div className="flex flex-col gap-1">
                  {statusTag(row.status)}
                  {row.actionableFailureCount > 0 && (
                    <Tag color="orange">待处理 {row.actionableFailureCount}</Tag>
                  )}
                </div>
              ),
            },
            {
              title: '时间',
              key: 'createdAt',
              width: 180,
              render: (_, row) => new Date(row.createdAt).toLocaleString('zh-CN'),
            },
            {
              title: '操作',
              key: 'action',
              width: 160,
              render: (_, row) => {
                if (row.type === 'batch') return null;
                const id = row.entryId;
                const status = row.status;
                return (
                  <Space size="small">
                    <Button
                      type="link"
                      size="small"
                      onClick={() => router.push(`/admin/products/sku-split/${id}`)}
                    >
                      详情
                    </Button>
                    {(status === 'failed' || status === 'partial_failed') && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleRetry(id)}
                      >
                        重试
                      </Button>
                    )}
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => handleDelete(id)}
                    >
                      删除
                    </Button>
                  </Space>
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}
