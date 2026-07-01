'use client';

import { useEffect } from 'react';
import { Form, Input, Drawer, Button, Space, Switch } from 'antd';
import type { Category } from '@/types';

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    nameEn?: string;
    slug?: string;
    isActive?: boolean;
    coverImage?: string;
  }) => Promise<void>;
  category?: Category | null;
  parentId?: string | null;
  loading?: boolean;
}

export function CategoryForm({
  open,
  onClose,
  onSubmit,
  category,
  parentId,
  loading,
}: CategoryFormProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (category) {
        form.setFieldsValue({
          name: category.name,
          nameEn: category.nameEn,
          slug: category.slug,
          isActive: category.isActive !== false,
          coverImage: category.coverImage,
        });
      } else {
        form.resetFields();
        form.setFieldValue('isActive', true);
      }
    }
  }, [open, category, form]);

  const handleFinish = async (values: {
    name: string;
    nameEn?: string;
    slug?: string;
    isActive?: boolean;
    coverImage?: string;
  }) => {
    await onSubmit(values);
    form.resetFields();
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  return (
    <Drawer
      title={category ? '编辑分类' : '添加分类'}
      open={open}
      onClose={onClose}
      width={400}
      forceRender
      footer={
        <Space className="w-full justify-end">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={() => form.submit()} loading={loading}>
            {category ? '更新' : '创建'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="name"
          label="分类名称（中文）"
          rules={[{ required: true, message: '请输入分类名称' }]}
        >
          <Input
            placeholder="例如: 服装"
            onChange={(e) => {
              if (!category) {
                const slug = generateSlug(e.target.value);
                form.setFieldValue('slug', slug);
              }
            }}
          />
        </Form.Item>

        <Form.Item name="nameEn" label="分类名称（英文）">
          <Input placeholder="例如: Clothing" />
        </Form.Item>

        <Form.Item
          name="slug"
          label="Slug"
          rules={[{ required: true, message: '请输入 Slug' }]}
        >
          <Input placeholder="例如: clothing" />
        </Form.Item>

        <Form.Item name="coverImage" label="封面图 URL">
          <Input placeholder="例如: https://..." />
        </Form.Item>

        <Form.Item
          name="isActive"
          label="启用状态"
          valuePropName="checked"
        >
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>

        {parentId && (
          <div className="text-gray-500 text-sm">
            此分类将作为子分类添加
          </div>
        )}
      </Form>
    </Drawer>
  );
}
