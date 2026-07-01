'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Card,
  Button,
  App,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, post, patch } from '@/lib/api';
import { TableSkeleton } from '../../../components/PageSkeleton';

interface ExperimentVariant {
  id: string;
  name: string;
  keywords?: string[];
  strategy?: string;
  weight: number;
}

interface Experiment {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ExperimentVariant[];
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
}

interface VariantResult {
  variantId: string;
  variantName: string;
  impressions: number;
  clicks: number;
  searches: number;
  ctr: number;
}

const statusColors: Record<string, string> = {
  draft: 'default',
  running: 'processing',
  paused: 'warning',
  completed: 'success',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  running: '运行中',
  paused: '已暂停',
  completed: '已结束',
};

function ExperimentsPageContent() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [data, setData] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Experiment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsData, setResultsData] = useState<{
    experiment: Experiment;
    results: VariantResult[];
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get<Experiment[]>('/admin/hot-search-experiments');
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error('获取实验列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [fetchData, isReady]);

  useEffect(() => {
    if (formOpen) {
      if (editingItem) {
        form.setFieldsValue({
          name: editingItem.name,
          description: editingItem.description,
          variants: editingItem.variants,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          variants: [
            { id: 'control', name: '对照组', weight: 50 },
            { id: 'variant_a', name: '实验组A', weight: 50 },
          ],
        });
      }
    }
  }, [formOpen, editingItem, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingItem) {
        await patch(`/admin/hot-search-experiments/${editingItem.id}`, values);
        message.success('实验已更新');
      } else {
        await post('/admin/hot-search-experiments', values);
        message.success('实验已创建');
      }

      setFormOpen(false);
      fetchData();
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (
    id: string,
    action: 'start' | 'pause' | 'complete',
  ) => {
    try {
      await post(`/admin/hot-search-experiments/${id}/${action}`);
      const labels = { start: '已启动', pause: '已暂停', complete: '已结束' };
      message.success(labels[action]);
      fetchData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleViewResults = async (id: string) => {
    try {
      const res = await get<{
        experiment: Experiment;
        results: VariantResult[];
      }>(`/admin/hot-search-experiments/${id}/results`);
      setResultsData(res);
      setResultsOpen(true);
    } catch {
      message.error('获取结果失败');
    }
  };

  const columns: ColumnsType<Experiment> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: '变体数',
      key: 'variantCount',
      width: 80,
      render: (_: unknown, record: Experiment) => record.variants?.length || 0,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      render: (_: unknown, record: Experiment) => (
        <Space size="small">
          {record.status === 'draft' && (
            <>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setEditingItem(record);
                  setFormOpen(true);
                }}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleAction(record.id, 'start')}
              >
                启动
              </Button>
            </>
          )}
          {record.status === 'running' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<PauseCircleOutlined />}
                onClick={() => handleAction(record.id, 'pause')}
              >
                暂停
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleAction(record.id, 'complete')}
              >
                结束
              </Button>
            </>
          )}
          {record.status === 'paused' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleAction(record.id, 'start')}
              >
                恢复
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleAction(record.id, 'complete')}
              >
                结束
              </Button>
            </>
          )}
          {(record.status === 'running' ||
            record.status === 'paused' ||
            record.status === 'completed') && (
            <Button
              type="link"
              size="small"
              icon={<BarChartOutlined />}
              onClick={() => handleViewResults(record.id)}
            >
              结果
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const resultColumns: ColumnsType<VariantResult> = [
    { title: '变体', dataIndex: 'variantName', key: 'variantName' },
    { title: '曝光', dataIndex: 'impressions', key: 'impressions' },
    { title: '点击', dataIndex: 'clicks', key: 'clicks' },
    { title: '搜索', dataIndex: 'searches', key: 'searches' },
    {
      title: 'CTR',
      dataIndex: 'ctr',
      key: 'ctr',
      render: (ctr: number) => `${ctr}%`,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">A/B 实验管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingItem(null);
            setFormOpen(true);
          }}
        >
          创建实验
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑实验' : '创建实验'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={600}
        forceRender
        destroyOnHidden={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="实验名称"
            rules={[{ required: true, message: '请输入实验名称' }]}
          >
            <Input placeholder="例：新趋势算法对比" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.List name="variants">
            {(fields, { add, remove }) => (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">变体配置</span>
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      add({
                        id: `variant_${fields.length}`,
                        name: `变体${fields.length}`,
                        weight: 50,
                      })
                    }
                  >
                    添加变体
                  </Button>
                </div>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    className="mb-2"
                    extra={
                      fields.length > 2 ? (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() => remove(field.name)}
                        >
                          删除
                        </Button>
                      ) : null
                    }
                  >
                    <Space wrap className="w-full">
                      <Form.Item
                        name={[field.name, 'id']}
                        label="ID"
                        rules={[{ required: true }]}
                        className="mb-0"
                      >
                        <Input style={{ width: 120 }} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'name']}
                        label="名称"
                        rules={[{ required: true }]}
                        className="mb-0"
                      >
                        <Input style={{ width: 140 }} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'weight']}
                        label="权重"
                        rules={[{ required: true }]}
                        className="mb-0"
                      >
                        <InputNumber min={0} max={100} style={{ width: 80 }} />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title="实验结果"
        open={resultsOpen}
        onCancel={() => setResultsOpen(false)}
        footer={null}
        width={600}
      >
        {resultsData && (
          <>
            <Descriptions size="small" className="mb-4" column={2}>
              <Descriptions.Item label="实验">
                {resultsData.experiment.name}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColors[resultsData.experiment.status]}>
                  {statusLabels[resultsData.experiment.status]}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            <Table
              columns={resultColumns}
              dataSource={resultsData.results}
              rowKey="variantId"
              pagination={false}
              size="small"
            />
          </>
        )}
      </Modal>
    </div>
  );
}

export default function ExperimentsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ExperimentsPageContent />
    </Suspense>
  );
}
