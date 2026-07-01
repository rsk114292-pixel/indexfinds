'use client';
import { API_BASE_URL } from '@/lib/constants';

import { useState } from 'react';
import { Upload, App } from 'antd';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload/interface';
import { useAuthStore } from '@/stores/useAuthStore';


interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  maxSize?: number; // MB
}

export default function ImageUpload({
  value,
  onChange,
  maxSize = 5,
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const token = useAuthStore((state) => state.token);

  const handleChange = (info: UploadChangeParam<UploadFile>) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      setLoading(false);
      const url = info.file.response?.url;
      if (url && onChange) {
        onChange(url);
      }
      message.success('图片上传成功');
    }
    if (info.file.status === 'error') {
      setLoading(false);
      message.error('图片上传失败');
    }
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件');
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < maxSize;
    if (!isLt5M) {
      message.error(`图片大小不能超过 ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  );

  return (
    <Upload
      name="file"
      listType="picture-card"
      className="avatar-uploader"
      showUploadList={false}
      action={`${API_BASE_URL}/upload/image`}
      headers={{
        Authorization: token ? `Bearer ${token}` : '',
      }}
      beforeUpload={beforeUpload}
      onChange={handleChange}
    >
      {value ? (
         
        <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        uploadButton
      )}
    </Upload>
  );
}
