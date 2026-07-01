'use client';

import { useState } from 'react';
import { Card, Input, Button, App, Space } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { post } from '@/lib/api';

export default function ChangePasswordPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async () => {
    if (!form.currentPassword) {
      message.error('请输入当前密码');
      return;
    }
    if (!form.newPassword) {
      message.error('请输入新密码');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    if (form.newPassword.length < 8 || form.newPassword.length > 32) {
      message.error('密码长度需要 8-32 位');
      return;
    }
    setLoading(true);
    try {
      await post<{ message: string }>('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      message.success('密码修改成功');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">修改密码</h1>
      <Card
        title={
          <Space>
            <LockOutlined />
            <span>修改密码</span>
          </Space>
        }
      >
        <div style={{ maxWidth: 400 }}>
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">当前密码</label>
            <Input.Password
              placeholder="请输入当前密码"
              value={form.currentPassword}
              onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">新密码</label>
            <Input.Password
              placeholder="8-32位，含大小写字母、数字和特殊字符"
              value={form.newPassword}
              onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">确认新密码</label>
            <Input.Password
              placeholder="请再次输入新密码"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            />
          </div>
          <Button
            type="primary"
            loading={loading}
            onClick={handleChangePassword}
          >
            修改密码
          </Button>
        </div>
      </Card>
    </div>
  );
}
