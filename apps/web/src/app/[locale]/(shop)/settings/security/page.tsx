import { redirect } from '@/i18n/navigation';

export default async function SecurityRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/account/security', locale });
}
