'use client';

import { use } from 'react';
import { useState } from 'react';
import {
  App,
  Card,
  Table,
  Tag,
  Image,
  Progress,
  Statistic,
  Button,
  Spin,
  Modal,
  Timeline,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { post } from '@/lib/api';
import useSWR from 'swr';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { fetcher } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface ProcessingLogEntry {
  ts: string;
  event: string;
  data?: Record<string, unknown>;
}

interface PublishDecisionStats {
  active: number;
  pendingReview: number;
}

interface FailureReasonStat {
  code: string;
  label: string;
  count: number;
  actionableCount: number;
}

interface SplitItem {
  id: string;
  attrId: number;
  variantValue: string;
  imageUrl: string;
  price: number;
  skuCount: number;
  status: string;
  productId?: string;
  errorMessage?: string;
  publishDecision?: 'active' | 'pending_review' | null;
  actionable?: boolean;
  failureReasonCode?: string;
  failureReasonLabel?: string;
  suggestedAction?: string;
  processingLog?: ProcessingLogEntry[];
}

interface SplitJobDetail {
  id: string;
  status: string;
  weidianItemId: string;
  weidianTitle?: string;
  splitDimension: string;
  sourceUrl?: string;
  productGroupId: string;
  totalVariantCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  actionableFailureCount: number;
  publishDecisionStats: PublishDecisionStats;
  failureReasonStats: FailureReasonStat[];
  createdAt: string;
  completedAt?: string;
  items: SplitItem[];
}

const statusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  analyzing: { color: 'processing', text: '分析中' },
  processing: { color: 'processing', text: '处理中' },
  completed: { color: 'success', text: '已完成' },
  partial_failed: { color: 'warning', text: '部分失败' },
  failed: { color: 'error', text: '失败' },
};

const itemStatusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待' },
  processing: { color: 'processing', text: '处理中' },
  success: { color: 'success', text: '成功' },
  failed: { color: 'error', text: '失败' },
  duplicate: { color: 'warning', text: '重复' },
};

