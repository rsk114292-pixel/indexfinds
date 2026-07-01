'use client';

import { useState } from 'react';
import { Form, Input, Button, Space, App, Alert, Radio, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { get, post, ensureFreshToken } from '@/lib/api';
import type { BatchJob } from '@/types';

interface UrlInputFormProps {
  onJobCreated: (job: BatchJob) => void;
}

export function UrlInputForm({ onJobCreated }: UrlInputFormProps) {
  const { message } = App.useApp();
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'import' | 'update'>('import');

  const validateUrls = (urlText: string): { valid: string[]; errors: string[] } => {
    const lines = urlText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const valid: string[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      // Check if it's a pure numeric ID (Weidian item ID)
      const pureIdPattern = /^\d{8,15}$/;
      if (pureIdPattern.test(line)) {
        // Convert pure ID to full URL
        valid.push(`https://weidian.com/item.html?itemId=${line}`);
        return;
      }

      // Check if it's a valid Weidian/Koudai URL
      const weidianPattern = /weidian\.com|koudai\.com/i;
      if (weidianPattern.test(line)) {
        valid.push(line);
      } else {
        errors.push(`第 ${index + 1} 行：无效的微店 URL 或商品 ID`);
      }
    });

    return { valid, errors };
  };

  const handleSubmit = async () => {
    const { valid: urlList, errors } = validateUrls(urls);

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);

    if (urlList.length === 0) {
      message.error('请至少输入一个 URL');
      return;
    }

    if (urlList.length > 500) {
      message.error('每批最多允许 500 个 URL，请分批提交');
      return;
    }

    setLoading(true);
    try {
      // 长时间操作前确保 token 有效
      await ensureFreshToken();
      // Step 1: Create batch job
      const result = await post<{ jobId: string; warnings?: string[] }>('/admin/batch/jobs', { urls: urlList, type: importMode });

      if (result.warnings?.length) {
        result.warnings.forEach((w) => message.warning(w, 5));
      }

      // Step 2: Start the job
      await post(`/admin/batch/jobs/${result.jobId}/start`);

      // Step 3: Get job details
      const job = await get<BatchJob>(`/admin/batch/jobs/${result.jobId}`);
      message.success(`导入任务已创建，共 ${urlList.length} 个项目`);
      setUrls('');
      onJobCreated(job);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建导入任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (file.size > 1024 * 1024) {
      message.error('文件大小不能超过 1MB');
      return false;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setUrls((prev) => (prev ? prev + '\n' + content : content));
        message.success('文件内容已导入');
      }
    };
    reader.readAsText(file);
    return false; // 阻止 antd 默认上传行为
  };

  const handleClear = () => {
    setUrls('');
    setValidationErrors([]);
  };

  const urlCount = urls
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length;

  return (
    <div>
      <Form layout="vertical">
        <Form.Item
          label="导入模式"
          help={importMode === 'import' ? '跳过已存在的商品（推荐用于首次导入）' : '重新抓取和 AI 分析已存在的商品（推荐用于更新数据）'}
        >
          <Radio.Group
            value={importMode}
            onChange={(e) => setImportMode(e.target.value)}
            disabled={loading}
          >
            <Radio.Button value="import">导入新商品</Radio.Button>
            <Radio.Button value="update">更新已存在商品</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label={
            <span>
              微店商品 URL{' '}
              <span className="text-gray-400">（每行一个，最多 500 个，支持上传 .txt 文件）</span>
            </span>
          }
          help="支持完整 URL 或商品 ID（例如 7547430132）"
        >
          <div className="mb-2">
            <Upload
              accept=".txt"
              showUploadList={false}
              beforeUpload={handleFileUpload}
              disabled={loading}
            >
              <Button icon={<UploadOutlined />} disabled={loading}>
                上传 .txt 文件
              </Button>
            </Upload>
          </div>
          <Input.TextArea
            rows={10}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder={`7547430132\n7547463820\nhttps://weidian.com/item.html?itemId=xxx`}
            disabled={loading}
          />
        </Form.Item>

        {validationErrors.length > 0 && (
          <Alert
            type="error"
            message="验证错误"
            description={
              <ul className="list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            className="mb-4"
          />
        )}

        <Form.Item>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">
              已输入 {urlCount} 个 URL
              {urlCount > 500 && (
                <span className="text-red-500 ml-2">（超出限制）</span>
              )}
            </span>
            <Space>
              <Button onClick={handleClear} disabled={loading}>
                清除
              </Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                disabled={urlCount === 0 || urlCount > 500}
              >
                开始导入
              </Button>
            </Space>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
}
