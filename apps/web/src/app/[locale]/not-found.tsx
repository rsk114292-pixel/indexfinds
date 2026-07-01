import { getLocale } from 'next-intl/server';
import NotFoundRecovery from '@/components/NotFoundRecovery';
import { getFeaturedBrands, getNotFoundMessages } from '@/lib/not-found';

export default async function NotFound() {
  const locale = await getLocale();
  const [messages, featuredBrands] = await Promise.all([
    getNotFoundMessages(locale),
    getFeaturedBrands(),
  ]);

  return <NotFoundRecovery locale={locale} messages={messages} featuredBrands={featuredBrands} />;
}