export default function SkuSplitJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();

  const isProcessing = (status: string) =>
    ['pending', 'analyzing', 'processing'].includes(status);

  const { data: job, mutate } = useSWR<SplitJobDetail>(
    isReady ? `/products/sku-split/${id}` : null,
    fetcher,
    {
      refreshInterval: (data) =>
        data && isProcessing(data.status) ? 3000 : 0,
      revalidateOnFocus: false,
    },
  );

  const [logItem, setLogItem] = useState<SplitItem | null>(null);
  const canRetry = job?.status === 'failed' || job?.status === 'partial_failed';

  const handleRetry = async () => {
    try {
      await post(`/products/sku-split/${id}/retry`);
      message.success('任务已重新加入队列');
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '重试失败';
      message.error(msg);
    }
  };

  if (!job) {
    return (
      <div className="text-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  const percent =
    job.totalVariantCount > 0
      ? Math.round((job.processedCount / job.totalVariantCount) * 100)
      : 0;

  const statusInfo = statusConfig[job.status] || {
    color: 'default',
    text: job.status,
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/admin/products/sku-split')}
          >
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">拆分任务详情</h1>
            <p className="text-gray-500 text-sm">
              微店 ID: {job.weidianItemId}
              {job.weidianTitle && ` · ${job.weidianTitle}`}
            </p>
          </div>
        </div>
        {canRetry && (
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRetry}
          >
            重试失败项
          </Button>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-4">
        <Card>
          <Statistic title="状态" valueRender={() => <Tag color={statusInfo.color}>{statusInfo.text}</Tag>} value=" " />
        </Card>
        <Card>
          <Statistic
            title="总变体"
            value={job.totalVariantCount}
            suffix={`/ 已处理 ${job.processedCount}`}
          />
        </Card>
        <Card>
          <Statistic
            title="成功"
            value={job.successCount}
            valueStyle={{ color: '#52c41a' }}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
        <Card>
          <Statistic
            title="失败"
            value={job.failedCount}
            valueStyle={{ color: job.failedCount > 0 ? '#ff4d4f' : undefined }}
            prefix={<CloseCircleOutlined />}
          />
        </Card>
        <Card>
          <Statistic
            title="重复"
            value={job.duplicateCount}
            prefix={<CopyOutlined />}
          />
        </Card>
        <Card>
          <Statistic
            title="自动上架"
            value={job.publishDecisionStats.active}
            valueStyle={{ color: '#1677ff' }}
          />
        </Card>
        <Card>
          <Statistic
            title="待审核"
            value={job.publishDecisionStats.pendingReview}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
        <Card>
          <Statistic
            title="可人工处理失败"
            value={job.actionableFailureCount}
            valueStyle={{ color: job.actionableFailureCount > 0 ? '#fa8c16' : undefined }}
          />
        </Card>
      </div>

      {/* 进度条 */}
      {isProcessing(job.status) && (
        <Card className="mb-4">
          <Progress
            percent={percent}
            status="active"
            format={() => `${job.processedCount} / ${job.totalVariantCount}`}
          />
        </Card>
      )}

      {job.failureReasonStats.length > 0 && (
        <Card title="失败原因统计" className="mb-4">
          <div className="flex flex-wrap gap-2">
            {job.failureReasonStats.map((reason) => (
              <Tag key={reason.code} color={reason.actionableCount > 0 ? 'orange' : 'default'}>
                {reason.label} {reason.count}
                {reason.actionableCount > 0
                  ? ` · 可处理 ${reason.actionableCount}`
                  : ''}
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {/* 变体列表 */}
      <Card title="变体详情">
        <Table
          dataSource={job.items}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            {
              title: '款式图',
              dataIndex: 'imageUrl',
              width: 80,
              render: (url: string) =>
                url ? (
                  <Image src={url} alt="variant" width={50} height={50} className="rounded object-cover" />
                ) : (
                  '-'
                ),
            },
            {
              title: '变体名称',
              dataIndex: 'variantValue',
              ellipsis: true,
            },
            {
              title: '价格',
              dataIndex: 'price',
              width: 80,
              render: (v: number) => `¥${v}`,
            },
            {
              title: '尺码数',
              dataIndex: 'skuCount',
              width: 80,
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (status: string) => {
                const info = itemStatusConfig[status] || {
                  color: 'default',
                  text: status,
                };
                return <Tag color={info.color}>{info.text}</Tag>;
              },
            },
            {
              title: '发布判定',
              dataIndex: 'publishDecision',
              width: 110,
              render: (decision: SplitItem['publishDecision']) =>
                decision === 'active' ? (
                  <Tag color="success">自动上架</Tag>
                ) : decision === 'pending_review' ? (
                  <Tag color="warning">待审核</Tag>
                ) : (
                  '-'
                ),
            },
            {
              title: '错误',
              dataIndex: 'errorMessage',
              ellipsis: true,
              render: (_: string, record: SplitItem) =>
                record.errorMessage ? (
                  <div className="text-xs">
                    <div className="text-red-500">{record.errorMessage}</div>
                    {record.actionable && (
                      <div className="mt-1">
                        <Tag color="orange">可人工处理</Tag>
                        {record.failureReasonLabel && (
                          <span className="text-orange-600">{record.failureReasonLabel}</span>
                        )}
                        {record.suggestedAction && (
                          <div className="text-gray-500 mt-1">
                            建议: {record.suggestedAction}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  '-'
                ),
            },
            {
              title: '操作',
              key: 'action',
              width: 140,
              render: (_, record: SplitItem) => (
                <div className="flex gap-1">
                  {record.processingLog && record.processingLog.length > 0 && (
                    <Button
                      type="link"
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={() => setLogItem(record)}
                    >
                      日志
                    </Button>
                  )}
                  {record.productId && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() =>
                        router.push(`/admin/products/${record.productId}`)
                      }
                    >
                      查看
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 处理日志弹窗 */}
      <Modal
        title={`处理日志 - ${logItem?.variantValue || ''}`}
        open={!!logItem}
        onCancel={() => setLogItem(null)}
        footer={null}
        width={520}
      >
        {logItem?.processingLog && logItem.processingLog.length > 0 ? (
          <Timeline
            items={logItem.processingLog.map((entry) => ({
              color:
                entry.event.includes('失败') || entry.event.includes('错误')
                  ? 'red'
                  : entry.event.includes('重复')
                    ? 'orange'
                    : entry.event.includes('成功') ||
                        entry.event.includes('通过') ||
                        entry.event.includes('写入')
                      ? 'green'
                      : 'blue',
              children: (
                <div>
                  <div className="font-medium">{entry.event}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(entry.ts).toLocaleString('zh-CN')}
                  </div>
                  {entry.data && (
                    <pre className="text-xs bg-gray-50 rounded p-2 mt-1 overflow-auto max-h-32">
                      {JSON.stringify(entry.data, null, 2)}
                    </pre>
                  )}
                </div>
              ),
            }))}
          />
        ) : (
          <p className="text-gray-400">暂无日志</p>
        )}
      </Modal>
    </div>
  );
}
