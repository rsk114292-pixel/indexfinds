'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Input, Table, Button, App } from 'antd';
import { SaveOutlined, SyncOutlined } from '@ant-design/icons';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, post, put } from '@/lib/api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

const GENERAL_SETTINGS_CACHE_KEY = 'admin:settings:general';
const GENERAL_SETTINGS_CACHE_TTL_MS = 10 * 60 * 1000;

interface Setting {
  key: string;
  value: string;
  description: string;
  isSecret: boolean;
}

// 已有专用管理页面的 key，从 KV 表中隐藏避免重复
const HIDDEN_KEYS = [
  'ai_api_key', 'ai_model', 'ai_api_endpoint',       // → AI 配置页
  'loongbuy_base_url', 'loongbuy_invitecode',          // → 平台配置页（遗留数据）
  'exchange_rate_last_sync',                            // 内部记录，不展示
  'tracking_gtm_id', 'tracking_ga_id', 'tracking_enabled', // → 追踪与分析页
  'seo_gsc_snapshot',                                   // → SEO 落地页盘点页
];

export default function GeneralSettingsPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const cached = readSessionCache<{
      settings: Setting[];
      lastSync: string | null;
    }>(GENERAL_SETTINGS_CACHE_KEY, GENERAL_SETTINGS_CACHE_TTL_MS);

    if (!cached) return;

    setSettings(cached.settings);
    setLastSync(cached.lastSync);
    setLoading(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await get<Setting[]>('/admin/settings');
      const all = Array.isArray(data) ? data : [];
      const filteredSettings = all.filter((s) => !HIDDEN_KEYS.includes(s.key));
      setSettings(filteredSettings);
      // 获取上次同步时间
      const syncItem = all.find((s) => s.key === 'exchange_rate_last_sync');
      const nextLastSync = syncItem?.value || null;
      setLastSync(nextLastSync);
      writeSessionCache(GENERAL_SETTINGS_CACHE_KEY, {
        settings: filteredSettings,
        lastSync: nextLastSync,
      });
    } catch {
      message.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (!isReady) return;
    fetchSettings();
  }, [fetchSettings, isReady]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await post<{ success: boolean; message: string }>(
        '/admin/settings/sync-exchange-rates',
      );
      if (res.success) {
        message.success(res.message);
        fetchSettings();
      } else {
        message.warning(res.message);
      }
    } catch {
      message.error('同步请求失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (key: string, value: string) => {
    setSaving(key);
    try {
      await put(`/admin/settings/${key}`, { value });
      message.success('设置已保存');
      fetchSettings();
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(null);
    }
  };

  const CURRENCY_LABELS: Record<string, string> = {
    exchange_rate_usd: 'CNY → USD',
    exchange_rate_eur: 'CNY → EUR',
    exchange_rate_gbp: 'CNY → GBP',
    exchange_rate_cad: 'CNY → CAD',
    exchange_rate_aud: 'CNY → AUD',
  };

  const columns = [
    {
      title: '货币',
      dataIndex: 'key',
      key: 'key',
      width: 160,
      render: (key: string) => (
        <span className="font-medium">{CURRENCY_LABELS[key] || key}</span>
      ),
    },
    { title: '说明', dataIndex: 'description', key: 'description' },
    {
      title: '汇率',
      dataIndex: 'value',
      key: 'value',
      width: 250,
      render: (value: string, record: Setting) => (
        <Input.Search
          defaultValue={value}
          enterButton={<SaveOutlined />}
          loading={saving === record.key}
          onSearch={(val) => handleSave(record.key, val)}
        />
      ),
    },
  ];

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">汇率配置</h2>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs text-gray-400">
              上次同步：{new Date(lastSync).toLocaleString('zh-CN')}
            </span>
          )}
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
            onClick={handleSync}
          >
            同步汇率
          </Button>
        </div>
      </div>
      <Card>
        <Table
          dataSource={settings}
          columns={columns}
          rowKey="key"
          pagination={false}
        />
        <p className="text-xs text-gray-400 mt-3">
          数据来源：ExchangeRate-API｜每天自动同步一次，也可手动点击上方按钮立即同步
        </p>
      </Card>
    </div>
  );
}
