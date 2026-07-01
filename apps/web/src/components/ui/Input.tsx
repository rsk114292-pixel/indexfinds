'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'h-9 text-sm px-3',
  md: 'h-11 text-sm px-4',
  lg: 'h-12 text-base px-4',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, suffix, error, type = 'text', size = 'md', className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <span className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full rounded-lg border bg-white
              transition-colors duration-200
              placeholder:text-muted
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10 rtl:pr-10 rtl:pl-0' : ''}
              ${isPassword || suffix ? 'pr-10 rtl:pl-10 rtl:pr-0' : ''}
              ${error ? 'border-error focus:ring-error/20 focus:border-error' : 'border-border'}
              ${sizeStyles[size]}
              ${className}
            `.trim()}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          {suffix && !isPassword && (
            <span className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 text-muted">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
