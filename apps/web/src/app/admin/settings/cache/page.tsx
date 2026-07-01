'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button, Spin, App, Space, Alert } from 'antd';
import {
  ClearOutlined,
  DeleteOutlined,
  SyncOutlined,
  CloudSyncOutlined,
  FieldTimeOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { get, post } from '@/lib/api';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';

export default function CacheSettingsPage() {
  const { message } = App.useApp();
  const { isReady, token } = useAdminAuthReady();

  // ISR 缓存状态
  const [cacheClearing, setCacheClearing] = useState(false);
  const [slugInput, setSlugInput] = useState('');

  // 死链统计状态
  const [deadLinkStats, setDeadLinkStats] = useState<{
    suspected: number;
    confirmed: number;
  } | null>(null);
  const [deadLinkLoading, setDeadLinkLoading] = useState(true);

  // 微店缓存刷新状态
  const [weidianCacheStatus, setWeidianCacheStatus] = useState<{
    config: {
      cooldownHours: number;
      staleThresholdDays: number;
      batchSize: number;
      weeklySchedule: string;
    };
  } | null>(null);
  const [weidianCacheLoading, setWeidianCacheLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanForm, setScanForm] = useState({ staleDays: 25, batchSize: 50 });

  // 清除所有产品页面缓存
  const handleClearAllCache = async () => {
    if (!isReady || !token) return;
    setCacheClearing(true);
    try {
      const res = await fetch('/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(`缓存已清除: ${data.revalidated.join(', ')}`);
      } else {
        message.error(data.error || '清除缓存失败');
      }
    } catch {
      message.error('清除缓存失败');
    } finally {
      setCacheClearing(false);
    }
  };

  // 清除特定产品缓存
  const handleClearProductCache = async () => {
    if (!slugInput.trim()) {
      message.warning('请输入产品 slug');
      return;
    }
    if (!isReady || !token) return;
    setCacheClearing(true);
    try {
      const res = await fetch('/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ slug: slugInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(`产品缓存已清除: ${data.revalidated.join(', ')}`);
        setSlugInput('');
      } else {
        message.error(data.error || '清除缓存失败');
      }
    } catch {
      message.error('清除缓存失败');
    } finally {
      setCacheClearing(false);
    }
  };

  // 获取死链统计
  const fetchDeadLinkStats = useCallback(async () => {
    if (!isReady) return;
    setDeadLinkLoading(true);
    try {
      const data = await get<{ suspected: number; confirmed: number }>('/weidian/dead-links/stats');
      setDeadLinkStats(data);
    } catch {
      // 静默处理
    } finally {
      setDeadLinkLoading(false);
    }
  }, [isReady]);

  // 获取微店缓存刷新状态
  const fetchWeidianCacheStatus = useCallback(async () => {
    if (!isReady) return;
    setWeidianCacheLoading(true);
    try {
      const data = await get<typeof weidianCacheStatus>('/weidian/cache/status');
      setWeidianCacheStatus(data);
    } catch {
      // 加载失败时静默处理
    } finally {
      setWeidianCacheLoading(false);
    }
  }, [isReady]);

  // 手动触发微店缓存扫描
  const handleWeidianCacheScan = async () => {
    if (!isReady) return;
    setScanLoading(true);
    try {
      const data = await post<{ message?: string; total?: number }>('/weidian/cache/scan', {
        staleDays: scanForm.staleDays,
        batchSize: scanForm.batchSize,
      });
      message.success(data.message || `已将 ${data.total} 个产品加入刷新队列`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '触发扫描失败');
    } finally {
      setScanLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    fetchWeidianCacheStatus();
    fetchDeadLinkStats();
  }, [fetchWeidianCacheStatus, fetchDeadLinkStats, isReady]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">缓存管理</h2>

      {/* ISR 缓存管理 */}
      <Card
        title={
          <Space>
            <ClearOutlined />
            <span>ISR 页面缓存</span>
          </Space>
        }
      >
        <div className="space-y-4">
          <Alert
            type="info"
            showIcon
            message="产品页面使用 ISR 缓存（1小时），更新产品后可能需要手动清除缓存才能看到最新内容。"
          />

          <div className="flex items-center gap-4">
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              loading={cacheClearing}
              onClick={handleClearAllCache}
            >
              清除所有产品缓存
            </Button>
            <span className="text-gray-500 text-sm">
              清除首页和产品列表页的缓存
            </span>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-2">清除特定产品缓存：</div>
            <Space.Compact style={{ width: 400 }}>
              <Input
                placeholder="输入产品 slug，如 nike-air-max-90-abc123"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                onPressEnter={handleClearProductCache}
              />
              <Button
                type="primary"
                icon={<ClearOutlined />}
                loading={cacheClearing}
                onClick={handleClearProductCache}
              >
                清除
              </Button>
            </Space.Compact>
          </div>
        </div>
      </Card>

      {/* 微店数据缓存刷新 */}
      <Card
        title={
          <Space>
            <CloudSyncOutlined />
            <span>微店数据缓存刷新</span>
          </Space>
        }
      >
        {weidianCacheLoading ? (
          <div className="flex justify-center py-4">
            <Spin />
          </div>
        ) : (
          <div className="space-y-4">
            {weidianCacheStatus && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-2">当前配置</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FieldTimeOutlined className="text-gray-400" />
                    <span className="text-gray-600">冷却时间:</span>
                    <span>{weidianCacheStatus.config.cooldownHours} 小时</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FieldTimeOutlined className="text-gray-400" />
                    <span className="text-gray-600">过期阈值:</span>
                    <span>{weidianCacheStatus.config.staleThresholdDays} 天</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FieldTimeOutlined className="text-gray-400" />
                    <span className="text-gray-600">每批数量:</span>
                    <span>{weidianCacheStatus.config.batchSize} 个</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FieldTimeOutlined className="text-gray-400" />
                    <span className="text-gray-600">定时扫描:</span>
                    <span>{weidianCacheStatus.config.weeklySchedule}</span>
                  </div>
                </div>
              </div>
            )}

            <Alert
              type="info"
              showIcon
              message="缓存刷新策略"
              description={
                <ul className="list-disc list-inside text-sm mt-1">
                  <li>用户点击购买按钮时，自动触发缓存刷新（4小时冷却期）</li>
                  <li>每周日凌晨 3 点自动扫描快过期的缓存</li>
                  <li>可手动触发扫描，批量刷新过期缓存</li>
                </ul>
              }
            />

            <div className="border rounded-lg p-4">
              <div className="text-sm font-medium mb-3">手动触发扫描</div>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    扫描多少天前的数据
                  </label>
                  <Input
                    type="number"
                    value={scanForm.staleDays}
                    onChange={(e) =>
                      setScanForm((f) => ({
                        ...f,
                        staleDays: parseInt(e.target.value) || 25,
                      }))
                    }
                    style={{ width: 100 }}
                    min={1}
                    max={30}
                    suffix="天"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    每批处理数量
                  </label>
                  <Input
                    type="number"
                    value={scanForm.batchSize}
                    onChange={(e) =>
                      setScanForm((f) => ({
                        ...f,
                        batchSize: parseInt(e.target.value) || 50,
                      }))
                    }
                    style={{ width: 100 }}
                    min={10}
                    max={200}
                    suffix="个"
                  />
                </div>
                <Button
                  type="primary"
                  icon={<SyncOutlined spin={scanLoading} />}
                  loading={scanLoading}
                  onClick={handleWeidianCacheScan}
                >
                  开始扫描
                </Button>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                扫描将找出超过指定天数未刷新的产品，分批加入刷新队列
              </div>
            </div>

            <Button
              icon={<SyncOutlined />}
              onClick={fetchWeidianCacheStatus}
              loading={weidianCacheLoading}
            >
              刷新状态
            </Button>
          </div>
        )}
      </Card>

      {/* 死链检测 */}
      <Card
        title={
          <Space>
            <WarningOutlined className="text-orange-500" />
            <span>死链检测</span>
          </Space>
        }
      >
        {deadLinkLoading ? (
          <div className="flex justify-center py-4">
            <Spin />
          </div>
        ) : (
          <div className="space-y-4">
            <Alert
              type="info"
              showIcon
              message="死链检测说明"
              description="缓存刷新时自动检测微店死链（商品被删除/下架）。连续 2 次失败（间隔 ≥ 24h）确认为死链，由管理员手动决定处理方式。"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {deadLinkStats?.suspected ?? 0}
                </div>
                <div className="text-sm text-yellow-700 mt-1">疑似死链（首次失败）</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {deadLinkStats?.confirmed ?? 0}
                </div>
                <div className="text-sm text-red-700 mt-1">确认死链（≥2次失败）</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/products?deadLink=suspected">
                <Button icon={<WarningOutlined />}>
                  查看疑似死链产品
                </Button>
              </Link>
              <Link href="/admin/products?deadLink=confirmed">
                <Button danger icon={<WarningOutlined />}>
                  查看确认死链产品
                </Button>
              </Link>
              <Button
                icon={<SyncOutlined />}
                onClick={fetchDeadLinkStats}
                loading={deadLinkLoading}
              >
                刷新统计
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
