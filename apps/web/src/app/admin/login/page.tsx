'use client';

/**
 * Admin Login Page
 * 后台登录页面
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Form, Input, Button, Card, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { associateVisitWithUser } from '@/lib/visit-tracking';
import { post } from '@/lib/api';

interface LoginFormData {
  email: string;
  password: string;
}

export default function AdminLoginPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { setAuth, isAuthenticated, user, _hasHydrated } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // 如果已登录且是 admin，直接跳转
  useEffect(() => {
    if (_hasHydrated && isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin')) {
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, user, router, _hasHydrated]);

  const handleSubmit = async (values: LoginFormData) => {
    setLoading(true);
    try {
      const data = await post<{ accessToken?: string; access_token?: string; user: { id: string; email: string; username: string | null; avatar: string | null; role: string; emailVerified: boolean } }>('/auth/login', values, { includeAuth: false });

      // 检查是否是 admin 或 super_admin
      if (data.user?.role !== 'admin' && data.user?.role !== 'super_admin') {
        message.error('访问被拒绝，需要管理员权限。');
        return;
      }

      const accessToken = data.accessToken ?? data.access_token;
      if (!accessToken) {
        throw new Error('登录响应缺少 accessToken');
      }

      setAuth(data.user, accessToken);
      associateVisitWithUser();
      message.success('登录成功！');
      router.push('/admin/dashboard');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">管理后台登录</h1>
          <p className="text-gray-500 mt-2">登录以访问管理面板</p>
        </div>

        <Form
          name="admin-login"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="邮箱"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center text-gray-500 text-sm">
          <Link href="/" className="text-blue-500 hover:underline">
            返回首页
          </Link>
        </div>
      </Card>
    </div>
  );
}
