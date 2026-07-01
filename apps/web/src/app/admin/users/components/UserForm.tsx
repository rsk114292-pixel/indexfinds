'use client';

import { useEffect } from 'react';
import { Modal, Form, Input, Select } from 'antd';

interface UserRecord {
  id: string;
  email: string;
  username: string | null;
  role: string;
  isActive: boolean;
}

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  user?: UserRecord | null;
  loading?: boolean;
  currentUserRole?: string;
}

function getRoleOptions(currentUserRole?: string) {
  const options = [{ value: 'user', label: '普通用户' }];
  if (currentUserRole === 'super_admin') {
    options.push({ value: 'admin', label: '管理员' });
    options.push({ value: 'super_admin', label: '超级管理员' });
  }
  return options;
}

export function UserForm({ open, onClose, onSubmit, user, loading, currentUserRole }: UserFormProps) {
  const [form] = Form.useForm();
  const isEditing = !!user;

  useEffect(() => {
    if (open) {
      if (user) {
        form.setFieldsValue({
          email: user.email,
          username: user.username || '',
          role: user.role,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, user, form]);

  const handleFinish = async (values: Record<string, unknown>) => {
    try {
      await onSubmit(values);
      form.resetFields();
    } catch {
      // 错误由父组件处理，不重置表单
    }
  };

  return (
    <Modal
      title={isEditing ? '编辑用户' : '创建用户'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input placeholder="user@example.com" disabled={isEditing} />
        </Form.Item>

        <Form.Item
          name="username"
          label="用户名"
          rules={[{ max: 30, message: '用户名最多 30 个字符' }]}
        >
          <Input placeholder="可选" />
        </Form.Item>

        {!isEditing && (
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少 8 位' },
              { max: 32, message: '密码最多 32 位' },
              {
                pattern: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
                message: '需包含大小写字母、数字和特殊字符',
              },
            ]}
          >
            <Input.Password placeholder="至少8位，含大小写、数字、特殊字符" />
          </Form.Item>
        )}

        <Form.Item
          name="role"
          label="角色"
          initialValue="user"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select options={getRoleOptions(currentUserRole)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
