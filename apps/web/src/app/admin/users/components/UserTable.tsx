'use client';

import { Table, Tag, Switch, Button, Space, Popconfirm, Avatar } from 'antd';
import { EditOutlined, KeyOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

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

interface UserTableProps {
  data: UserRecord[];
  loading: boolean;
  pagination: { current: number; pageSize: number; total: number };
  currentUserId?: string;
  currentUserRole?: string;
  onPageChange: (page: number, pageSize: number) => void;
  onEdit: (user: UserRecord) => void;
  onToggleActive: (id: string) => Promise<void>;
  onResetPassword: (id: string) => void;
}

const roleColorMap: Record<string, string> = {
  super_admin: 'purple',
  admin: 'red',
  user: 'blue',
};

const roleLabelMap: Record<string, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  user: '普通用户',
};

/** 判断当前用户能否操作目标用户 */
function canOperate(currentRole: string | undefined, currentId: string | undefined, target: UserRecord) {
  // 不能操作自己
  if (target.id === currentId) return false;
  // 不能操作超级管理员
  if (target.role === 'super_admin') return false;
  // 普通 admin 不能操作其他 admin
  if (currentRole !== 'super_admin' && target.role === 'admin') return false;
  return true;
}

export function UserTable({
  data,
  loading,
  pagination,
  currentUserId,
  currentUserRole,
  onPageChange,
  onEdit,
  onToggleActive,
  onResetPassword,
}: UserTableProps) {
  const columns: ColumnsType<UserRecord> = [
    {
      title: '用户',
      key: 'user',
      width: 280,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={record.avatar}
            icon={!record.avatar && <UserOutlined />}
            size={36}
          />
          <div>
            <div className="font-medium">
              {record.username || '未设置'}
              {record.id === currentUserId && (
                <Tag color="gold" className="ml-2">当前</Tag>
              )}
            </div>
            <div className="text-xs text-gray-500">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={roleColorMap[role] || 'default'}>
          {roleLabelMap[role] || role}
        </Tag>
      ),
    },
    {
      title: '邮箱验证',
      dataIndex: 'emailVerified',
      key: 'emailVerified',
      width: 100,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? '已验证' : '未验证'}</Tag>
      ),
    },
    {
      title: '状态',
      key: 'isActive',
      width: 80,
      render: (_, record) => {
        const disabled = !canOperate(currentUserRole, currentUserId, record);
        return (
          <Switch
            checked={record.isActive}
            disabled={disabled}
            size="small"
            onChange={() => onToggleActive(record.id)}
          />
        );
      },
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 160,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => {
        const allowed = canOperate(currentUserRole, currentUserId, record);
        if (!allowed) return <span className="text-gray-400">-</span>;
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认重置密码？"
              description="将生成随机新密码"
              onConfirm={() => onResetPassword(record.id)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small" icon={<KeyOutlined />}>
                重置密码
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      pagination={{
        ...pagination,
        onChange: onPageChange,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 位用户`,
      }}
    />
  );
}
