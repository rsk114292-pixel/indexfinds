import { Modal, Form, Input } from 'antd';
import type { FormInstance } from 'antd';

interface NewGroupModalProps {
  open: boolean;
  form: FormInstance;
  onClose: () => void;
  onFinish: (values: { brand: string; model: string; title: string }) => void;
}

export function NewGroupModal({ open, form, onClose, onFinish }: NewGroupModalProps) {
  return (
    <Modal
      title="创建新分组"
      open={open}
      onCancel={() => {
        onClose();
        form.resetFields();
      }}
      onOk={() => form.submit()}
      okText="创建"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item
          name="brand"
          label="品牌"
          rules={[{ required: true, message: '请输入品牌名称' }]}
        >
          <Input placeholder="例如 Nike, Adidas, Jordan" />
        </Form.Item>
        <Form.Item
          name="model"
          label="型号 / 款式"
          rules={[{ required: true, message: '请输入型号或款式名称' }]}
        >
          <Input placeholder="例如 Air Force 1, Shorts, T-Shirt" />
        </Form.Item>
        <Form.Item
          name="title"
          label="建议标题（可选）"
        >
          <Input placeholder="留空则自动从品牌 + 型号生成" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
