'use client';

import { X } from 'lucide-react';

type TagColor = 'primary' | 'accent' | 'gray' | 'purple' | 'blue' | 'green' | 'red';
type TagSize = 'sm' | 'md';

interface TagProps {
  color?: TagColor;
  size?: TagSize;
  closable?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const colorStyles: Record<TagColor, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/15 text-amber-700',
  gray: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-50 text-purple-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
};

const sizeStyles: Record<TagSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

function Tag({
  color = 'gray',
  size = 'md',
  closable = false,
  onClose,
  children,
  className = '',
  onClick,
}: TagProps) {
  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${onClick ? 'cursor-pointer' : ''}
        ${colorStyles[color]}
        ${sizeStyles[size]}
        ${className}
      `.trim()}
    >
      {children}
      {closable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          className="ml-0.5 rtl:mr-0.5 rtl:ml-0 hover:opacity-70 cursor-pointer"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

export { Tag };
export type { TagProps, TagColor };
