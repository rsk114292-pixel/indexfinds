interface SkeletonProps {
  className?: string;
}

function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded animate-pulse ${
            i === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

function SkeletonImage({ className = '' }: { className?: string }) {
  return (
    <div
      className={`aspect-square bg-gray-200 rounded-lg animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-surface rounded-lg border border-border overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <SkeletonImage />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="h-5 bg-gray-200 rounded animate-pulse w-1/3" />
      </div>
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonImage, SkeletonCard };
