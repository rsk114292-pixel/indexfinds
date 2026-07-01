'use client';

import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, Modal, Button, App, Checkbox } from 'antd';
import { CloudDownloadOutlined } from '@ant-design/icons';
import ImageUpload from '@/components/ImageUpload';
import { get } from '@/lib/api';
import type { Brand } from '@/types';

const { TextArea } = Input;

interface BrandFormData {
  name: string;
  aliases?: string[];
  tier?: number;
  logoUrl?: string;
  description?: string;
  isFeatured?: boolean;
  featuredSort?: number;
}

interface BrandFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: BrandFormData) => Promise<void>;
  brand?: Brand | null;
  loading?: boolean;
}

export function BrandForm({
  open,
  onClose,
  onSubmit,
  brand,
  loading,
}: BrandFormProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [fetchingLogo, setFetchingLogo] = useState(false);

  // Auto-fetch logo from Clearbit API
  const handleFetchLogo = async () => {
    const brandName = form.getFieldValue('name');
    if (!brandName?.trim()) {
      message.warning('请先输入品牌名称');
      return;
    }

    setFetchingLogo(true);
    try {
      const data = await get<{ logoUrl?: string; source?: string }>('/brands/logo/fetch', {
        name: brandName,
      });
      if (data.logoUrl) {
        // 使用 setFields 避免 rc-field-form 的 isEqual 深比较触发循环引用警告
        form.setFields([{ name: 'logoUrl', value: data.logoUrl }]);
        message.success(`已从 ${data.source} 获取标志`);
      } else {
        message.info('未找到该品牌的标志');
      }
    } catch {
      message.error('获取标志失败');
    } finally {
      setFetchingLogo(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (brand) {
        form.setFieldsValue({
          name: brand.name,
          aliases: brand.aliases || [],
          tier: brand.tier,
          logoUrl: brand.logoUrl,
          description: brand.description,
          isFeatured: brand.isFeatured || false,
          featuredSort: brand.featuredSort || 0,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, brand, form]);

  const handleFinish = async (values: BrandFormData) => {
    try {
      await onSubmit(values);
      form.resetFields();
    } catch {
      // 提交失败时不重置表单，保留用户输入
    }
  };

  return (
    <Modal
      title={brand ? '编辑品牌' : '添加品牌'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      forceRender
      width={520}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item label="品牌标志" help="上传正方形标志图片（建议尺寸: 200x200px）">
          <div className="flex items-start gap-3">
            <Form.Item name="logoUrl" noStyle>
              <ImageUpload maxSize={2} />
            </Form.Item>
            <Button
              icon={<CloudDownloadOutlined />}
              onClick={handleFetchLogo}
              loading={fetchingLogo}
              title="从 Clearbit 自动获取标志"
            >
              自动获取
            </Button>
          </div>
        </Form.Item>

        <Form.Item
          name="name"
          label="品牌名称"
          rules={[{ required: true, message: '请输入品牌名称' }]}
        >
          <Input placeholder="例如: Nike" />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述"
          help="品牌简要描述"
        >
          <TextArea
            placeholder="输入品牌描述..."
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="aliases"
          label="别名"
          help="添加该品牌的其他名称"
        >
          <Select
            mode="tags"
            placeholder="输入别名后按回车"
            tokenSeparators={[',']}
          />
        </Form.Item>

        <Form.Item name="tier" label="等级">
          <Select
            placeholder="选择等级"
            allowClear
            options={[
              { value: 1, label: '等级1 - 核心品牌' },
              { value: 2, label: '等级2 - 热门品牌' },
              { value: 3, label: '等级3 - 长尾品牌' },
              { value: 0, label: '等级0 - 未分类' },
            ]}
          />
        </Form.Item>

        <div className="flex items-center gap-4">
          <Form.Item name="isFeatured" valuePropName="checked" className="mb-0">
            <Checkbox>首页精选</Checkbox>
          </Form.Item>
          <Form.Item name="featuredSort" label="排序" className="mb-0 flex-1" help="数字越小越靠前">
            <InputNumber min={0} placeholder="0" className="w-full" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
