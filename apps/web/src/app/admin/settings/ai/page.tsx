'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Input,
  Button,
  App,
  Space,
  Alert,
  Statistic,
  Descriptions,
  Form,
} from 'antd';
import {
  RobotOutlined,
  SaveOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, post, put } from '@/lib/api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

const AI_CONFIG_CACHE_KEY = 'admin:settings:ai-config';
const AI_CONFIG_CACHE_TTL_MS = 10 * 60 * 1000;

interface AIConfig {
  apiKey: string;
  model: string;
  endpoint: string;
  usage: { used: number; date: string };
}

export default function AIConfigPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 表单状态
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [apiKeyChanged, setApiKeyChanged] = useState(false);

  useEffect(() => {
    const cached = readSessionCache<AIConfig>(AI_CONFIG_CACHE_KEY, AI_CONFIG_CACHE_TTL_MS);
    if (!cached) return;

    setConfig(cached);
    setApiKey(cached.apiKey);
    setModel(cached.model);
    setEndpoint(cached.endpoint);
    setLoading(false);
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await get<AIConfig>('/admin/settings/ai-config');
      setConfig(data);
      setApiKey(data.apiKey);
      setModel(data.model);
      setEndpoint(data.endpoint);
      setApiKeyChanged(false);
      writeSessionCache(AI_CONFIG_CACHE_KEY, data);
    } catch {
      message.error('加载 AI 配置失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (!isReady) return;
    fetchConfig();
  }, [fetchConfig, isReady]);

  const handleSave = async () => {
    if (!model.trim()) {
      message.warning('模型名称不能为空');
      return;
    }
    if (!endpoint.trim()) {
      message.warning('API 端点不能为空');
      return;
    }

    setSaving(true);
    try {
      const updates: Promise<unknown>[] = [
        put('/admin/settings/ai_model', { value: model.trim() }),
        put('/admin/settings/ai_api_endpoint', { value: endpoint.trim() }),
      ];

      // 只有用户修改了 API Key 才更新
      if (apiKeyChanged && apiKey && !apiKey.includes('****')) {
        updates.push(
          put('/admin/settings/ai_api_key', { value: apiKey.trim() }),
        );
      }

      await Promise.all(updates);
      message.success('AI 配置已保存');
      setTestResult(null);
      await fetchConfig();
    } catch {
      message.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await post<{ success: boolean; message: string }>('/admin/settings/ai-config/test');
      setTestResult(data);
      if (data.success) {
        message.success(data.message);
      } else {
        message.error(data.message);
      }
    } catch {
      setTestResult({ success: false, message: '请求失败' });
      message.error('测试请求失败');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">AI 配置</h2>

      {/* Usage Stats */}
      <Card className="mb-6">
        <div className="flex items-center gap-8">
          <Statistic
            title="今日 API 调用"
            value={config?.usage?.used ?? 0}
            prefix={<ThunderboltOutlined />}
          />
          <div className="text-sm text-gray-400">
            日期：{config?.usage?.date}
          </div>
        </div>
      </Card>

      {/* AI Model Configuration */}
      <Card
        title={
          <Space>
            <RobotOutlined />
            <span>AI 模型配置</span>
          </Space>
        }
        className="mb-6"
      >
        <div style={{ maxWidth: 600 }}>
          <Form layout="vertical">
            <Form.Item label="API 密钥">
              <Input.Password
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setApiKeyChanged(true);
                }}
                placeholder="输入 API 密钥"
              />
              <div className="text-xs text-gray-400 mt-1">
                留空以保留当前密钥，输入新值以更新。
              </div>
            </Form.Item>

            <Form.Item label="模型名称">
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="如 qwen3-vl-plus"
              />
            </Form.Item>

            <Form.Item label="API 端点">
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="如 https://dashscope.aliyuncs.com/api/v1/..."
              />
            </Form.Item>
          </Form>

          {/* Current config display */}
          {config && (
            <Descriptions
              size="small"
              column={1}
              className="mb-4"
              title="当前配置"
              bordered
            >
              <Descriptions.Item label="API 密钥">
                <code>{config.apiKey || '未配置'}</code>
              </Descriptions.Item>
              <Descriptions.Item label="模型">
                <code>{config.model}</code>
              </Descriptions.Item>
              <Descriptions.Item label="端点">
                <code className="text-xs break-all">{config.endpoint}</code>
              </Descriptions.Item>
            </Descriptions>
          )}

          {/* Test Result */}
          {testResult && (
            <Alert
              type={testResult.success ? 'success' : 'error'}
              showIcon
              icon={
                testResult.success ? (
                  <CheckCircleOutlined />
                ) : (
                  <CloseCircleOutlined />
                )
              }
              message={testResult.message}
              className="mb-4"
            />
          )}

          {/* Action Buttons */}
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存
            </Button>
            <Button
              icon={<ApiOutlined />}
              loading={testing}
              onClick={handleTest}
            >
              测试连接
            </Button>
            <Button
              icon={<SyncOutlined />}
              onClick={() => {
                setLoading(true);
                fetchConfig();
              }}
            >
              刷新
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
