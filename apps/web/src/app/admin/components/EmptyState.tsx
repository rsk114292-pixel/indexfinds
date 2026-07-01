'use client';

import { Button, Empty } from 'antd';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    type?: 'primary' | 'default';
  };
}

export function EmptyState({
  icon,
  title = '暂无数据',
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <Empty
        image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <p className="text-base text-gray-600 mb-1">{title}</p>
            {description && <p className="text-sm text-gray-400">{description}</p>}
          </div>
        }
      >
        {action && (
          <Button type={action.type || 'primary'} onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </Empty>
    </div>
  );
}
