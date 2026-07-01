'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Form, Input, Button, Select, TreeSelect, App, Spin, Result, Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, post, patch } from '@/lib/api';
import type { ReviewItem, ReviewItemData, Category } from '@/types';

export default function ReviewDetailPage() {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const { isReady, status } = useAdminAuthReady();
  const [form] = Form.useForm();
  const [item, setItem] = useState<ReviewItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const itemId =
    typeof params?.itemId === 'string'
      ? params.itemId
      : Array.isArray(params?.itemId)
        ? params.itemId[0]
        : undefined;

  useEffect(() => {
    if (!itemId || !isReady) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        setItem(null);
        setCategories([]);

        const [itemData, categoriesData] = await Promise.all([
          get<ReviewItem>(`/admin/batch/items/${itemId}`),
          get<Category[]>('/categories', { includeLegacy: false }).catch(() => {
            message.warning('分类树加载失败');
            return [] as Category[];
          }),
        ]);

        setItem(itemData);
        setCategories(
          Array.isArray(categoriesData)
            ? categoriesData
            : (categoriesData as { data?: Category[] })?.data || [],
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : '加载失败';
        setLoadError(msg);
        message.error(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isReady, itemId, message]);

  useEffect(() => {
    if (!item) return;
    const display = item.finalData || item.aiGeneratedData || item.sourceData || {};

    form.setFieldsValue({
      title: display.title,
      slug: display.slug,
      description: display.description,
      // 兼容 aiBrandName 和 brandName 两种字段名
      aiBrandName: display.aiBrandName || display.brandName || item.aiBrandName,
      primaryCategoryId: display.primaryCategoryId,
      // AI属性
      colors: display.attributes?.colors || [],
      styles: display.attributes?.styles || [],
      occasions: display.attributes?.occasions || [],
      seasons: display.attributes?.seasons || [],
      gender: display.attributes?.gender,
    });
  }, [item, form]);

  interface TreeNode {
    value: string;
    title: string;
    disabled?: boolean;
    selectable?: boolean;
    children?: TreeNode[];
  }
  const transformCategories = (cats: Category[]): TreeNode[] => {
    return cats.map((cat) => ({
      value: cat.id,
      title: cat.name,
      selectable: true,
      children: cat.children ? transformCategories(cat.children) : undefined,
    }));
  };
  const handleSave = async (values: Record<string, unknown>) => {
    try {
      // 重组数据：将AI属性整合到attributes字段中
      const { colors, styles, occasions, seasons, gender, ...rest } = values;
      const finalData: ReviewItemData = {
        ...rest,
        attributes: {
          colors: colors as string[] | undefined,
          styles: styles as string[] | undefined,
          occasions: occasions as string[] | undefined,
          seasons: seasons as string[] | undefined,
          gender: gender as string | undefined,
        },
      };

      await patch(`/admin/batch/items/${item?.id}`, { finalData });
      message.success('保存成功');

      // 更新本地item状态
      if (item) {
        setItem({ ...item, finalData });
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    }
  };
  const handleApprove = async () => {
    try {
      await post(`/admin/batch/items/${item?.id}/approve`);
      message.success('审核通过');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审核失败');
    }
  };

  const handlePublish = async () => {
    try {
      await post(`/admin/batch/items/${item?.id}/publish`);
      message.success('发布成功');
      router.push('/admin/products');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '发布失败');
    }
  };

  if (status === 'hydrating' || status === 'recovering_token') {
    return (
      <>
        <div className="flex h-[60vh] items-center justify-center">
          <Spin size="large" />
        </div>
        <Form form={form} style={{ display: 'none' }} />
      </>
    );
  }

  if (status === 'unauthenticated' || status === 'forbidden') {
    return (
      <>
        <Result
          status="403"
          title="未登录"
          subTitle="请先登录后再进行审核操作"
          extra={
            <Button type="primary" onClick={() => router.replace('/admin/login')}>
              去登录
            </Button>
          }
        />
        <Form form={form} style={{ display: 'none' }} />
      </>
    );
  }

  if (!itemId) {
    return (
      <>
        <Result
          status="404"
          title="无效的审核ID"
          subTitle="链接缺少 itemId 参数，无法打开审核详情"
          extra={[
            <Button key="back" onClick={() => router.back()}>
              返回
            </Button>,
            <Button
              key="list"
              type="primary"
              onClick={() => router.push('/admin/products?tab=review')}
            >
              回到待审核列表
            </Button>,
          ]}
        />
        <Form form={form} style={{ display: 'none' }} />
      </>
    );
  }

  return (
    <div>
      <Spin spinning={loading} tip="加载中...">
        {loadError ? (
          <>
            <Result
              status="error"
              title="加载失败"
              subTitle={loadError}
              extra={[
                <Button key="back" onClick={() => router.back()}>
                  返回
                </Button>,
                <Button
                  key="list"
                  type="primary"
                  onClick={() => router.push('/admin/products?tab=review')}
                >
                  回到待审核列表
                </Button>,
              ]}
            />
            <Form form={form} style={{ display: 'none' }} />
          </>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">审核详情</h1>
                <p className="text-gray-500 mt-1">编辑并审核后发布</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => router.back()}>返回</Button>
                <Button onClick={handleApprove} disabled={!item}>
                  通过审核
                </Button>
                <Button type="primary" onClick={handlePublish} disabled={!item}>
                  发布
                </Button>
              </div>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSave} disabled={!item}>
              <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Slug" name="slug" rules={[{ required: true, message: '请输入 Slug' }]}>
                <Input />
              </Form.Item>
              <Form.Item label="描述" name="description">
                <Input.TextArea rows={4} />
              </Form.Item>
              <Form.Item
                label="主分类"
                name="primaryCategoryId"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <TreeSelect
                  treeData={transformCategories(categories)}
                  placeholder="请选择分类"
                  treeDefaultExpandAll
                />
              </Form.Item>
              <Alert
                type="warning"
                showIcon
                className="mb-4"
                message="审核阶段可暂时选择父分类保存，但正式发布前仍建议补成最深层子分类。"
              />
              {/* AI 品牌识别信息 */}
              {item?.brandConfidence && (
                <Alert
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  className="mb-4"
                  message={
                    <span>
                      AI 品牌识别置信度: {(item.brandConfidence * 100).toFixed(0)}%
                    </span>
                  }
                />
              )}

              <Form.Item label="品牌名称" name="aiBrandName">
                <Input placeholder="AI 识别的品牌名" />
              </Form.Item>

              {/* AI 生成属性 */}
              <div className="mt-6 mb-4">
                <h3 className="text-lg font-semibold">AI 生成属性</h3>
                <p className="text-sm text-gray-500">编辑 AI 提取的属性信息</p>
              </div>

              <Form.Item label="颜色" name="colors">
                <Select mode="tags" placeholder="如：黑色、白色、红色" />
              </Form.Item>

              <Form.Item label="风格" name="styles">
                <Select mode="tags" placeholder="如：休闲、正式、运动" />
              </Form.Item>

              <Form.Item label="场合" name="occasions">
                <Select mode="tags" placeholder="如：日常、聚会、办公" />
              </Form.Item>

              <Form.Item label="季节" name="seasons">
                <Select mode="tags" placeholder="如：春、夏、秋、冬" />
              </Form.Item>

              <Form.Item label="性别" name="gender">
                <Select allowClear placeholder="请选择性别">
                  <Select.Option value="men">男士</Select.Option>
                  <Select.Option value="women">女士</Select.Option>
                  <Select.Option value="unisex">中性</Select.Option>
                  <Select.Option value="kids">儿童</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" disabled={!item}>
                  保存修改
                </Button>
              </Form.Item>
            </Form>

          </>
        )}
      </Spin>
    </div>
  );
}
