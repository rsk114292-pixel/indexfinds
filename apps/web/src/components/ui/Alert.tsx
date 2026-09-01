'use client';

import { useState } from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  type?: AlertType;
  title?: string;
  description?: string;
  closable?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
}

const typeConfig: Record<AlertType, { icon: React.ReactNode; border: string; bg: string; text: string }> = {
  info: {
    icon: <Info className="w-5 h-5" />,
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
  },
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    border: 'border-l-success',
    bg: 'bg-green-50',
    text: 'text-green-700',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    border: 'border-l-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  error: {
    icon: <XCircle className="w-5 h-5" />,
    border: 'border-l-error',
    bg: 'bg-red-50',
    text: 'text-red-700',
  },
};

function Alert({
  type = 'info',
  title,
  description,
  closable = false,
  onClose,
  children,
  className = '',
}: AlertProps) {
  const [visible, setVisible] = useState(true);
  const config = typeConfig[type];

  if (!visible) return null;

  return (
    <div
      role="alert"
      className={`
        flex gap-3 p-4 rounded-lg border-l-4
        ${config.border} ${config.bg}
        ${className}
      `.trim()}
    >
      <span className={`shrink-0 mt-0.5 ${config.text}`}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`font-medium ${config.text}`}>{title}</p>
        )}
        {description && (
          <p className={`text-sm mt-1 ${config.text}`}>{description}</p>
        )}
        {children}
      </div>
      {closable && (
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
          className={`shrink-0 ${config.text} hover:opacity-70 cursor-pointer`}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export { Alert };
export type { AlertProps, AlertType };
