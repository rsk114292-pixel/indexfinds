import { Metadata } from 'next';
import NotFoundRecovery from '@/components/NotFoundRecovery';
import { getFeaturedBrands, getNotFoundMessages } from '@/lib/not-found';

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function LocaleNotFoundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [messages, featuredBrands] = await Promise.all([
    getNotFoundMessages(locale),
    getFeaturedBrands(),
  ]);

  return <NotFoundRecovery locale={locale} messages={messages} featuredBrands={featuredBrands} />;
}
