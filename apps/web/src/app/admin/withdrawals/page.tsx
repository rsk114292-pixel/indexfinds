'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Tag, Button, Space, App, Select, Modal, Input, Upload, Image } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { get, post } from '@/lib/api';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import type { ColumnsType } from 'antd/es/table';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';
import { getWithdrawalMethodLabel } from '@/lib/withdrawal-methods';

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  cashAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  paymentMethod: string;
  paymentAccount: string;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  cancelled: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已批准',
  rejected: '已拒绝',
  cancelled: '已取消',
};

const WITHDRAWALS_CACHE_TTL_MS = 5 * 60 * 1000;

export default function AdminWithdrawalsPage() {
  const { message, modal } = App.useApp();
  const { isReady, token } = useAdminAuthReady();
  const [data, setData] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  // Approve modal state
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveRecord, setApproveRecord] = useState<Withdrawal | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState(false);
  const cacheKey = useMemo(
    () => `admin:withdrawals:page=${page}:status=${statusFilter}`,
    [page, statusFilter],
  );

  useEffect(() => {
    const cached = readSessionCache<{ items: Withdrawal[]; total: number }>(
      cacheKey,
      WITHDRAWALS_CACHE_TTL_MS,
    );
    if (!cached) return;

    setData(cached.items);
    setTotal(cached.total);
    setLoading(false);
  }, [cacheKey]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await get<{ items: Withdrawal[]; total: number }>('/admin/withdrawals', params);
      setData(res.items);
      setTotal(res.total);
      writeSessionCache(cacheKey, res);
    } catch {
      message.error('加载提现列表失败');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, page, statusFilter, message]);

  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [fetchData, isReady]);

  const handleApprove = (record: Withdrawal) => {
    setApproveRecord(record);
    setProofImageUrl('');
    setApproveNote('');
    setApproveModalOpen(true);
  };

  const handleApproveSubmit = async () => {
    if (!proofImageUrl) {
      message.warning('请上传转账凭证截图');
      return;
    }
    setApproving(true);
    try {
      await post(`/admin/withdrawals/${approveRecord!.id}/approve`, {
        proofImage: proofImageUrl,
        adminNote: approveNote.trim() || undefined,
      });
      message.success('已批准');
      setApproveModalOpen(false);
      fetchData();
    } catch {
      message.error('操作失败');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = (record: Withdrawal) => {
    let rejectReason = '';
    modal.confirm({
      title: '拒绝提现',
      content: (
        <div>
          <p>积分: <strong>{record.amount}</strong> → 将退回用户账户</p>
          <Input.TextArea
            placeholder="请输入拒绝原因"
            rows={3}
            onChange={(e) => { rejectReason = e.target.value; }}
          />
        </div>
      ),
      okText: '确认拒绝',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        if (!rejectReason.trim()) {
          message.warning('请输入拒绝原因');
          throw new Error('no reason');
        }
        try {
          await post(`/admin/withdrawals/${record.id}/reject`, { adminNote: rejectReason.trim() });
          message.success('已拒绝，积分已退回');
          fetchData();
        } catch (e: unknown) {
          if (e instanceof Error && e.message === 'no reason') return;
          message.error('操作失败');
        }
      },
    });
  };

  const columns: ColumnsType<Withdrawal> = [
    {
      title: '用户ID',
      dataIndex: 'userId',
      width: 120,
      render: (v: string) => v.slice(0, 8) + '...',
    },
    {
      title: '积分',
      dataIndex: 'amount',
      width: 80,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: '金额',
      dataIndex: 'cashAmount',
      width: 90,
      render: (v: number) => `$${v}`,
    },
    {
      title: '收款方式',
      dataIndex: 'paymentMethod',
      width: 100,
      render: (v: string) => getWithdrawalMethodLabel(v),
    },
    {
      title: '收款账户',
      dataIndex: 'paymentAccount',
      width: 200,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v] || v}</Tag>,
    },
    {
      title: '备注',
      dataIndex: 'adminNote',
      width: 150,
      ellipsis: true,
      render: (v: string | null) => v || '-',
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right',
      render: (_: unknown, record: Withdrawal) => {
        if (record.status !== 'pending') return <span style={{ color: '#999' }}>-</span>;
        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleApprove(record)}
            >
              批准
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => handleReject(record)}
            >
              拒绝
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Card
        title="提现管理"
        extra={
          <Space>
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              style={{ width: 120 }}
              options={[
                { value: '', label: '全部' },
                { value: 'pending', label: '待审核' },
                { value: 'approved', label: '已批准' },
                { value: 'rejected', label: '已拒绝' },
                { value: 'cancelled', label: '已取消' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
          </Space>
        }
      >
        <Table<Withdrawal>
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: setPage,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>

      {/* 批准弹窗 */}
      <Modal
        title="批准提现 — 上传转账凭证"
        open={approveModalOpen}
        onCancel={() => setApproveModalOpen(false)}
        onOk={handleApproveSubmit}
        okText="确认批准"
        cancelText="取消"
        confirmLoading={approving}
        okButtonProps={{ disabled: !proofImageUrl }}
        destroyOnHidden
      >
        {approveRecord && (
          <div style={{ marginBottom: 16 }}>
            <p>积分: <strong>{approveRecord.amount}</strong> → 金额: <strong>${approveRecord.cashAmount}</strong></p>
            <p>收款方式: <strong>{getWithdrawalMethodLabel(approveRecord.paymentMethod)}</strong></p>
            <p>收款账户: <strong>{approveRecord.paymentAccount}</strong></p>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <p style={{ marginBottom: 8, fontWeight: 500 }}>转账凭证截图 <span style={{ color: '#ff4d4f' }}>*</span></p>
          {proofImageUrl ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Image
                src={proofImageUrl}
                alt="转账凭证"
                width={200}
                style={{ borderRadius: 8, border: '1px solid #d9d9d9' }}
              />
              <Button
                size="small"
                danger
                onClick={() => setProofImageUrl('')}
                style={{ position: 'absolute', top: 4, right: 4 }}
              >
                删除
              </Button>
            </div>
          ) : (
            <Upload
              name="file"
              action="/api/upload/image"
              headers={{ Authorization: `Bearer ${token}` }}
              accept="image/*"
              showUploadList={false}
              onChange={(info) => {
                if (info.file.status === 'uploading') setUploading(true);
                if (info.file.status === 'done') {
                  setUploading(false);
                  const url = info.file.response?.url;
                  if (url) setProofImageUrl(url);
                }
                if (info.file.status === 'error') {
                  setUploading(false);
                  message.error('上传失败');
                }
              }}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                上传截图
              </Button>
            </Upload>
          )}
          <p style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
            请先完成线下转账，再上传转账截图作为凭证
          </p>
        </div>

        <div>
          <p style={{ marginBottom: 8, fontWeight: 500 }}>备注（可选）</p>
          <Input.TextArea
            placeholder="如：PayPal sent / Crypto transfer completed"
            rows={2}
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
