'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Progress, Button, Alert, Space, Tag, App, Dropdown } from 'antd';
import {
  DatabaseOutlined,
  FileImageOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, post } from '@/lib/api';
import { DashboardSkeleton } from '../../components/PageSkeleton';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

interface VectorStats {
  text: {
    totalProducts: number;
    productsWithEmbedding: number;
    productsWithoutEmbedding: number;
    coverageRate: number;
    dimensions: number;
    model: string;
  };
  image: {
    totalProductsWithImages: number;
    productsWithEmbedding: number;
    productsWithoutEmbedding: number;
    totalEmbeddings: number;
    coverageRate: number;
    dimensions: number;
    model: string;
  };
  service: {
    available: boolean;
    url: string;
    textAvailable: boolean;
    imageAvailable: boolean;
    lastCheckTime?: string | null;
    consecutiveFailures?: number;
  };
}

const VECTORS_CACHE_KEY = 'admin:analytics:vectors';
const VECTORS_CACHE_TTL_MS = 5 * 60 * 1000;

export default function VectorsAnalyticsPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [data, setData] = useState<VectorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<'text' | 'image' | null>(null);

  useEffect(() => {
    const cached = readSessionCache<VectorStats>(VECTORS_CACHE_KEY, VECTORS_CACHE_TTL_MS);
    if (!cached) return;

    setData(cached);
    setLoading(false);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await get<VectorStats>('/admin/semantic-search/combined-stats');
      setData(result);
      writeSessionCache(VECTORS_CACHE_KEY, result);
    } catch {
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [fetchData, isReady]);

  const textPending = data?.text?.productsWithoutEmbedding || 0;
  const imagePending = data?.image?.productsWithoutEmbedding || 0;
  const textServiceAvailable = data?.service?.textAvailable ?? false;
  const imageServiceAvailable = data?.service?.imageAvailable ?? false;

  const handleGenerateText = async (force = false) => {
    setGenerating('text');
    try {
      const limit = force ? 9999 : Math.min(textPending, 500);
      const forceParam = force ? '&force=true' : '';
      const result = await post<{ stats?: { success: number; failed: number } }>(`/admin/semantic-search/generate?limit=${limit}${forceParam}`);
      message.success(`文本向量生成完成: 成功 ${result.stats?.success || 0}, 失败 ${result.stats?.failed || 0}`);
      fetchData();
    } catch {
      message.error('生成失败');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateImage = async () => {
    setGenerating('image');
    try {
      // 图片向量通过异步队列处理，不需要限制数量
      const result = await post<{ message?: string; pendingCount?: number }>('/visual-search/batch-generate');
      message.success(result.message || '图片向量生成任务已提交');
      setTimeout(() => fetchData(), 3000);
    } catch {
      message.error('生成失败');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">向量管理</h1>
        <Button icon={<SyncOutlined spin={loading} />} onClick={fetchData} disabled={loading}>
          刷新
        </Button>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* 服务状态 */}
          <Alert
            className="mb-6"
            message={
              <div className="flex flex-wrap items-center gap-3">
                <span>Embedding 服务状态:</span>
                {data?.service?.available ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">在线</Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="error">离线</Tag>
                )}
                <Tag color={textServiceAvailable ? 'blue' : 'error'}>
                  文本模型{textServiceAvailable ? '在线' : '离线'}
                </Tag>
                <Tag color={imageServiceAvailable ? 'purple' : 'error'}>
                  图片模型{imageServiceAvailable ? '在线' : '离线'}
                </Tag>
                <span className="text-gray-500 text-sm">{data?.service?.url}</span>
                {typeof data?.service?.consecutiveFailures === 'number' && data.service.consecutiveFailures > 0 ? (
                  <span className="text-gray-500 text-sm">
                    连续失败 {data.service.consecutiveFailures} 次
                  </span>
                ) : null}
              </div>
            }
            description={
              data?.service?.lastCheckTime
                ? `最后检查时间: ${new Date(data.service.lastCheckTime).toLocaleString()}`
                : undefined
            }
            type={data?.service?.available ? 'success' : 'warning'}
            showIcon
          />

          {/* 文本向量统计 */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <FileTextOutlined className="text-blue-500" />
                <span>文本向量 (语义搜索)</span>
                <Tag color="blue">{data?.text?.model}</Tag>
                <Tag>{data?.text?.dimensions} 维</Tag>
              </div>
            }
            className="mb-6"
            extra={
              textPending > 0 ? (
                <Dropdown.Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  loading={generating === 'text'}
                  disabled={!textServiceAvailable || generating !== null}
                  onClick={() => handleGenerateText(false)}
                  menu={{
                    items: [
                      { key: 'force', label: '强制重新生成全部', danger: true },
                    ],
                    onClick: ({ key }) => {
                      if (key === 'force') handleGenerateText(true);
                    },
                  }}
                >
                  补齐缺失 ({textPending})
                </Dropdown.Button>
              ) : (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'force', label: '强制重新生成全部', danger: true },
                    ],
                    onClick: ({ key }) => {
                      if (key === 'force') handleGenerateText(true);
                    },
                  }}
                >
                  <Button
                    loading={generating === 'text'}
                    disabled={!textServiceAvailable || generating !== null}
                  >
                    更多操作 <ThunderboltOutlined />
                  </Button>
                </Dropdown>
              )
            }
          >
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={8}>
                <Statistic
                  title="活跃商品总数"
                  value={data?.text?.totalProducts || 0}
                  prefix={<DatabaseOutlined />}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="已生成向量"
                  value={data?.text?.productsWithEmbedding || 0}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="待生成"
                  value={data?.text?.productsWithoutEmbedding || 0}
                  valueStyle={{ color: data?.text?.productsWithoutEmbedding ? '#faad14' : '#52c41a' }}
                />
              </Col>
            </Row>
            <div className="mt-6">
              <div className="flex justify-between mb-2">
                <span>覆盖率</span>
                <span>{((data?.text?.coverageRate || 0) * 100).toFixed(1)}%</span>
              </div>
              <Progress
                percent={Number(((data?.text?.coverageRate || 0) * 100).toFixed(1))}
                strokeColor="#1890ff"
                status={data?.text?.coverageRate === 1 ? 'success' : 'active'}
              />
            </div>
          </Card>

          {/* 图片向量统计 */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <FileImageOutlined className="text-purple-500" />
                <span>图片向量 (图搜)</span>
                <Tag color="purple">{data?.image?.model}</Tag>
                <Tag>{data?.image?.dimensions} 维</Tag>
              </div>
            }
            extra={
              imagePending > 0 ? (
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  loading={generating === 'image'}
                  disabled={!imageServiceAvailable || generating !== null}
                  onClick={handleGenerateImage}
                >
                  补齐全部 ({imagePending})
                </Button>
              ) : null
            }
          >
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={6}>
                <Statistic
                  title="有图片的商品"
                  value={data?.image?.totalProductsWithImages || 0}
                  prefix={<DatabaseOutlined />}
                />
              </Col>
              <Col xs={24} sm={6}>
                <Statistic
                  title="已生成向量"
                  value={data?.image?.productsWithEmbedding || 0}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col xs={24} sm={6}>
                <Statistic
                  title="待生成"
                  value={data?.image?.productsWithoutEmbedding || 0}
                  valueStyle={{ color: data?.image?.productsWithoutEmbedding ? '#faad14' : '#52c41a' }}
                />
              </Col>
              <Col xs={24} sm={6}>
                <Statistic
                  title="总向量数"
                  value={data?.image?.totalEmbeddings || 0}
                  suffix="条"
                />
              </Col>
            </Row>
            <div className="mt-6">
              <div className="flex justify-between mb-2">
                <span>覆盖率</span>
                <span>{((data?.image?.coverageRate || 0) * 100).toFixed(1)}%</span>
              </div>
              <Progress
                percent={Number(((data?.image?.coverageRate || 0) * 100).toFixed(1))}
                strokeColor="#722ed1"
                status={data?.image?.coverageRate === 1 ? 'success' : 'active'}
              />
            </div>
          </Card>

          {/* 说明 */}
          <Card title="说明" className="mt-6">
            <Space direction="vertical" className="w-full">
              <div className="flex items-start gap-2">
                <FileTextOutlined className="text-blue-500 mt-1" />
                <div>
                  <strong>文本向量</strong>：用于语义搜索，理解用户搜索意图。如搜索&ldquo;beach vacation outfit&rdquo;可匹配泳装、沙滩裙等。
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileImageOutlined className="text-purple-500 mt-1" />
                <div>
                  <strong>图片向量</strong>：用于以图搜图功能，用户上传图片后可找到相似商品。
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ThunderboltOutlined className="text-green-500 mt-1" />
                <div>
                  <strong>自动生成</strong>：导入新商品时，系统会自动将向量生成任务加入队列，无需手动操作。
                </div>
              </div>
            </Space>
          </Card>
        </>
      )}
    </div>
  );
}
