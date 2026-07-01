'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Progress, Table, Tag, Button, Spin, App, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useAuthStore } from '@/stores/useAuthStore';
import { get, post, API_BASE_URL, ensureFreshToken } from '@/lib/api';
import { performTokenRefresh } from '@/lib/api';
import type { BatchItem, BatchJob } from '@/types';

const STATUS_COLORS: Record<string, string> = {
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

const STATUS_LABELS: Record<string, string> = {
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

/** SSE 连续失败多少次后，降级为轮询模式 */
const POLLING_FALLBACK_THRESHOLD = 5;
/** 轮询间隔（毫秒） */
const POLLING_INTERVAL_MS = 5000;
/** SSE 重连退避封顶（毫秒） */
const SSE_MAX_BACKOFF_MS = 30000;

const JOB_DONE_STATUSES = ['completed', 'failed', 'partial', 'cancelled'];

export function ImportProgress({
  jobId,
  onComplete,
}: {
  jobId: string;
  onComplete?: () => void;
}) {
  const { message } = App.useApp();
  const [job, setJob] = useState<BatchJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [pollingMode, setPollingMode] = useState(false);
  const completedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 稳定的 onComplete 引用
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // 分页表格状态
  const [showItemsTable, setShowItemsTable] = useState(false);
  const [itemsData, setItemsData] = useState<BatchItem[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // ── 处理 job 数据更新（SSE 和轮询共用） ──
  const handleJobData = useCallback((data: BatchJob) => {
    setJob(data);
    setLoading(false);

    const done = JOB_DONE_STATUSES.includes(data.status);
    if (done && !completedRef.current) {
      completedRef.current = true;
      setTimeout(() => {
        onCompleteRef.current?.();
      }, 500);
    }
  }, []);

  // ── 轮询模式：用普通 GET 请求定期拉取 job 状态 ──
  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) return; // 已在轮询

    setPollingMode(true);
    setConnectionError(false);
    setRetrying(false);

    const poll = async () => {
      try {
        await ensureFreshToken();
        const data = await get<BatchJob>(`/admin/batch/jobs/${jobId}`);
        if (data) {
          // 轮询返回的数据不含 activeItems/recentItems，需要额外构造
          handleJobData(data);
        }
      } catch {
        // 轮询失败不用特殊处理，下次 interval 会自动重试
        // get() 内部已有 401 自动刷新逻辑
      }
    };

    // 立即执行一次
    poll();
    pollingTimerRef.current = setInterval(poll, POLLING_INTERVAL_MS);
  }, [jobId, handleJobData]);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setPollingMode(false);
  }, []);

  // 获取分页 items
  const fetchItems = useCallback(
    async (page: number, status?: string) => {
      setItemsLoading(true);
      try {
        const params: Record<string, unknown> = { page, limit: 20 };
        if (status) params.status = status;
        const res = await get<{ data: BatchItem[]; total: number }>(
          `/admin/batch/jobs/${jobId}/items`,
          params,
        );
        setItemsData(res.data);
        setItemsTotal(res.total);
      } catch {
        message.error('获取 items 列表失败');
      } finally {
        setItemsLoading(false);
      }
    },
    [jobId, message],
  );

  // ── SSE 连接 ──
  const connectSSE = useCallback(async () => {
    if (!jobId) return;

    // 如果正在轮询，先停止
    stopPolling();

    // 清理之前的连接
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await fetchEventSource(`${API_BASE_URL}/admin/batch/jobs/${jobId}/progress`, {
        method: 'GET',
        headers: {
          get Authorization() {
            return `Bearer ${useAuthStore.getState().token}`;
          },
        },
        signal: controller.signal,
        openWhenHidden: true,

        onopen: async (response) => {
          if (response.ok) {
            retryCountRef.current = 0;
            setLoading(false);
            setConnectionError(false);
            setRetrying(false);
          } else if (response.status === 401) {
            // Token 过期，尝试刷新后重连
            await performTokenRefresh();
            throw new Error('Token refreshed, reconnecting');
          } else {
            throw new Error(`SSE connection failed: ${response.status}`);
          }
        },

        onmessage: (event) => {
          try {
            const data = JSON.parse(event.data) as BatchJob;
            handleJobData(data);
          } catch {
            // 忽略解析错误
          }
        },

        onerror: (err) => {
          // 任务已完成，不需要重连
          if (completedRef.current) {
            setConnectionError(true);
            throw err;
          }

          retryCountRef.current++;
          setRetrying(true);

          // SSE 连续失败超过阈值 → 降级为轮询
          if (retryCountRef.current >= POLLING_FALLBACK_THRESHOLD) {
            startPolling();
            // throw 停止 SSE 内置重试
            throw err;
          }

          // 重连前确保 token 新鲜
          ensureFreshToken().catch(() => {});

          // 指数退避：5s → 10s → 20s → 30s 封顶
          const delay = Math.min(
            5000 * Math.pow(2, retryCountRef.current - 1),
            SSE_MAX_BACKOFF_MS,
          );
          return delay;
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        // SSE 彻底断开，如果还没在轮询且任务未完成，启动轮询
        if (!pollingTimerRef.current && !completedRef.current) {
          startPolling();
        }
      }
    }
  }, [jobId, handleJobData, startPolling, stopPolling]);

  useEffect(() => {
    connectSSE();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      stopPolling();
    };
  }, [connectSSE, stopPolling]);

  // 手动重连（尝试恢复 SSE）
  const handleReconnect = () => {
    retryCountRef.current = 0;
    setConnectionError(false);
    setRetrying(false);
    setLoading(!job); // 如果已有 job 数据就不显示 loading
    completedRef.current = false;
    stopPolling();
    connectSSE();
  };

  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    try {
      setCancelling(true);
      await post(`/admin/batch/jobs/${jobId}/cancel`);
      message.success('任务已取消');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '取消失败');
    } finally {
      setCancelling(false);
    }
  };

  const handleRetry = async () => {
    try {
      await post(`/admin/batch/jobs/${jobId}/retry`);
      message.success('已加入重试队列');
      completedRef.current = false;
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重试失败');
    }
  };

  // 展开 items 表格时加载第一页
  const handleToggleItems = () => {
    const next = !showItemsTable;
    setShowItemsTable(next);
    if (next) {
      setItemsPage(1);
      setStatusFilter(undefined);
      fetchItems(1);
    }
  };

  // Tab 切换状态筛选
  const handleStatusTabChange = (key: string) => {
    const status = key === 'all' ? undefined : key;
    setStatusFilter(status);
    setItemsPage(1);
    fetchItems(1, status);
  };

  // 分页切换
  const handlePageChange = (page: number) => {
    setItemsPage(page);
    fetchItems(page, statusFilter);
  };

  if (loading && !job) {
    return (
      <div className="flex justify-center py-6">
        <Spin size="large" />
      </div>
    );
  }

  if (connectionError && !job) {
    return (
      <Card className="mt-4">
        <div className="text-center py-6">
          <p className="text-red-500 mb-4">连接已断开，无法获取任务状态。</p>
          <Button onClick={handleReconnect}>重新连接</Button>
        </div>
      </Card>
    );
  }

  if (!job) return null;

  const columns: ColumnsType<BatchItem> = [
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
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
    },
  ];

  const inProgress = job.inProgressItems || 0;
  const completedPercent = job.totalItems
    ? Math.round((job.processedItems / job.totalItems) * 100)
    : 0;
  const inProgressPercent = job.totalItems
    ? Math.round((inProgress / job.totalItems) * 100)
    : 0;
  const percent = Math.min(completedPercent + inProgressPercent, 100);
  const canReview = ['completed', 'partial'].includes(job.status);
  const isRunning = job.status === 'processing';

  return (
    <div className="mt-4 space-y-4">
      {/* 区域 1：实时面板 */}
      <Card>
        {pollingMode && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm flex justify-between items-center">
            <span>已切换为轮询模式，每 {POLLING_INTERVAL_MS / 1000} 秒更新一次进度。</span>
            <Button size="small" onClick={handleReconnect}>
              尝试恢复实时连接
            </Button>
          </div>
        )}
        {connectionError && !pollingMode && (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm flex justify-between items-center">
            <span>连接已断开，进度可能不是最新的。</span>
            <Button size="small" onClick={handleReconnect}>
              重新连接
            </Button>
          </div>
        )}
        {retrying && !connectionError && !pollingMode && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
            正在重新连接... (第 {retryCountRef.current} 次)
          </div>
        )}

        <div className="mb-4">
          <Progress
            percent={percent}
            success={{ percent: completedPercent }}
            status={job.status === 'failed' ? 'exception' : undefined}
          />
          <div className="flex justify-between text-gray-500 mt-2">
            <span>
              已完成 {job.processedItems}/{job.totalItems}
              {inProgress > 0 && <span className="text-blue-500">，处理中 {inProgress}</span>}
            </span>
            <span>
              成功 {job.successItems} | 失败 {job.failedItems}
            </span>
          </div>
        </div>

        {/* 正在处理的 items */}
        {isRunning && job.activeItems && job.activeItems.length > 0 && (
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-600 mb-1">
              正在处理：
            </div>
            <div className="space-y-1">
              {job.activeItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-sm text-gray-500 pl-2"
                >
                  <Tag color={STATUS_COLORS[item.status] || 'default'} className="m-0">
                    {STATUS_LABELS[item.status] || item.status}
                  </Tag>
                  <span className="truncate">{item.sourceUrl}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最近完成的 items */}
        {job.recentItems && job.recentItems.length > 0 && (
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-600 mb-1">
              最近完成：
            </div>
            <div className="space-y-1">
              {job.recentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-sm text-gray-500 pl-2"
                >
                  <Tag color={STATUS_COLORS[item.status] || 'default'} className="m-0">
                    {STATUS_LABELS[item.status] || item.status}
                  </Tag>
                  <span className="truncate">{item.sourceUrl}</span>
                  {item.errorMessage && (
                    <span className="text-red-400 truncate">
                      — {item.errorMessage}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {isRunning && (
            <Button danger onClick={handleCancel} loading={cancelling}>
              取消导入
            </Button>
          )}
          {job.failedItems > 0 && (
            <Button onClick={handleRetry}>重试失败的</Button>
          )}
          {canReview && (
            <Button
              type="primary"
              href={`/admin/products?tab=review&jobId=${jobId}`}
            >
              去审核
            </Button>
          )}
        </div>
      </Card>

      {/* 区域 2：全量 items 表格（按需加载） */}
      <Card>
        <Button type="link" onClick={handleToggleItems} className="p-0 mb-2">
          {showItemsTable
            ? '收起全部 items'
            : `查看全部 items (${job.totalItems})`}
        </Button>

        {showItemsTable && (
          <>
            <Tabs
              activeKey={statusFilter || 'all'}
              onChange={handleStatusTabChange}
              size="small"
              items={[
                { key: 'all', label: `全部 ${job.totalItems}` },
                ...(job.failedItems > 0
                  ? [{ key: 'failed', label: `失败 ${job.failedItems}` }]
                  : []),
                ...(job.successItems > 0
                  ? [{ key: 'review', label: `待审核` }]
                  : []),
                {
                  key: 'pending',
                  label: `待处理`,
                },
              ]}
            />
            <Table
              dataSource={itemsData}
              columns={columns}
              rowKey="id"
              size="small"
              loading={itemsLoading}
              pagination={{
                current: itemsPage,
                pageSize: 20,
                total: itemsTotal,
                onChange: handlePageChange,
                showTotal: (total) => `共 ${total} 条`,
                showSizeChanger: false,
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
