import { redirect } from 'next/navigation';

// 旧路由重定向：/admin/products/review → /admin/products?tab=review
// 透传 jobId 参数
export default async function ReviewPageRedirect({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const params = await searchParams;
  const jobId = params.jobId;
  const url = jobId
    ? `/admin/products?tab=review&jobId=${encodeURIComponent(jobId)}`
    : '/admin/products?tab=review';
  redirect(url);
}
