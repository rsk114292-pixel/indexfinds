import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Check,
  ExternalLink,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FAQPageJsonLd } from '@/components/seo/FAQPageJsonLd';
import {
  isTenantPathIndexable,
  resolveTenantFromHeaders,
} from '@/lib/tenant-config';

const USFANS_ORIGIN = 'https://usfansindex.net';
const USFANS_OFFICIAL_URL = 'https://www.usfans.com/';
const PAGE_PATH = '/en/usfans-spreadsheet';

const FAQ_ITEMS = [
  {
    question: 'What is the USFans product index?',
    answer:
      'It is a research directory for locating candidate listings and preserving the source details that still need verification.',
  },
  {
    question: 'Is the USFans spreadsheet a downloadable file?',
    answer:
      'Here, “spreadsheet” describes a browser-based research workflow rather than a downloadable workbook. It organizes candidate listings, visible fields and open questions.',
  },
  {
    question: 'Can I compare products before choosing an agent?',
    answer:
      'Yes. First compare visible images, options and source fields. Then confirm current price, availability and service terms on the destination website before comparing routes.',
  },
  {
    question: 'Where should I start if I do not know the product name?',
    answer:
      'Start with the category or brand index. These pages narrow the catalog before you open individual products.',
  },
  {
    question: 'Is usfansindex.net the official USFans website?',
    answer:
      'No. It is an independent research index. Use usfans.com to verify current account, service, pricing, route and policy information.',
  },
] as const;

async function getUsfansContext(locale: string) {
  if (locale !== 'en') return null;
  const headersList = await headers();
  const localTenantHost = process.env.INDEXFINDS_LOCAL_TENANT_HOST;
  const tenant = resolveTenantFromHeaders(headersList, localTenantHost);
  return tenant?.domain === 'usfansindex.net' ? tenant : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tenant = await getUsfansContext(locale);
  if (!tenant) {
    return { robots: { index: false, follow: false } };
  }

  const title = 'How to Research a USFans Spreadsheet | Source-Check Guide';
  const description =
    'Use the USFans spreadsheet research workflow to preserve source context, record missing listing fields and verify current terms before choosing a buying route.';
  const url = `${USFANS_ORIGIN}${PAGE_PATH}`;
  const canIndex = isTenantPathIndexable(tenant, PAGE_PATH);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
      languages: { en: url, 'x-default': url },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'USFans',
      locale: 'en_US',
      type: 'website',
    },
    twitter: { card: 'summary', title, description },
    robots: { index: canIndex, follow: true },
  };
}

export default async function UsfansSpreadsheetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(await getUsfansContext(locale))) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        locale="en"
        homeName="USFans"
        baseUrl={USFANS_ORIGIN}
        items={[{ name: 'USFans spreadsheet research', url: '/usfans-spreadsheet' }]}
      />
      <FAQPageJsonLd items={[...FAQ_ITEMS]} />
      <div className="bg-[#f5f7fb] text-[#111827]">
        <section className="container mx-auto px-4 py-14 sm:py-18 lg:py-22">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
            <div>
              <p className="text-sm font-bold text-primary">
                Independent USFans research workflow
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] sm:text-5xl lg:text-7xl">
                Build a USFans source-check record before choosing a route.
              </h1>
            </div>
            <div className="lg:pb-2">
              <p className="max-w-xl text-base leading-7 text-[#5c6678] lg:text-lg">
                Find a candidate listing, preserve its source context and mark
                each field as visible, missing or still needing confirmation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/products"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Search products
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/categories"
                  className="inline-flex min-h-11 items-center rounded-full border border-[#c9d3e1] bg-white px-5 py-2.5 text-sm font-bold text-[#111827] transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Browse categories
                </Link>
                <a
                  href={USFANS_OFFICIAL_URL}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#c9d3e1] bg-white px-5 py-2.5 text-sm font-bold text-[#111827] transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Verify on USFans
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-14 lg:pb-20">
          <div className="grid overflow-hidden rounded-[28px] border border-[#d9e1ed] bg-white lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
            <div className="bg-[#111827] p-7 text-white sm:p-9">
              <Search className="h-7 w-7 text-accent" />
              <h2 className="mt-8 text-3xl font-extrabold leading-[1.08] tracking-[-0.04em]">
                Use the research record in three focused passes.
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/65">
                Discover a candidate, capture what the source actually shows,
                then separate verified fields from open questions.
              </p>
            </div>
            <div className="p-6 sm:p-9">
              {[
                [
                  'Search',
                  'Enter a product, brand or category to locate a candidate listing.',
                ],
                [
                  'Narrow',
                  'Keep the source URL, visible images, option labels and stated price together.',
                ],
                [
                  'Review',
                  'Confirm current price, availability, condition and service terms on the destination website.',
                ],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="grid grid-cols-[36px_1fr] gap-4 border-b border-[#e2e8f0] py-5 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f6fb] text-primary ring-1 ring-[#d9e1ed]">
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#5c6678]">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-14 lg:pb-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div>
              <SlidersHorizontal className="h-7 w-7 text-primary" />
              <h2 className="mt-6 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                Separate discovery from route selection.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#5c6678] sm:text-base sm:leading-7">
                Categories and brands help locate candidates. They do not verify
                a seller, a product claim or the current destination terms.
              </p>
            </div>
            <nav
              aria-label="USFans product index sections"
              className="rounded-[24px] border border-[#d9e1ed] bg-white px-5 sm:px-7"
            >
              {[
                ['/brands', 'Brand filter', 'Narrow the candidate set without treating a brand label as proof.'],
                ['/categories', 'Category filter', 'Start broad, then capture the exact source listing.'],
                ['/agents/compare', 'Route comparison', 'Compare routes only after the source record is complete.'],
              ].map(([href, title, description]) => (
                <Link
                  key={href}
                  href={href}
                  className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[#e2e8f0] py-5 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span>
                    <span className="block text-base font-bold group-hover:text-primary">
                      {title}
                    </span>
                    <span className="mt-1 block text-sm text-[#5c6678]">
                      {description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-[#7c8799] transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <aside className="container mx-auto px-4 pb-14 lg:pb-20" aria-labelledby="catalog-notice-title">
          <div className="rounded-[24px] border border-[#d9e1ed] bg-white p-6 sm:p-8">
            <h2
              id="catalog-notice-title"
              className="text-xl font-extrabold tracking-[-0.03em] sm:text-2xl"
            >
              Catalog and referral notice
            </h2>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-[#5c6678] md:grid-cols-2 md:gap-8">
              <p>
                Product information may come from marketplace listings and may
                not be independently verified. Confirm the current price,
                availability, materials, images, and product condition on the
                destination website.
              </p>
              <p>
                We may receive a referral commission when you continue through
                selected agent links. Agent fees, delivery, shipping, taxes,
                and service terms must be confirmed on the destination website.
              </p>
            </div>
          </div>
        </aside>

        <section className="container mx-auto px-4 pb-16 lg:pb-24">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
              USFans spreadsheet questions
            </h2>
            <div className="mt-7 overflow-hidden rounded-[24px] border border-[#d9e1ed] bg-white px-5 sm:px-7">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.question}
                  className="group border-b border-[#e2e8f0] py-5 last:border-b-0"
                >
                  <summary className="cursor-pointer list-none pr-8 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                    {item.question}
                  </summary>
                  <p className="max-w-3xl pb-1 pt-3 text-sm leading-6 text-[#5c6678]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
