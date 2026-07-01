'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Spin, App, Space, Alert, Tag, Radio, Statistic, Descriptions } from 'antd';
import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  SwapOutlined,
  WarningOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { get, put, post } from '@/lib/api';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';

interface IndexStatus {
  configMatch: boolean;
  missingSort: string[];
  missingFilter: string[];
  documentCount: number;
  dbProductCount: number;
}

interface DegradationStats {
  count: number;
  lastAt: string | null;
}

interface EngineStatus {
  current: string;
  meilisearchHealthy: boolean;
  options: string[];
  indexStatus: IndexStatus | null;
  degradation: DegradationStats;
}

const ENGINE_LABELS: Record<string, string> = {
  meilisearch: 'Meilisearch',
  postgres: 'PostgreSQL',
};

const SEARCH_ENGINE_CACHE_KEY = 'admin:settings:search-engine';
const SEARCH_ENGINE_CACHE_TTL_MS = 5 * 60 * 1000;

export default function SearchEngineSettingsPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    const cached = readSessionCache<EngineStatus>(
      SEARCH_ENGINE_CACHE_KEY,
      SEARCH_ENGINE_CACHE_TTL_MS,
    );
    if (!cached) return;

    setStatus(cached);
    setSelected(cached.current);
    setLoading(false);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!isReady) {
      return;
    }

    setLoading(true);
    try {
      const data = await get<EngineStatus>('/admin/meilisearch/engine');
      setStatus(data);
      setSelected(data.current);
      writeSessionCache(SEARCH_ENGINE_CACHE_KEY, data);
    } catch {
      message.error('获取搜索引擎状态失败');
    } finally {
      setLoading(false);
    }
  }, [isReady, message]);

  useEffect(() => {
    if (!isReady) return;
    fetchStatus();
  }, [isReady, fetchStatus]);

  const handleSwitch = async () => {
    if (!selected || selected === status?.current) return;
    setSwitching(true);
    try {
      const data = await put<{ engine: string; message: string }>(
        '/admin/meilisearch/engine',
        { engine: selected },
      );
      message.success(data.message);
      setStatus((prev) => prev ? { ...prev, current: data.engine } : prev);
    } catch {
      message.error('切换搜索引擎失败');
    } finally {
      setSwitching(false);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const data = await post<{ total: number; synced: number }>('/admin/meilisearch/sync', {});
      message.success(`全量同步完成：${data.synced}/${data.total} 条`);
      fetchStatus();
    } catch {
      message.error('全量同步失败');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  const idx = status?.indexStatus;
  const deg = status?.degradation;
  const hasDegradation = (deg?.count ?? 0) > 0;
  const hasConfigIssue = idx && !idx.configMatch;
  const docMismatch = idx && Math.abs(idx.documentCount - idx.dbProductCount) > 5;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">搜索引擎</h2>

      {/* P2: 降级警告 */}
      {hasDegradation && (
        <Alert
          type="error"
          showIcon
          icon={<ThunderboltOutlined />}
          message={`搜索降级警告：最近 1 小时内 ${deg!.count} 次降级到 PostgreSQL`}
          description={`最后降级时间：${deg!.lastAt ? new Date(deg!.lastAt).toLocaleString() : '-'}。请检查 MeiliSearch 索引配置或执行全量同步。`}
        />
      )}

      {/* P0: 索引配置异常 */}
      {hasConfigIssue && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="索引配置不一致"
          description={
            <div>
              {idx!.missingSort.length > 0 && (
                <div>缺少可排序字段：<Tag color="orange">{idx!.missingSort.join(', ')}</Tag></div>
              )}
              {idx!.missingFilter.length > 0 && (
                <div>缺少可筛选字段：<Tag color="orange">{idx!.missingFilter.join(', ')}</Tag></div>
              )}
              <div className="mt-2">请执行全量同步以修复配置。</div>
            </div>
          }
        />
      )}

      {/* 引擎状态 */}
      <Card
        title={<Space><SearchOutlined /><span>引擎状态</span></Space>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">当前引擎</div>
              <div className="text-lg font-semibold">
                {ENGINE_LABELS[status?.current || ''] || status?.current}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">MeiliSearch 状态</div>
              <div className="text-lg">
                {status?.meilisearchHealthy ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">健康</Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="error">不可用</Tag>
                )}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">索引配置</div>
              <div className="text-lg">
                {!idx ? (
                  <Tag color="default">未知</Tag>
                ) : idx.configMatch ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">正常</Tag>
                ) : (
                  <Tag icon={<WarningOutlined />} color="warning">不一致</Tag>
                )}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">降级次数（1h）</div>
              <div className="text-lg">
                {hasDegradation ? (
                  <Tag icon={<ThunderboltOutlined />} color="error">{deg!.count} 次</Tag>
                ) : (
                  <Tag color="success">0</Tag>
                )}
              </div>
            </div>
          </div>

          {/* P1: 索引文档数 */}
          {idx && (
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label={<Space><DatabaseOutlined />索引文档数</Space>}>
                <Statistic value={idx.documentCount} valueStyle={{ fontSize: 14 }} />
              </Descriptions.Item>
              <Descriptions.Item label="数据库活跃商品数">
                <Space>
                  <Statistic value={idx.dbProductCount} valueStyle={{ fontSize: 14 }} />
                  {docMismatch && (
                    <Tag color="warning">差异 {Math.abs(idx.documentCount - idx.dbProductCount)}</Tag>
                  )}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          )}

          <Space>
            <Button icon={<SyncOutlined />} onClick={fetchStatus} loading={loading}>
              刷新状态
            </Button>
            {status?.meilisearchHealthy && (
              <Button
                type="primary"
                icon={<DatabaseOutlined />}
                onClick={handleFullSync}
                loading={syncing}
                danger={!!(hasConfigIssue || docMismatch)}
              >
                {syncing ? '同步中...' : '全量同步'}
              </Button>
            )}
          </Space>

          {!status?.meilisearchHealthy && (
            <Alert
              type="info"
              showIcon
              message="MeiliSearch 启动方式"
              description={<code>docker compose up -d meilisearch</code>}
            />
          )}
        </div>
      </Card>

      {/* 切换引擎 */}
      <Card
        title={<Space><SwapOutlined /><span>切换引擎</span></Space>}
      >
        <div className="space-y-4">
          <Alert
            type="info"
            showIcon
            message="切换说明"
            description="切换后立即生效，无需重启服务。Meilisearch 故障时系统会自动降级到 PostgreSQL。"
          />

          {!status?.meilisearchHealthy && (
            <Alert
              type="warning"
              showIcon
              message="Meilisearch 当前不可用，切换到 Meilisearch 后搜索将自动降级到 PostgreSQL。"
            />
          )}

          <div>
            <div className="text-sm text-gray-600 mb-3">选择搜索引擎：</div>
            <Radio.Group
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              size="large"
            >
              {status?.options.map((engine) => (
                <Radio.Button key={engine} value={engine}>
                  {ENGINE_LABELS[engine] || engine}
                  {engine === status.current && ' (当前)'}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>

          <Button
            type="primary"
            icon={<SwapOutlined />}
            loading={switching}
            disabled={!selected || selected === status?.current}
            onClick={handleSwitch}
          >
            确认切换
          </Button>
        </div>
      </Card>
    </div>
  );
}
