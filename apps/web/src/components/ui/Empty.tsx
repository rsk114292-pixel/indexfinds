import { PackageOpen } from 'lucide-react';

interface EmptyProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function Empty({
  icon,
  title = 'No data',
  description,
  action,
  className = '',
}: EmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="text-muted mb-4">
        {icon || <PackageOpen className="w-12 h-12" strokeWidth={1.5} />}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export { Empty };
export type { EmptyProps };
