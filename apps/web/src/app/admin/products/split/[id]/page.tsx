'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const LazySplitToolContent = dynamic(
  () => import('../components/SplitToolContent').then((mod) => mod.SplitToolContent),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="h-10 w-40 animate-pulse rounded bg-gray-100" />
        <div className="h-56 animate-pulse rounded bg-gray-100" />
        <div className="h-72 animate-pulse rounded bg-gray-100" />
      </div>
    ),
  },
);

export default function SplitToolPage() {
  const params = useParams();
  const productId = params.id as string;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">拆分混合产品</h1>
        <p className="text-gray-500 mt-1">
          查看 AI 建议并执行产品拆分
        </p>
      </div>
      <LazySplitToolContent productId={productId} />
    </div>
  );
}
