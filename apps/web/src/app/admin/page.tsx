/**
 * Admin Root Page
 * 重定向到 Dashboard
 */
import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/dashboard');
}
