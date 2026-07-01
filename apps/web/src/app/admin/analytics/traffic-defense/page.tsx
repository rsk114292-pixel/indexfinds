'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, post } from '@/lib/api';
import { TableSkeleton } from '../../components/PageSkeleton';

type TrafficBlockStatus = 'pending_sync' | 'active' | 'ignored' | 'expired';

type TrafficBlock = {
  id: string;
  target: string;
  targetType: 'ipv4' | 'ipv4_cidr';
  scope: 'product_paths';
  status: TrafficBlockStatus;
  reason: string | null;
  metricsSnapshot: Record<string, unknown> | null;
  expiresAt: string | null;
  appliedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type TrafficDefenseCandidate = {
  target: string;
  targetType: 'ipv4' | 'ipv4_cidr';
  scope: 'product_paths';
  topCountry: string | null;
  countries: number;
  sessions: number;
  ips: number;
  devices: number;
  directSessions: number;
  productLandings: number;
  directPct: number;
  productLandingPct: number;
  risk: 'high_proxy_pool' | 'direct_product_rotation' | 'watch';
  sampleIp: string | null;
  firstSeen: string;
  lastSeen: string;
  topLandingPage: string | null;
  existingBlock: TrafficBlock | null;
};

type BlocksResponse = {
  data: TrafficBlock[];
  total: number;
  page: number;
  limit: number;
};

const riskLabels: Record<TrafficDefenseCandidate['risk'], string> = {
  high_proxy_pool: '高危代理池',
  direct_product_rotation: '直达轮换',
  watch: '观察',
};

const statusLabels: Record<TrafficBlockStatus, string> = {
  pending_sync: 'API 生效/待同步',
  active: '已生效',
  ignored: '已忽略',
  expired: '已过期',
};

const statusColors: Record<TrafficBlockStatus, string> = {
  pending_sync: 'gold',
  active: 'red',
  ignored: 'blue',
  expired: 'default',
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatTime(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function buildMetricsSnapshot(candidate: TrafficDefenseCandidate) {
  return {
    sessions: candidate.sessions,
    ips: candidate.ips,
    devices: candidate.devices,
    directSessions: candidate.directSessions,
    productLandings: candidate.productLandings,
    directPct: candidate.directPct,
    productLandingPct: candidate.productLandingPct,
    risk: candidate.risk,
    sampleIp: candidate.sampleIp,
    topCountry: candidate.topCountry,
    countries: candidate.countries,
    firstSeen: candidate.firstSeen,
    lastSeen: candidate.lastSeen,
    topLandingPage: candidate.topLandingPage,
  };
}

export default function TrafficDefensePage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [minutes, setMinutes] = useState(15);
  const [candidateLimit, setCandidateLimit] = useState(20);
  const [blockStatus, setBlockStatus] = useState<TrafficBlockStatus | undefined>();
  const [candidates, setCandidates] = useState<TrafficDefenseCandidate[]>([]);
  const [blocks, setBlocks] = useState<TrafficBlock[]>([]);
  const [blockTotal, setBlockTotal] = useState(0);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const data = await get<TrafficDefenseCandidate[]>(
        '/admin/analytics/traffic/defense/candidates',
        { minutes, limit: candidateLimit },
      );
      setCandidates(data || []);
    } catch {
      message.error('获取风险候选失败');
    } finally {
      setLoadingCandidates(false);
    }
  }, [candidateLimit, message, minutes]);

  const fetchBlocks = useCallback(async () => {
    setLoadingBlocks(true);
    try {
      const data = await get<BlocksResponse>(
        '/admin/analytics/traffic/defense/blocks',
        { page: 1, limit: 20, status: blockStatus },
      );
      setBlocks(data.data || []);
      setBlockTotal(data.total || 0);
    } catch {
      message.error('获取封禁记录失败');
    } finally {
      setLoadingBlocks(false);
    }
  }, [blockStatus, message]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchCandidates(), fetchBlocks()]);
  }, [fetchBlocks, fetchCandidates]);

  useEffect(() => {
    if (!isReady) return;
    void refreshAll();
  }, [isReady, refreshAll]);

  const handleBlock = useCallback(
    async (candidate: TrafficDefenseCandidate, ttlHours: number) => {
      const key = `${candidate.target}:${ttlHours}`;
      setActionKey(key);
      try {
        await post('/admin/analytics/traffic/defense/blocks', {
          target: candidate.target,
          scope: candidate.scope,
          ttlHours,
          reason: candidate.risk,
          metricsSnapshot: buildMetricsSnapshot(candidate),
        });
        message.success('已启用 API 防御，待边缘同步');
        await refreshAll();
      } catch (error) {
        message.error(error instanceof Error ? error.message : '提交封禁失败');
      } finally {
        setActionKey(null);
      }
    },
    [message, refreshAll],
  );

  const handleIgnore = useCallback(
    async (candidate: TrafficDefenseCandidate) => {
      const key = `${candidate.target}:ignore`;
      setActionKey(key);
      try {
        await post('/admin/analytics/traffic/defense/ignore', {
          target: candidate.target,
          scope: candidate.scope,
          ttlHours: 6,
          reason: candidate.risk,
          metricsSnapshot: buildMetricsSnapshot(candidate),
        });
        message.success('已忽略 6 小时');
        await refreshAll();
      } catch (error) {
        message.error(error instanceof Error ? error.message : '忽略失败');
      } finally {
        setActionKey(null);
      }
    },
    [message, refreshAll],
  );

  const handleExpire = useCallback(
    async (block: TrafficBlock) => {
      setActionKey(`${block.id}:expire`);
      try {
        await post(`/admin/analytics/traffic/defense/blocks/${block.id}/expire`);
        message.success('已标记过期');
        await refreshAll();
      } catch (error) {
        message.error(error instanceof Error ? error.message : '操作失败');
      } finally {
        setActionKey(null);
      }
    },
    [message, refreshAll],
  );

  const candidateColumns = useMemo<ColumnsType<TrafficDefenseCandidate>>(
    () => [
      {
        title: '目标',
        dataIndex: 'target',
        width: 150,
        render: (target: string, row) => (
          <Space direction="vertical" size={0}>
            <span className="font-mono text-sm">{target}</span>
            {row.sampleIp && <span className="text-xs text-gray-500">{row.sampleIp}</span>}
          </Space>
        ),
      },
      {
        title: '风险',
        dataIndex: 'risk',
        width: 120,
        render: (risk: TrafficDefenseCandidate['risk']) => (
          <Tag color={risk === 'high_proxy_pool' ? 'red' : risk === 'watch' ? 'gold' : 'orange'}>
            {riskLabels[risk]}
          </Tag>
        ),
      },
      {
        title: '规模',
        width: 190,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <span>{row.sessions} sessions</span>
            <span className="text-xs text-gray-500">
              {row.ips} IPs / {row.devices} devices
            </span>
            <span className="text-xs text-gray-500">
              {row.topCountry || 'Unknown'} / {row.countries || 0} countries
            </span>
          </Space>
        ),
      },
      {
        title: '行为',
        width: 150,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <span>direct {formatPercent(row.directPct)}</span>
            <span className="text-xs text-gray-500">
              product {formatPercent(row.productLandingPct)}
            </span>
          </Space>
        ),
      },
      {
        title: 'Top landing',
        dataIndex: 'topLandingPage',
        ellipsis: true,
        render: (value: string | null) => value || '-',
      },
      {
        title: '状态',
        width: 110,
        render: (_, row) =>
          row.existingBlock ? (
            <Tag color={statusColors[row.existingBlock.status]}>
              {statusLabels[row.existingBlock.status]}
            </Tag>
          ) : (
            <Tag>未处理</Tag>
          ),
      },
      {
        title: '操作',
        width: 260,
        render: (_, row) => {
          const disabled = !!row.existingBlock;
          return (
            <Space wrap>
              {[1, 6, 12, 24].map((ttl) => (
                <Button
                  key={ttl}
                  size="small"
                  danger
                  disabled={disabled}
                  loading={actionKey === `${row.target}:${ttl}`}
                  onClick={() => handleBlock(row, ttl)}
                >
                  封 {ttl}h
                </Button>
              ))}
              <Button
                size="small"
                disabled={disabled}
                loading={actionKey === `${row.target}:ignore`}
                onClick={() => handleIgnore(row)}
              >
                忽略
              </Button>
            </Space>
          );
        },
      },
    ],
    [actionKey, handleBlock, handleIgnore],
  );

  const blockColumns = useMemo<ColumnsType<TrafficBlock>>(
    () => [
      {
        title: '目标',
        dataIndex: 'target',
        width: 150,
        render: (target: string) => <span className="font-mono text-sm">{target}</span>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (status: TrafficBlockStatus) => (
          <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
        ),
      },
      {
        title: '原因',
        dataIndex: 'reason',
        ellipsis: true,
        render: (value: string | null) => value || '-',
      },
      {
        title: '过期时间',
        dataIndex: 'expiresAt',
        width: 180,
        render: formatTime,
      },
      {
        title: '同步时间',
        dataIndex: 'appliedAt',
        width: 180,
        render: formatTime,
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        width: 180,
        render: formatTime,
      },
      {
        title: '操作',
        width: 110,
        render: (_, row) =>
          row.status === 'expired' ? (
            '-'
          ) : (
            <Popconfirm
              title="确认标记过期？"
              onConfirm={() => handleExpire(row)}
            >
              <Button
                size="small"
                icon={<StopOutlined />}
                loading={actionKey === `${row.id}:expire`}
              >
                过期
              </Button>
            </Popconfirm>
          ),
      },
    ],
    [actionKey, handleExpire],
  );

  if (!isReady) {
    return <TableSkeleton rows={8} />;
  }

  return (
    <div className="space-y-6">
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card>
            <div className="text-sm text-gray-500">候选窗口</div>
            <div className="mt-2 flex items-center gap-2">
              <InputNumber
                min={1}
                max={60}
                value={minutes}
                onChange={(value) => setMinutes(value || 15)}
              />
              <span>分钟</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <div className="text-sm text-gray-500">候选数量</div>
            <div className="mt-2">
              <InputNumber
                min={1}
                max={100}
                value={candidateLimit}
                onChange={(value) => setCandidateLimit(value || 20)}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <div className="text-sm text-gray-500">记录状态</div>
            <div className="mt-2 flex items-center gap-2">
              <Select
                className="min-w-36"
                allowClear
                value={blockStatus}
                placeholder="全部"
                onChange={(value) =>
                  setBlockStatus(value as TrafficBlockStatus | undefined)
                }
                options={Object.entries(statusLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Button icon={<ReloadOutlined />} onClick={refreshAll}>
                刷新
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="风险候选">
        <Table
          rowKey="target"
          columns={candidateColumns}
          dataSource={candidates}
          loading={loadingCandidates}
          pagination={false}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Card title={`封禁记录（${blockTotal}）`}>
        <Table
          rowKey="id"
          columns={blockColumns}
          dataSource={blocks}
          loading={loadingBlocks}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
}
