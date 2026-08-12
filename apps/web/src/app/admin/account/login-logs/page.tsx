'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  App,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LogoutOutlined,
  GoogleOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { get } from '@/lib/api';
import { EmptyState } from '../../components/EmptyState';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

const { RangePicker } = DatePicker;
const LOGIN_LOGS_CACHE_TTL_MS = 5 * 60 * 1000;

interface LoginLog {
  id: string;
  userId?: string;
  email?: string;
  eventType: 'login' | 'logout' | 'failed' | 'oauth';
  provider: string;
  ipAddress?: string;
  geoLocation?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    username?: string;
  };
}

interface LoginStats {
  totalLogins: number;
  totalFailed: number;
  last24hLogins: number;
  last24hFailed: number;
}

const eventTypeOptions = [
  { value: '', label: '全部事件' },
  { value: 'login', label: '登录成功' },
  { value: 'logout', label: '登出' },
  { value: 'failed', label: '登录失败' },
  { value: 'oauth', label: 'OAuth 登录' },
];

const getEventTypeTag = (eventType: string) => {
  switch (eventType) {
    case 'login':
      return <Tag icon={<CheckCircleOutlined />} color="success">登录</Tag>;
    case 'logout':
      return <Tag icon={<LogoutOutlined />} color="default">登出</Tag>;
    case 'failed':
      return <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>;
    case 'oauth':
      return <Tag icon={<GoogleOutlined />} color="processing">OAuth</Tag>;
    default:
      return <Tag>{eventType}</Tag>;
  }
};

const getProviderTag = (provider: string) => {
  switch (provider) {
    case 'email':
      return <Tag color="blue">邮箱</Tag>;
    case 'google':
      return <Tag color="red">Google</Tag>;
    case 'discord':
      return <Tag color="default">Legacy OAuth</Tag>;
    case 'apple':
      return <Tag color="default">Apple</Tag>;
    default:
      return <Tag>{provider}</Tag>;
  }
};

export default function LoginLogsPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LoginStats | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [eventType, setEventType] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const logsCacheKey = useMemo(() => {
    const start = dateRange?.[0]?.format('YYYY-MM-DD') || '';
    const end = dateRange?.[1]?.format('YYYY-MM-DD') || '';
    return `admin:account:login-logs:page=${page}:limit=${pageSize}:event=${eventType}:email=${email}:start=${start}:end=${end}`;
  }, [dateRange, email, eventType, page, pageSize]);

  useEffect(() => {
    const cached = readSessionCache<{
      data: LoginLog[];
      total: number;
    }>(logsCacheKey, LOGIN_LOGS_CACHE_TTL_MS);
    if (!cached) return;

    setLogs(cached.data);
    setTotal(cached.total);
    setLoading(false);
  }, [logsCacheKey]);

  useEffect(() => {
    const cachedStats = readSessionCache<LoginStats>(
      'admin:account:login-stats',
      LOGIN_LOGS_CACHE_TTL_MS,
    );
    if (!cachedStats) return;
    setStats(cachedStats);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(pageSize),
      };

      if (eventType) params.eventType = eventType;
      if (email) params.email = email;
      if (dateRange) {
        params.startDate = dateRange[0].startOf('day').toISOString();
        params.endDate = dateRange[1].endOf('day').toISOString();
      }

      const result = await get<{ data: LoginLog[]; total: number }>('/auth/admin/login-logs', params);
      setLogs(result.data);
      setTotal(result.total);
      writeSessionCache(logsCacheKey, result);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : '获取登录日志失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange, email, eventType, logsCacheKey, message, page, pageSize]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await get<LoginStats>('/auth/admin/login-stats');
      setStats(data);
      writeSessionCache('admin:account:login-stats', data);
    } catch {
      // 统计获取失败时静默处理
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const columns: ColumnsType<LoginLog> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '事件',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 120,
      render: (type: string) => getEventTypeTag(type),
    },
    {
      title: '邮箱',
      key: 'email',
      width: 220,
      render: (_, record) => record.user?.email || record.email || '-',
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      width: 100,
      render: (provider: string) => getProviderTag(provider),
    },
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (ip: string) => ip || '-',
    },
    {
      title: '位置',
      dataIndex: 'geoLocation',
      key: 'geoLocation',
      width: 150,
      render: (location: string) => location || '-',
    },
    {
      title: '用户代理',
      dataIndex: 'userAgent',
      key: 'userAgent',
      ellipsis: true,
      render: (ua: string) => {
        if (!ua) return '-';
        // Simplify user agent display
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return ua.substring(0, 50) + '...';
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">登录日志</h1>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总登录数"
                value={stats.totalLogins}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总失败数"
                value={stats.totalFailed}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="过去24小时登录"
                value={stats.last24hLogins}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="过去24小时失败"
                value={stats.last24hFailed}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card>
        <Space wrap size="middle">
          <Input.Search
            placeholder="按邮箱搜索"
            allowClear
            style={{ width: 250 }}
            onSearch={(value) => {
              setEmail(value);
              setPage(1);
            }}
          />
          <Select
            style={{ width: 150 }}
            placeholder="事件类型"
            options={eventTypeOptions}
            value={eventType}
            onChange={(value) => {
              setEventType(value);
              setPage(1);
            }}
          />
          <RangePicker
            onChange={(dates) => {
              setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
              setPage(1);
            }}
          />
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: (
              <EmptyState
                icon={<FileSearchOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                title="暂无登录记录"
                description="尝试调整筛选条件或时间范围"
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}
