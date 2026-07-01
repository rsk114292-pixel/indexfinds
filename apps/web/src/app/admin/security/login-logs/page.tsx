import { redirect } from 'next/navigation';

export default function LoginLogsRedirect() {
  redirect('/admin/account/login-logs');
}
