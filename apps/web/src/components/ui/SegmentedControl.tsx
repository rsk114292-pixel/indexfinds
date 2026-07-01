'use client';

interface SegmentOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps) {
  const sizeStyles = size === 'sm' ? 'h-8 text-xs px-3' : 'h-10 text-sm px-4';

  return (
    <div
      className={`inline-flex items-center bg-gray-100 rounded-lg p-1 ${className}`}
      role="radiogroup"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`
            inline-flex items-center justify-center gap-1.5 rounded-md font-medium
            cursor-pointer transition-all duration-200
            ${sizeStyles}
            ${
              value === option.value
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }
          `.trim()}
        >
          {option.icon && <span className="shrink-0">{option.icon}</span>}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export { SegmentedControl };
export type { SegmentedControlProps, SegmentOption };
