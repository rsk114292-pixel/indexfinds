import { Link } from '@/i18n/navigation';
import { APP_NAME } from '@/lib/constants';
import { getTranslations } from 'next-intl/server';
import CurrencyDisclaimer from './CurrencyDisclaimer';
import FooterSocialLinks from './FooterSocialLinks';

export default async function Footer() {
  const t = await getTranslations('footer');
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: t('about'),
      links: [
        { label: t('aboutUs'), href: '/about' },
        { label: t('howItWorks'), href: '/how-it-works' },
      ],
    },
    {
      title: t('shop'),
      links: [
        { label: t('allCategories'), href: '/categories' },
        { label: t('allBrands'), href: '/brands' },
        { label: t('newArrivals'), href: '/products?sortBy=newest' },
        { label: t('bestSellers'), href: '/products?sortBy=popular' },
      ],
    },
    {
      title: t('support'),
      links: [
        { label: t('helpCenter'), href: '/help' },
        { label: t('shippingInfo'), href: '/shipping' },
        { label: t('returns'), href: '/returns' },
        { label: t('contactUs'), href: '/contact' },
      ],
    },
    {
      title: t('legal'),
      links: [
        { label: t('privacyPolicy'), href: '/privacy' },
        { label: t('termsOfService'), href: '/terms' },
        { label: t('cookiePolicy'), href: '/cookies' },
      ],
    },
  ];

  return (
    <footer className="bg-secondary text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        {/* Links grid */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 mb-10">
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/60 hover:text-white transition-colors duration-200 text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Logo + Copyright */}
            <div className="flex items-center gap-3">
              <span className="font-bold text-primary">{APP_NAME}</span>
              <span className="text-sm text-white/50">
                {t('allRightsReserved', { year: currentYear })}
              </span>
            </div>

            {/* Social icons */}
            <FooterSocialLinks />
          </div>
          <CurrencyDisclaimer />
        </div>
      </div>
    </footer>
  );
}
