import { redirect } from 'next/navigation';

export default function AIConfigRedirect() {
  redirect('/admin/settings/ai');
}
