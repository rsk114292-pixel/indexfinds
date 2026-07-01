'use client';

/**
 * Admin Error Boundary
 * Catches errors in all admin pages while preserving the admin layout (sidebar/header).
 */
import { Button, Result } from 'antd';

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Result
      status="error"
      title="页面出错了"
      subTitle="发生了意外错误，请重试。如果问题持续存在，请联系技术支持。"
      extra={[
        <Button type="primary" key="retry" onClick={reset}>
          重试
        </Button>,
        <Button key="home" href="/admin/dashboard">
          返回仪表盘
        </Button>,
      ]}
    />
  );
}
