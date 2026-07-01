'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Input, Switch, App, Alert } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, put } from '@/lib/api';
import { PageSkeleton } from '../../components/PageSkeleton';
import {
  getTrackingIdError,
  normalizeTrackingId,
} from '@/lib/tracking-config';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

const TRACKING_SETTINGS_CACHE_KEY = 'admin:settings:tracking';
const TRACKING_SETTINGS_CACHE_TTL_MS = 10 * 60 * 1000;

interface TrackingSettings {
  gtmId: string;
  gaId: string;
  enabled: boolean;
}

export default function TrackingSettingsPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [settings, setSettings] = useState<TrackingSettings>({
    gtmId: '',
    gaId: '',
    enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const cached = readSessionCache<TrackingSettings>(
      TRACKING_SETTINGS_CACHE_KEY,
      TRACKING_SETTINGS_CACHE_TTL_MS,
    );

    if (!cached) return;

    setSettings(cached);
    setLoading(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const all = await get<Array<{ key: string; value: string }>>('/admin/settings');
      const map = new Map(all.map((s) => [s.key, s.value]));
      const nextSettings = {
        gtmId: map.get('tracking_gtm_id') || '',
        gaId: map.get('tracking_ga_id') || '',
        enabled: map.get('tracking_enabled') !== 'false',
      };
      setSettings(nextSettings);
      writeSessionCache(TRACKING_SETTINGS_CACHE_KEY, nextSettings);
    } catch {
      message.error('加载追踪配置失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (!isReady) return;
    fetchSettings();
  }, [fetchSettings, isReady]);

  const handleSave = async (key: string, value: string) => {
    setSaving(key);
    try {
      await put(`/admin/settings/${key}`, { value });
      message.success('已保存');
      fetchSettings();
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (checked: boolean) => {
    await handleSave('tracking_enabled', String(checked));
  };

  const handleTrackingSave = async (
    type: 'ga' | 'gtm',
    key: 'tracking_ga_id' | 'tracking_gtm_id',
    value: string,
  ) => {
    const normalizedValue = normalizeTrackingId(value);
    const error = getTrackingIdError(type, normalizedValue);

    if (error) {
      message.error(error);
      return;
    }

    await handleSave(key, normalizedValue);
  };

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">追踪与分析</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">总开关</span>
          <Switch
            checked={settings.enabled}
            onChange={handleToggle}
            loading={saving === 'tracking_enabled'}
            checkedChildren="启用"
            unCheckedChildren="关闭"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Card title="Google Tag Manager（推荐）" size="small">
          <p className="text-sm text-gray-500 mb-3">
            配置 GTM 后，GA4、Clarity、Facebook Pixel 等所有追踪代码都可以在 GTM 后台管理，无需修改代码。
          </p>
          <Input.Search
            addonBefore="GTM ID"
            placeholder="GTM-XXXXXXX"
            defaultValue={settings.gtmId}
            key={`gtm-${settings.gtmId}`}
            enterButton={<><SaveOutlined /> 保存</>}
            loading={saving === 'tracking_gtm_id'}
            onSearch={(val) => handleTrackingSave('gtm', 'tracking_gtm_id', val)}
          />
        </Card>

        <Card title="Google Analytics 4（简易模式）" size="small">
          <p className="text-sm text-gray-500 mb-3">
            不使用 GTM 时的备选方案，直接加载 GA4 追踪代码。如果已配置 GTM，此项会被忽略（GA4 应在 GTM 内配置）。
          </p>
          <Input.Search
            addonBefore="GA4 ID"
            placeholder="G-XXXXXXXXXX"
            defaultValue={settings.gaId}
            key={`ga-${settings.gaId}`}
            enterButton={<><SaveOutlined /> 保存</>}
            loading={saving === 'tracking_ga_id'}
            onSearch={(val) => handleTrackingSave('ga', 'tracking_ga_id', val)}
          />
          {settings.gtmId && settings.gaId && (
            <Alert
              type="info"
              showIcon
              className="mt-3"
              message="已配置 GTM，此 GA4 ID 不会生效。请在 GTM 后台添加 GA4 代码。"
            />
          )}
        </Card>

        <Card size="small">
          <div className="p-2 text-sm text-gray-500 space-y-2">
            <p><strong>工作原理：</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>用户同意 Cookie 后，才会加载追踪代码（GDPR 合规）</li>
              <li>如果配置了 GTM ID → 加载 GTM 容器（推荐）</li>
              <li>如果只配置了 GA4 ID → 直接加载 GA4</li>
              <li>修改后无需重新部署，前端会动态获取最新配置</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
