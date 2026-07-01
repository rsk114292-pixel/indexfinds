import { redirect } from 'next/navigation';

// 旧路由重定向：/admin/products/mixed/[id] → /admin/products/split/[id]
export default async function MixedProductRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/products/split/${id}`);
}
