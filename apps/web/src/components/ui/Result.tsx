import { CheckCircle, XCircle, Info, AlertTriangle, FileQuestion } from 'lucide-react';

type ResultStatus = 'success' | 'error' | 'info' | 'warning' | '404';

interface ResultProps {
  status: ResultStatus;
  title: string;
  subTitle?: string;
  extra?: React.ReactNode;
  className?: string;
}

const statusConfig: Record<ResultStatus, { icon: React.ReactNode; color: string }> = {
  success: {
    icon: <CheckCircle className="w-16 h-16" strokeWidth={1.5} />,
    color: 'text-success',
  },
  error: {
    icon: <XCircle className="w-16 h-16" strokeWidth={1.5} />,
    color: 'text-error',
  },
  info: {
    icon: <Info className="w-16 h-16" strokeWidth={1.5} />,
    color: 'text-primary',
  },
  warning: {
    icon: <AlertTriangle className="w-16 h-16" strokeWidth={1.5} />,
    color: 'text-amber-500',
  },
  '404': {
    icon: <FileQuestion className="w-16 h-16" strokeWidth={1.5} />,
    color: 'text-muted',
  },
};

function Result({ status, title, subTitle, extra, className = '' }: ResultProps) {
  const config = statusConfig[status];

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className={`mb-6 ${config.color}`}>{config.icon}</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      {subTitle && (
        <p className="text-sm text-muted max-w-md">{subTitle}</p>
      )}
      {extra && <div className="mt-6">{extra}</div>}
    </div>
  );
}

export { Result };
export type { ResultProps, ResultStatus };
