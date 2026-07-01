import { notFound } from 'next/navigation';
import FindSimilarButton from '@/components/product/recommendations/FindSimilarButton';

export default function VisualSearchProductFlowFixturePage() {
  if (process.env.NEXT_PUBLIC_E2E !== '1') {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-4 px-4 py-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
          E2E Fixture
        </p>
        <h1 className="mt-2 text-lg font-semibold text-foreground">
          Visual Search Product Flow
        </h1>
        <p className="mt-2 text-sm text-muted">
          Fixture Adidas Slides
        </p>
        <div className="mt-4">
          <FindSimilarButton productId="e2e-product" capsule />
        </div>
      </div>
    </main>
  );
}
