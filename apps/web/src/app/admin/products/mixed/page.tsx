import { redirect } from 'next/navigation';

// 旧路由重定向：/admin/products/mixed → /admin/products?tab=mixed
export default function MixedProductsPageRedirect() {
  redirect('/admin/products?tab=mixed');
}
