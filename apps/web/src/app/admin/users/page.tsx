'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { Card, Input, Button, Space, App, Select } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { UserTable } from './components/UserTable';
import { get, post, patch } from '@/lib/api';
import { useUrlState } from '@/hooks/useUrlState';
import { TableSkeleton } from '../components/PageSkeleton';
import { useAuthStore } from '@/stores/useAuthStore';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';

const USERS_CACHE_TTL_MS = 5 * 60 * 1000;
const LazyUserForm = dynamic(
  () => import('./components/UserForm').then((mod) => mod.UserForm),
  { loading: () => null },
);

interface UserRecord {
  id: string;
  email: string;
  username: string | null;
  avatar: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

function UsersPageContent() {
  const { message, modal } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const { params: query, setParams: setQuery } = useUrlState({
    page: 1,
    limit: 20,
    search: '' as string,
    role: '' as string,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cacheKey = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(query.page));
    sp.set('limit', String(query.limit));
    if (query.search) sp.set('search', query.search);
    if (query.role) sp.set('role', query.role);
    return `admin:users:${sp.toString()}`;
  }, [query.page, query.limit, query.search, query.role]);

  useEffect(() => {
    const cached = readSessionCache<{
      data: UserRecord[];
      meta?: { total: number };
    }>(cacheKey, USERS_CACHE_TTL_MS);
    if (!cached) return;

    setUsers(cached.data || []);
    setTotal(cached.meta?.total || 0);
    setLoading(false);
  }, [cacheKey]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: query.page,
        limit: query.limit,
      };
      if (query.search) params.search = query.search;
      if (query.role) params.role = query.role;

      const data = await get<{
        data: UserRecord[];
        meta?: { total: number };
      }>('/users/admin/list', params);
      setUsers(data.data || []);
      setTotal(data.meta?.total || 0);
      writeSessionCache(cacheKey, data);
    } catch {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, query.page, query.limit, query.search, query.role, message]);

  useEffect(() => {
    if (!isReady) return;
    fetchUsers();
  }, [fetchUsers, isReady]);

  const handleAdd = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleEdit = (user: UserRecord) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      if (editingUser) {
        await patch(`/users/admin/${editingUser.id}`, {
          username: data.username,
          role: data.role,
        });
      } else {
        await post('/users/admin/create', data);
      }
      message.success(editingUser ? '用户已更新' : '用户已创建');
      setFormOpen(false);
      fetchUsers();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '保存用户失败',
      );
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await patch(`/users/admin/${id}/toggle-active`);
      message.success('状态已更新');
      fetchUsers();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '操作失败',
      );
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      const res = await patch<{ newPassword: string }>(
        `/users/admin/${id}/reset-password`,
      );
      modal.success({
        title: '密码已重置',
        content: (
          <div>
            <p>新密码：</p>
            <code className="block bg-gray-100 p-2 rounded mt-1 select-all">
              {res.newPassword}
            </code>
            <p className="text-sm text-gray-500 mt-2">
              请复制并发送给用户，此密码仅显示一次
            </p>
          </div>
        ),
      });
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '重置密码失败',
      );
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          创建用户
        </Button>
      </div>

      <Card className="mb-4">
        <Space wrap>
          <Input
            placeholder="搜索邮箱或用户名..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={query.search || ''}
            onChange={(e) => setQuery({ search: e.target.value, page: 1 })}
            onPressEnter={fetchUsers}
          />
          <Select
            placeholder="筛选角色"
            allowClear
            style={{ width: 140 }}
            value={query.role || undefined}
            onChange={(v) => setQuery({ role: v || '', page: 1 })}
            options={[
              { value: 'super_admin', label: '超级管理员' },
              { value: 'admin', label: '管理员' },
              { value: 'user', label: '普通用户' },
            ]}
          />
          <Button type="primary" onClick={fetchUsers}>
            搜索
          </Button>
        </Space>
      </Card>

      <Card>
        <UserTable
          data={users}
          loading={loading}
          pagination={{ current: query.page, pageSize: query.limit, total }}
          currentUserId={currentUser?.id}
          currentUserRole={currentUser?.role}
          onPageChange={(page, pageSize) => setQuery({ page, limit: pageSize })}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
          onResetPassword={handleResetPassword}
        />
      </Card>

      {formOpen && (
        <LazyUserForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmit}
          user={editingUser}
          loading={submitting}
          currentUserRole={currentUser?.role}
        />
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <UsersPageContent />
    </Suspense>
  );
}
