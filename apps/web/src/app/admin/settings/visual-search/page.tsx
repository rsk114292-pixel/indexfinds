import { redirect } from 'next/navigation';

/**
 * 以图搜图 — 已合并到「数据分析 → 向量管理」
 */
export default function VisualSearchRedirectPage() {
  redirect('/admin/analytics/vectors');
}
