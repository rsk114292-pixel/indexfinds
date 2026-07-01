'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:scale-95 shadow-sm',
  secondary:
    'bg-white text-foreground border border-border hover:bg-gray-50 active:scale-95',
  ghost:
    'text-foreground hover:bg-gray-100 active:scale-95',
  link:
    'text-primary hover:text-primary-hover underline-offset-4 hover:underline p-0 h-auto min-h-0',
  danger:
    'bg-error text-white hover:bg-red-600 active:scale-95',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm rounded-md min-h-[36px]',
  md: 'h-11 px-5 text-sm rounded-lg min-h-[44px]',
  lg: 'h-12 px-6 text-base rounded-lg min-h-[48px]',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      children,
      className = '',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          cursor-pointer transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          ${variantStyles[variant]}
          ${variant !== 'link' ? sizeStyles[size] : ''}
          ${className}
        `.trim()}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
