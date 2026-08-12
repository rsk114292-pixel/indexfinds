'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Switch, App, Space,
  Modal, Form, Input, Select, Popconfirm,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SaveOutlined, LinkOutlined,
} from '@ant-design/icons';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, post, patch, del } from '@/lib/api';
import { SOCIAL_ICONS, SocialIcon, type SocialLink } from '@/lib/social-icons';
import { TableSkeleton } from '../../components/PageSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

interface SocialLinkFormValues {
  platform: string;
  label: string;
  url: string;
  icon: string;
  sortOrder?: number;
  isActive: boolean;
}

const ICON_OPTIONS = Object.keys(SOCIAL_ICONS).map((key) => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

const SOCIAL_LINKS_CACHE_KEY = 'admin:settings:social-links';
const SOCIAL_LINKS_CACHE_TTL_MS = 10 * 60 * 1000;

export default function SocialLinksPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<SocialLink | null>(null);
  const [form] = Form.useForm<SocialLinkFormValues>();

  useEffect(() => {
    const cached = readSessionCache<SocialLink[]>(
      SOCIAL_LINKS_CACHE_KEY,
      SOCIAL_LINKS_CACHE_TTL_MS,
    );
    if (!cached) return;

    setLinks(cached);
    setLoading(false);
  }, []);

  const fetchLinks = useCallback(async () => {
    try {
      const data = await get<SocialLink[]>('/admin/social-links');
      setLinks(data);
      writeSessionCache(SOCIAL_LINKS_CACHE_KEY, data);
    } catch {
      message.error('加载社交链接失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (!isReady) return;
    fetchLinks();
  }, [fetchLinks, isReady]);

  const handleCreate = () => {
    setEditingLink(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, sortOrder: 0 });
    setModalOpen(true);
  };

  const handleEdit = (link: SocialLink) => {
    setEditingLink(link);
    form.setFieldsValue({
      platform: link.platform,
      label: link.label,
      url: link.url,
      icon: link.icon,
      sortOrder: link.sortOrder,
      isActive: link.isActive,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await del(`/admin/social-links/${id}`);
      message.success('已删除');
      fetchLinks();
    } catch {
      message.error('删除失败');
    }
  };

  const handleToggleActive = async (link: SocialLink) => {
    try {
      await patch(`/admin/social-links/${link.id}`, { isActive: !link.isActive });
      message.success(`已${!link.isActive ? '启用' : '禁用'}`);
      fetchLinks();
    } catch {
      message.error('更新失败');
    }
  };

  const handleSubmit = async (values: SocialLinkFormValues) => {
    setSaving(true);
    try {
      if (editingLink) {
        await patch(`/admin/social-links/${editingLink.id}`, values);
      } else {
        await post('/admin/social-links', values);
      }
      message.success(editingLink ? '已更新' : '已创建');
      setModalOpen(false);
      fetchLinks();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 60,
      render: (v: number) => <span className="text-gray-500">{v}</span>,
    },
    {
      title: '平台', dataIndex: 'label', key: 'label', width: 160,
      render: (label: string, r: SocialLink) => (
        <div className="flex items-center gap-2">
          <SocialIcon name={r.icon} className="w-5 h-5" />
          <div>
            <div className="font-medium">{label}</div>
            <div className="text-xs text-gray-500">{r.platform}</div>
          </div>
        </div>
      ),
    },
    {
      title: '状态', dataIndex: 'isActive', key: 'isActive', width: 100,
      render: (v: boolean, r: SocialLink) => (
        <Switch checked={v} onChange={() => handleToggleActive(r)}
          checkedChildren="启用" unCheckedChildren="禁用" />
      ),
    },
    {
      title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noreferrer"
          className="text-xs text-blue-600 font-mono hover:underline">{url}</a>
      ),
    },
    {
      title: '操作', key: 'actions', width: 120,
      render: (_: unknown, r: SocialLink) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
          <Popconfirm title="确认删除" description="删除后无法恢复，确定要删除吗？"
            onConfirm={() => handleDelete(r.id)} okText="删除" cancelText="取消"
            okButtonProps={{ danger: true }}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) return <TableSkeleton />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">社交链接管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          添加链接
        </Button>
      </div>
      <Card>
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            管理网站底部和移动端显示的社交媒体链接（Telegram 等）。
          </p>
        </div>
        <Table dataSource={links} columns={columns} rowKey="id"
          pagination={false}
          locale={{
            emptyText: (
              <EmptyState
                icon={<LinkOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                title="暂无社交链接"
                description="点击「添加链接」开始配置"
              />
            ),
          }}
        />
      </Card>

      <Modal title={editingLink ? '编辑链接' : '添加链接'}
        open={modalOpen} onCancel={() => setModalOpen(false)}
        footer={null} width={520}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="platform" label="平台标识"
              rules={[{ required: true, message: '请输入平台标识' }]}>
              <Input placeholder="telegram" />
            </Form.Item>
            <Form.Item name="label" label="显示名称"
              rules={[{ required: true, message: '请输入显示名称' }]}>
              <Input placeholder="Telegram" />
            </Form.Item>
          </div>
          <Form.Item name="url" label="链接地址"
            rules={[
              { required: true, message: '请输入链接地址' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}>
              <Input placeholder="https://t.me/repindexfinds" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="icon" label="图标"
              rules={[{ required: true, message: '请选择图标' }]}>
              <Select placeholder="选择图标" options={ICON_OPTIONS}
                optionRender={(option) => (
                  <div className="flex items-center gap-2">
                    <SocialIcon name={option.value as string} className="w-[18px] h-[18px]" />
                    <span>{option.label}</span>
                  </div>
                )} />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序" initialValue={0}>
              <Input type="number" placeholder="0" />
            </Form.Item>
          </div>
          <Form.Item name="isActive" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={saving}
              icon={<SaveOutlined />}>保存</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
