'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  App,
  Table,
  Tag,
  Button,
  Spin,
  Result,
  Space,
  Modal,
  Descriptions,
  Card,
  Input,
} from 'antd';
import {
  RollbackOutlined,
  EyeOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { fetcher, get, post, del } from '@/lib/api';
import type { ColumnsType } from 'antd/es/table';

interface SplitHistoryItem {
  id: string;
  sourceWeidianItemId: string;
  sourceUrl: string;
  resultProductIds: string[];
  splitStrategy: 'auto' | 'manual' | 'semi_auto';
  status: 'active' | 'rolled_back' | 'superseded';
  createdAt: string;
  rolledBackAt?: string;
  rolledBackReason?: string;
  operatorId?: string;
  aiAnalysisData?: {
    overview?: {
      mixednessScore?: {
        overallScore: number;
      };
      detectedBrands?: string[];
      detectedModels?: string[];
    };
    overallConfidence?: number;
  };
}

interface SplitHistoryResponse {
  items: SplitHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

interface SplitHistoryDetail extends SplitHistoryItem {
  createdProducts: Array<{
    id: string;
    title: string;
    slug: string;
    skuCount: number;
    status: string;
  }>;
}

export function SplitHistoryList() {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const { isReady, status } = useAdminAuthReady();

  const [page, setPage] = useState(1);
  const [searchWeidianId, setSearchWeidianId] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentDetail, setCurrentDetail] = useState<SplitHistoryDetail | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const swrKey = isReady
    ? `/products/split-history?page=${page}&limit=20${searchWeidianId ? `&weidianItemId=${searchWeidianId}` : ''}`
    : null;

  const { data: response, isLoading: loading, mutate } = useSWR<SplitHistoryResponse>(
    swrKey, fetcher,
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  const data = response?.items || [];
  const total = response?.total || 0;

  const handleViewDetail = async (record: SplitHistoryItem) => {
    try {
      setDetailLoading(true);
      setDetailModalOpen(true);
      const detail = await get<SplitHistoryDetail>(`/products/split-history/${record.id}`);
      setCurrentDetail(detail);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '加载详情失败'
      );
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRollback = async (record: SplitHistoryItem) => {
    modal.confirm({
      title: '确认回滚',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>此操作将:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>删除全部 {record.resultProductIds.length} 个拆分产品</li>
            <li>将原始产品恢复为待审核状态</li>
            <li>将此拆分历史标记为已回滚</li>
          </ul>
          <div className="mt-3">
            <Input.TextArea
              placeholder="回滚原因（可选）"
              id="rollback-reason"
              rows={3}
            />
          </div>
        </div>
      ),
      okText: '回滚',
      okButtonProps: { danger: true },
      cancelText: '取消',
      width: 500,
      onOk: async () => {
        try {
          const reason = (document.getElementById('rollback-reason') as HTMLTextAreaElement)?.value || '';
          await post(`/products/split-history/${record.id}/rollback`, {
            reason: reason || 'Manual rollback from admin panel',
          });
          message.success('拆分操作已成功回滚');
          mutate();
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : '回滚失败'
          );
          throw error;
        }
      },
    });
  };

  const handleDelete = (record: SplitHistoryItem) => {
    modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定删除微店商品 ${record.sourceWeidianItemId} 的拆分记录？此操作不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await del(`/products/split-history/${record.id}`);
          message.success('拆分记录已删除');
          mutate();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除失败');
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择记录');
      return;
    }
    modal.confirm({
      title: '确认批量删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定删除选中的 ${selectedRowKeys.length} 条拆分记录？此操作不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await post<{ deleted: number }>('/products/split-history/batch-delete', {
            ids: selectedRowKeys,
          });
          message.success(`已删除 ${result.deleted} 条记录`);
          setSelectedRowKeys([]);
          mutate();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '批量删除失败');
        }
      },
    });
  };

  if (status === 'hydrating' || status === 'recovering_token') {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (status === 'unauthenticated' || status === 'forbidden') {
    return (
      <Result
        status="403"
        title="未登录"
        subTitle="请先登录以查看拆分历史"
        extra={
          <Button type="primary" onClick={() => router.replace('/admin/login')}>
            去登录
          </Button>
        }
      />
    );
  }

  const columns: ColumnsType<SplitHistoryItem> = [
    {
      title: '微店商品 ID',
      dataIndex: 'sourceWeidianItemId',
      key: 'sourceWeidianItemId',
      width: 150,
      render: (id: string, record) => (
        <div>
          <div className="font-mono text-sm">{id}</div>
          {record.sourceUrl && (
            <a
              href={record.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              查看来源
            </a>
          )}
        </div>
      ),
    },
    {
      title: '拆分信息',
      key: 'splitInfo',
      width: 200,
      render: (_, record) => {
        const brands = record.aiAnalysisData?.overview?.detectedBrands || [];
        const mixedness = record.aiAnalysisData?.overview?.mixednessScore?.overallScore;
        return (
          <div className="space-y-1">
            <div className="text-sm">
              拆分为 <strong>{record.resultProductIds.length}</strong> 个产品
            </div>
            {brands.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {brands.slice(0, 3).map((brand, idx) => (
                  <Tag key={idx} color="blue" className="text-xs">
                    {brand}
                  </Tag>
                ))}
                {brands.length > 3 && (
                  <Tag className="text-xs">+{brands.length - 3}</Tag>
                )}
              </div>
            )}
            {mixedness !== undefined && (
              <div className="text-xs text-gray-500">
                混合度：{Math.round(mixedness * 100)}%
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '拆分策略',
      dataIndex: 'splitStrategy',
      key: 'splitStrategy',
      width: 100,
      render: (strategy: string) => {
        const colorMap: Record<string, string> = {
          auto: 'green',
          manual: 'blue',
          semi_auto: 'orange',
        };
        return <Tag color={colorMap[strategy] || 'default'}>{strategy}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          active: { color: 'success', text: '生效中' },
          rolled_back: { color: 'error', text: '已回滚' },
          superseded: { color: 'default', text: '已替代' },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return (
          <div>
            <Tag color={config.color}>{config.text}</Tag>
            {record.rolledBackAt && (
              <div className="text-xs text-gray-400 mt-1">
                {new Date(record.rolledBackAt).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => (
        <div className="text-sm">
          {new Date(date).toLocaleDateString()}
          <div className="text-xs text-gray-400">
            {new Date(date).toLocaleTimeString()}
          </div>
        </div>
      ),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'active' && (
            <Button
              size="small"
              danger
              icon={<RollbackOutlined />}
              onClick={() => handleRollback(record)}
            >
              回滚
            </Button>
          )}
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search filter + batch actions */}
      <Card>
        <div className="flex justify-between items-center">
          <Space>
            <Input
              placeholder="按微店商品 ID 搜索"
              prefix={<SearchOutlined />}
              value={searchWeidianId}
              onChange={(e) => setSearchWeidianId(e.target.value)}
              onPressEnter={() => { setPage(1); mutate(); }}
              style={{ width: 300 }}
              allowClear
            />
            <Button type="primary" onClick={() => { setPage(1); mutate(); }}>
              搜索
            </Button>
          </Space>
          {selectedRowKeys.length > 0 && (
            <Space>
              <span className="text-gray-500">已选择 {selectedRowKeys.length} 项</span>
              <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                批量删除
              </Button>
            </Space>
          )}
        </div>
      </Card>

      {/* Table */}
      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        }}
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: (newPage) => setPage(newPage),
          showSizeChanger: false,
          showTotal: (t) => `共 ${t} 条记录`,
        }}
        scroll={{ x: 1000 }}
      />

      {/* Detail Modal */}
      <Modal
        title="拆分历史详情"
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setCurrentDetail(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            关闭
          </Button>,
          currentDetail?.status === 'active' && (
            <Button
              key="rollback"
              danger
              icon={<RollbackOutlined />}
              onClick={() => {
                setDetailModalOpen(false);
                if (currentDetail) handleRollback(currentDetail);
              }}
            >
              回滚
            </Button>
          ),
        ]}
        width={800}
      >
        {detailLoading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : currentDetail ? (
          <div className="space-y-4">
            {/* Basic info */}
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="微店商品 ID" span={2}>
                {currentDetail.sourceWeidianItemId}
              </Descriptions.Item>
              <Descriptions.Item label="来源链接" span={2}>
                <a
                  href={currentDetail.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline break-all"
                >
                  {currentDetail.sourceUrl}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="拆分策略">
                <Tag color={currentDetail.splitStrategy === 'manual' ? 'blue' : 'green'}>
                  {currentDetail.splitStrategy}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={currentDetail.status === 'active' ? 'success' : 'error'}>
                  {currentDetail.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(currentDetail.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="创建产品数">
                {currentDetail.resultProductIds.length}
              </Descriptions.Item>
            </Descriptions>

            {/* Rollback info */}
            {currentDetail.rolledBackAt && (
              <Card size="small" title="回滚信息">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="回滚时间">
                    {new Date(currentDetail.rolledBackAt).toLocaleString()}
                  </Descriptions.Item>
                  {currentDetail.rolledBackReason && (
                    <Descriptions.Item label="回滚原因">
                      {currentDetail.rolledBackReason}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}

            {/* Created products */}
            {currentDetail.createdProducts && currentDetail.createdProducts.length > 0 && (
              <Card size="small" title="创建的产品">
                <div className="space-y-2">
                  {currentDetail.createdProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{product.title}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          路径：{product.slug} | SKU 数量：{product.skuCount}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag color={product.status === 'active' ? 'success' : 'default'}>
                          {product.status}
                        </Tag>
                        <Button
                          size="small"
                          onClick={() => window.open(`/products/${product.slug}`, '_blank')}
                        >
                          查看
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* AI Analysis */}
            {currentDetail.aiAnalysisData?.overview && (
              <Card size="small" title="AI 分析数据">
                <Descriptions column={2} size="small">
                  {currentDetail.aiAnalysisData.overview.mixednessScore && (
                    <Descriptions.Item label="混合度评分">
                      {Math.round(
                        currentDetail.aiAnalysisData.overview.mixednessScore.overallScore * 100
                      )}
                      %
                    </Descriptions.Item>
                  )}
                  {currentDetail.aiAnalysisData.overallConfidence !== undefined && (
                    <Descriptions.Item label="整体置信度">
                      {Math.round(currentDetail.aiAnalysisData.overallConfidence * 100)}%
                    </Descriptions.Item>
                  )}
                  {currentDetail.aiAnalysisData.overview.detectedBrands &&
                    currentDetail.aiAnalysisData.overview.detectedBrands.length > 0 && (
                      <Descriptions.Item label="识别品牌" span={2}>
                        {currentDetail.aiAnalysisData.overview.detectedBrands.map((brand, idx) => (
                          <Tag key={idx} color="blue">
                            {brand}
                          </Tag>
                        ))}
                      </Descriptions.Item>
                    )}
                  {currentDetail.aiAnalysisData.overview.detectedModels &&
                    currentDetail.aiAnalysisData.overview.detectedModels.length > 0 && (
                      <Descriptions.Item label="识别型号" span={2}>
                        {currentDetail.aiAnalysisData.overview.detectedModels.map((model, idx) => (
                          <Tag key={idx} color="green">
                            {model}
                          </Tag>
                        ))}
                      </Descriptions.Item>
                    )}
                </Descriptions>
              </Card>
            )}
          </div>
        ) : (
          <Result status="error" title="加载详情失败" />
        )}
      </Modal>
    </div>
  );
}
