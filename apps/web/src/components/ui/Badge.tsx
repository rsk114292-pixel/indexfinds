interface BadgeProps {
  count?: number;
  dot?: boolean;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}

function Badge({
  count,
  dot = false,
  color = 'bg-error',
  className = '',
  children,
}: BadgeProps) {
  const showBadge = dot || (count !== undefined && count > 0);

  return (
    <span className={`relative inline-flex ${className}`}>
      {children}
      {showBadge && (
        <span
          className={`
            absolute -top-1 -right-1 rtl:right-auto rtl:-left-1 flex items-center justify-center
            ${color} text-white rounded-full
            ${dot ? 'w-2.5 h-2.5' : 'min-w-[18px] h-[18px] px-1 text-xs font-medium'}
          `.trim()}
        >
          {!dot && count !== undefined && (count > 99 ? '99+' : count)}
        </span>
      )}
    </span>
  );
}

export { Badge };
export type { BadgeProps };
