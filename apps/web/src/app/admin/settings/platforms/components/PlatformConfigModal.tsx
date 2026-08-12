'use client';

import type { Dispatch, FocusEvent, SetStateAction } from 'react';
import { Button, Form, Input, InputNumber, Modal, Switch, Tabs, Tag, Upload } from 'antd';
import type { FormInstance, UploadProps } from 'antd';
import {
  LoadingOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import PlatformLogoBadge from '@/components/platforms/PlatformLogoBadge';

interface TranslationLocale {
  code: 'en' | 'zh' | 'fr' | 'de' | 'es' | 'it' | 'pt' | 'ar';
  tabLabel: string;
  nameLabel: string;
  descriptionLabel: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  nameTooltip: string;
  descriptionTooltip: string;
}

interface PlatformFormValues {
  key: string;
  name: string;
  baseUrl: string;
  inviteCode?: string;
  description?: string;
  translations?: Record<string, { name?: string; description?: string }>;
  logoUrl?: string;
  sortOrder?: number;
  urlTemplate?: string;
  isActive: boolean;
  comparisonData?: {
    serviceFee?: string;
    shippingCoverage?: string;
    freeStorageDays?: number;
    qcService?: string;
    paymentMethods?: string;
    returnPolicy?: string;
    shippingBaseFeeUsd?: number;
    shippingRatePerKgUsd?: number;
    dataUpdatedAt?: string;
  };
}

interface PlatformPreset {
  name: string;
  logoUrl?: string | null;
}

interface PlatformConfigModalProps {
  open: boolean;
  editingPlatform: { id: string } | null;
  saving: boolean;
  uploading: boolean;
  logoPreview: string;
  setLogoPreview: (value: string) => void;
  form: FormInstance<PlatformFormValues>;
  activeTranslationLocale: TranslationLocale['code'];
  setActiveTranslationLocale: Dispatch<SetStateAction<TranslationLocale['code']>>;
  watchedTranslations?: Record<string, { name?: string; description?: string }>;
  translationLocales: readonly TranslationLocale[];
  presetPlatforms: Record<string, PlatformPreset>;
  getMissingDescriptionLocales: (
    translations?: Record<string, { name?: string; description?: string }> | null,
  ) => TranslationLocale['code'][];
  onClose: () => void;
  onSubmit: (values: PlatformFormValues) => void;
  onKeyBlur: (key: string) => void;
  onQuickFill: (key: string) => void;
  onUrlTemplateBlur: (event: FocusEvent<HTMLTextAreaElement>) => void;
  onLogoUrlBlur: (logoUrl: string) => void;
  onLogoUpload: UploadProps['customRequest'];
}

export function PlatformConfigModal({
  open,
  editingPlatform,
  saving,
  uploading,
  logoPreview,
  setLogoPreview,
  form,
  activeTranslationLocale,
  setActiveTranslationLocale,
  watchedTranslations,
  translationLocales,
  presetPlatforms,
  getMissingDescriptionLocales,
  onClose,
  onSubmit,
  onKeyBlur,
  onQuickFill,
  onUrlTemplateBlur,
  onLogoUrlBlur,
  onLogoUpload,
}: PlatformConfigModalProps) {
  return (
    <Modal
      title={editingPlatform ? '编辑平台' : '添加平台'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      {!editingPlatform && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <ThunderboltOutlined className="text-blue-500" />
            <span className="text-sm font-medium text-gray-700">快速添加常用平台</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(presetPlatforms).map(([key, preset]) => (
              <Button
                key={key}
                size="small"
                onClick={() => onQuickFill(key)}
                className="flex items-center gap-1"
              >
                <PlatformLogoBadge
                  platformKey={key}
                  name={preset.name}
                  logoUrl={preset.logoUrl || undefined}
                  className="flex h-4 w-4 items-center justify-center rounded"
                  imageClassName="h-4 w-4 rounded object-contain"
                  labelClassName="text-[8px] font-semibold"
                />
                {preset.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        className="mt-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="key"
            label="平台标识"
            rules={[
              { required: true, message: '请输入平台标识' },
              {
                pattern: /^[a-z0-9_-]+$/,
                message: '只能包含小写字母、数字、下划线和连字符',
              },
            ]}
            tooltip="唯一标识符，如 loongbuy、superbuy。输入已知平台标识会自动填充信息。"
          >
            <Input
              placeholder="loongbuy"
              disabled={!!editingPlatform}
              onBlur={(e) => onKeyBlur(e.target.value)}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="平台名称"
            rules={[{ required: true, message: '请输入平台名称' }]}
          >
            <Input placeholder="Loongbuy" />
          </Form.Item>
        </div>

        <Form.Item
          name="baseUrl"
          label="基础 URL"
          rules={[
            { required: true, message: '请输入基础 URL' },
            { type: 'url', message: '请输入有效的 URL' },
          ]}
        >
          <Input placeholder="https://www.loongbuy.com/product-details" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="inviteCode" label="邀请码">
            <Input placeholder="YOUR_CODE" />
          </Form.Item>

          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <Input type="number" placeholder="0" />
          </Form.Item>
        </div>

        <Form.Item
          name="urlTemplate"
          label="URL 模板"
          tooltip="支持变量: {baseUrl}, {inviteCode}, {weidianItemId}, {weidianUrl}, {encodedWeidianUrl}, {productId}。可直接粘贴完整链接，系统会自动转换。"
        >
          <Input.TextArea
            rows={2}
            placeholder="{baseUrl}?invitecode={inviteCode}&weidian={weidianItemId}"
            onBlur={onUrlTemplateBlur}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="默认描述（兼容旧版本）"
          tooltip="旧字段，用于兼容未读取 translations 的场景。建议同时填写下方多语言文案。"
        >
          <Input.TextArea rows={2} placeholder="平台描述..." />
        </Form.Item>

        <div className="mb-4 rounded-lg border border-orange-100 bg-orange-50/60 p-4">
          <div className="mb-1 text-sm font-semibold text-gray-800">代购对比与运费估算</div>
          <p className="mb-4 text-xs leading-5 text-gray-500">
            这里的内容会展示在前台代购对比页。费用和政策变化后，请同步更新资料日期。
          </p>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item name={['comparisonData', 'serviceFee']} label="服务费说明">
              <Input placeholder="例如：请在官网确认最新服务费" />
            </Form.Item>
            <Form.Item name={['comparisonData', 'shippingCoverage']} label="配送范围">
              <Input placeholder="例如：美国、英国、欧盟、加拿大" />
            </Form.Item>
            <Form.Item name={['comparisonData', 'freeStorageDays']} label="免费仓储天数">
              <InputNumber min={0} max={3650} precision={0} className="w-full" placeholder="例如：90" />
            </Form.Item>
            <Form.Item name={['comparisonData', 'qcService']} label="QC 服务">
              <Input placeholder="例如：提供基础 QC 图片" />
            </Form.Item>
            <Form.Item name={['comparisonData', 'paymentMethods']} label="支付方式">
              <Input placeholder="例如：信用卡、PayPal" />
            </Form.Item>
            <Form.Item name={['comparisonData', 'returnPolicy']} label="退货政策摘要">
              <Input placeholder="例如：入库后按卖家政策申请" />
            </Form.Item>
            <Form.Item name={['comparisonData', 'shippingBaseFeeUsd']} label="运费基础价（USD）">
              <InputNumber min={0} precision={2} step={0.5} className="w-full" placeholder="例如：8.00" />
            </Form.Item>
            <Form.Item name={['comparisonData', 'shippingRatePerKgUsd']} label="每公斤估算价（USD）">
              <InputNumber min={0.01} precision={2} step={0.5} className="w-full" placeholder="例如：12.00" />
            </Form.Item>
          </div>
          <Form.Item name={['comparisonData', 'dataUpdatedAt']} label="资料更新时间" className="mb-0">
            <Input type="date" />
          </Form.Item>
        </div>

        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="mb-3 text-sm font-medium text-gray-700">
            多语言文案（前台按用户语言显示，支持 en/zh/fr/de/es/it/pt/ar）
          </div>
          {(() => {
            const missingDescriptionLocales = getMissingDescriptionLocales(
              watchedTranslations,
            );
            return (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Tag
                    color={
                      missingDescriptionLocales.length > 0 ? 'warning' : 'success'
                    }
                  >
                    缺失描述 {missingDescriptionLocales.length}
                  </Tag>
                  {missingDescriptionLocales.map((code) => (
                    <Button
                      key={`missing-${code}`}
                      size="small"
                      onClick={() => setActiveTranslationLocale(code)}
                    >
                      跳转 {code.toUpperCase()}
                    </Button>
                  ))}
                </div>

                <Tabs
                  activeKey={activeTranslationLocale}
                  onChange={(activeKey) =>
                    setActiveTranslationLocale(activeKey as TranslationLocale['code'])
                  }
                  items={translationLocales.map((locale) => {
                    const currentDescription =
                      watchedTranslations?.[locale.code]?.description;
                    const hasDescription =
                      typeof currentDescription === 'string' &&
                      currentDescription.trim().length > 0;

                    return {
                      key: locale.code,
                      label: (
                        <span className="inline-flex items-center gap-2">
                          {locale.tabLabel}
                          {!hasDescription && (
                            <Tag color="warning" className="!mr-0">
                              缺描述
                            </Tag>
                          )}
                        </span>
                      ),
                      children: (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <Form.Item
                            name={['translations', locale.code, 'name']}
                            label={locale.nameLabel}
                            tooltip={locale.nameTooltip}
                          >
                            <Input placeholder={locale.namePlaceholder} />
                          </Form.Item>

                          <Form.Item
                            name={['translations', locale.code, 'description']}
                            label={locale.descriptionLabel}
                            tooltip={locale.descriptionTooltip}
                            dependencies={locale.code === 'en' ? ['isActive'] : undefined}
                            rules={
                              locale.code === 'en'
                                ? [
                                    ({ getFieldValue }) => ({
                                      validator(_, value) {
                                        if (!getFieldValue('isActive')) {
                                          return Promise.resolve();
                                        }
                                        if (
                                          typeof value === 'string' &&
                                          value.trim().length > 0
                                        ) {
                                          return Promise.resolve();
                                        }
                                        return Promise.reject(
                                          new Error('启用状态下必须填写 English Description'),
                                        );
                                      },
                                    }),
                                  ]
                                : undefined
                            }
                          >
                            <Input.TextArea
                              rows={3}
                              placeholder={locale.descriptionPlaceholder}
                            />
                          </Form.Item>
                        </div>
                      ),
                    };
                  })}
                />
              </>
            );
          })()}
        </div>

        <Form.Item label="平台图标" htmlFor="platform-logo-url">
          <div className="flex items-start gap-4">
            <Upload
              accept="image/*"
              showUploadList={false}
              customRequest={onLogoUpload}
              disabled={uploading}
            >
              <div className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-blue-500">
                {uploading ? (
                  <LoadingOutlined className="text-2xl text-blue-500" />
                ) : logoPreview ? (
                  <PlatformLogoBadge
                    platformKey={form.getFieldValue('key') || 'platform'}
                    name={form.getFieldValue('name') || 'Platform'}
                    logoUrl={logoPreview}
                    className="flex h-full w-full items-center justify-center rounded-lg bg-gray-100"
                    imageClassName="h-full w-full rounded-lg object-contain"
                    labelClassName="text-sm font-semibold tracking-[0.04em]"
                  />
                ) : (
                  <>
                    <UploadOutlined className="text-2xl text-gray-400" />
                    <span className="mt-1 text-xs text-gray-400">上传图标</span>
                  </>
                )}
              </div>
            </Upload>
            <div className="flex-1">
              <Form.Item name="logoUrl" noStyle>
                <Input
                  id="platform-logo-url"
                  placeholder="或输入图片 URL"
                  value={logoPreview}
                  onChange={(e) => {
                    setLogoPreview(e.target.value);
                    form.setFieldsValue({ logoUrl: e.target.value });
                  }}
                  onBlur={(e) => onLogoUrlBlur(e.target.value)}
                />
              </Form.Item>
              <p className="mt-1 text-xs text-gray-400">
                支持 JPG、PNG、WebP、GIF、ICO 格式，最大 5MB。远程图片会在失焦或保存时自动转存到本站。
              </p>
            </div>
          </div>
        </Form.Item>

        <Form.Item name="isActive" label="启用状态" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            icon={<SaveOutlined />}
          >
            保存
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
