import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Check,
  ExternalLink,
  FileSearch,
  Search,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { FAQPageJsonLd } from "@/components/seo/FAQPageJsonLd";
import ItaobuyResearchGuide from "@/components/tenant/ItaobuyResearchGuide";
import {
  isTenantReleasedForIndexing,
  resolveTenantFromHeaders,
} from "@/lib/tenant-config";
import {
  getTenantEditorialProfile,
  type TenantEditorialProfile,
} from "@/lib/tenant-editorial-profiles";
import { getTenantResearchPaths } from "@/lib/tenant-research-pages";

async function getGuideContext(locale: string) {
  if (locale !== "en") return null;

  const headersList = await headers();
  const tenant = resolveTenantFromHeaders(
    headersList,
    process.env.INDEXFINDS_LOCAL_TENANT_HOST,
  );
  if (
    !tenant ||
    tenant.domain === "usfansindex.net" ||
    getTenantResearchPaths(tenant.domain).length > 0
  ) {
    return null;
  }

  const profile = getTenantEditorialProfile(tenant.domain);
  if (!profile) return null;

  return { tenant, profile };
}

function buildFaq(
  siteName: string,
  profile: TenantEditorialProfile,
  domain: string,
) {
  if (domain === "itaobuyindex.com") {
    return [
      {
        question: "What is an iTaoBuy spreadsheet?",
        answer:
          "An iTaoBuy spreadsheet is a discovery list for product links, categories and source information. It does not certify a seller, product or platform.",
      },
      {
        question: "Is iTaoBuy legit?",
        answer:
          "No independent directory can certify that. Verify the current domain, company and policy information, payment flow, support channels and recent external evidence before deciding.",
      },
      {
        question: "Is iTaoBuy safe?",
        answer:
          "No transaction is risk-free. Protect your account, verify the domain and review product evidence, payment terms, route rules and the laws that apply to your destination.",
      },
      {
        question: "How should I verify an iTaoBuy promo code?",
        answer:
          "Confirm the code on the current platform site or inside your account. Check its date, eligibility, minimum spend, discount cap and exclusions.",
      },
      {
        question: "Should I trust iTaoBuy Reddit reviews?",
        answer:
          "Treat each post as one dated report. Check its order stage, route, destination, evidence, account history and later follow-up before comparing it with current terms.",
      },
    ];
  }

  return [
    {
      question: `What is ${siteName}?`,
      answer: `${siteName} is a browser-based research directory. It helps ${profile.audience.toLowerCase()}`,
    },
    {
      question: `What should I verify when using ${siteName}?`,
      answer: `Check ${profile.researchFocus.toLowerCase()} Confirm current price, availability, materials and product options on the destination listing when those details are not independently verified.`,
    },
    {
      question: `Does ${siteName} process product orders?`,
      answer:
        "No. This directory supports product research and may link to external buying services. Final prices, fees, delivery terms and availability are set by the destination website.",
    },
    {
      question: "Can an outbound link be a referral link?",
      answer:
        "Yes. Selected outbound buying links may generate a referral commission. This does not change the need to confirm current terms on the destination website.",
    },
  ];
}

function buildMethod(productMode: "agent-feed" | "direct-products" | "guide-only") {
  if (productMode === "guide-only") {
    return [
      ["Define the question", "Write down the product details you need to compare before collecting listings."],
      ["Record the source", "Keep the original listing link and mark fields that are missing or unclear."],
      ["Compare the evidence", "Use only visible listing information and send unresolved questions to the seller."],
    ] as const;
  }

  if (productMode === "direct-products") {
    return [
      ["Browse the catalog", "Begin with a category or brand when the exact product phrase is not yet clear."],
      ["Inspect the listing", "Open the product page and review images, options, source status and visible price context."],
      ["Confirm externally", "Check current availability, fees and final terms on the destination website."],
    ] as const;
  }

  return [
    ["Refine the search", "Use a product, brand or category phrase to reduce unrelated results."],
    ["Check the source", "Review visible product fields and identify information that is not independently verified."],
    ["Compare the route", "Open external buying options only after the product shortlist is ready."],
  ] as const;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const context = await getGuideContext(locale);
  if (!context) return { robots: { index: false, follow: false } };

  const { tenant, profile } = context;
  const title = `${profile.guideTitle} | ${tenant.branding?.siteName || tenant.title}`;
  const description = profile.summary;
  const url = `${tenant.canonicalOrigin}/en/site-guide`;
  const canIndex = isTenantReleasedForIndexing(tenant);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
      languages: { en: url, "x-default": url },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: tenant.branding?.siteName || tenant.title,
      locale: "en_US",
      type: "article",
    },
    twitter: { card: "summary", title, description },
    robots: { index: canIndex, follow: true },
  };
}

export default async function TenantSiteGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const context = await getGuideContext(locale);
  if (!context) notFound();

  const { tenant, profile } = context;
  const branding = tenant.branding!;
  const faqItems = buildFaq(tenant.title, profile, tenant.domain);
  const method = buildMethod(tenant.productMode);

  if (tenant.domain === "itaobuyindex.com") {
    return (
      <>
        <BreadcrumbJsonLd
          locale="en"
          homeName={branding.siteName}
          baseUrl={tenant.canonicalOrigin}
          items={[{ name: profile.guideTitle, url: "/site-guide" }]}
        />
        <FAQPageJsonLd items={faqItems} />
        <ItaobuyResearchGuide tenant={tenant} faqItems={faqItems} />
      </>
    );
  }

  return (
    <>
      <FAQPageJsonLd items={faqItems} />
      <main className="bg-[#f7f8fa] text-[#111827]">
        <section className="container mx-auto grid min-h-[72dvh] items-center gap-10 px-4 py-14 md:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] md:py-20">
          <div>
            <p className="text-sm font-bold text-primary">{tenant.title} research guide</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] sm:text-5xl lg:text-[3.25rem]">
              {profile.guideTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#5d6678] sm:text-lg sm:leading-8">
              {profile.summary}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Browse products
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/agents/compare"
                className="inline-flex min-h-11 items-center rounded-full border border-[#cfd5df] bg-white px-5 py-2.5 text-sm font-bold text-[#111827] transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Compare buying routes
              </Link>
            </div>
          </div>

          <div className="relative mx-auto flex aspect-square w-full max-w-[360px] items-center justify-center overflow-hidden rounded-[28px] border border-[#dfe3ea] bg-white shadow-[0_24px_80px_rgba(17,24,39,0.10)]">
            <div className="absolute inset-x-8 top-8 h-px bg-primary/35" />
            <Image
              src={branding.logoPath}
              alt={`${branding.siteName} platform mark`}
              width={152}
              height={152}
              className="h-36 w-36 object-contain"
              priority
            />
            <p className="absolute inset-x-8 bottom-8 text-center text-xs leading-5 text-[#6b7280]">
              Product directory and research workflow
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-14 lg:pb-20">
          <div className="grid overflow-hidden rounded-[28px] border border-[#dfe3ea] bg-white lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
            <div className="bg-[#111827] p-7 text-white sm:p-9">
              <Search className="h-7 w-7 text-accent" />
              <h2 className="mt-8 text-3xl font-extrabold leading-[1.08] tracking-[-0.04em]">
                A research method built around visible evidence.
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/70">
                The directory helps organize product research. It does not verify every marketplace field or process orders.
              </p>
            </div>
            <div className="p-6 sm:p-9">
              {method.map(([title, description]) => (
                <div
                  key={title}
                  className="grid grid-cols-[36px_1fr] gap-4 border-b border-[#e3e6eb] py-5 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f6f8] text-primary ring-1 ring-[#dfe3ea]">
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#667085]">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-14 lg:pb-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
            <div>
              <FileSearch className="h-7 w-7 text-primary" />
              <h2 className="mt-6 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                Who this guide is designed for
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#667085]">
                {profile.audience}
              </p>
            </div>
            <div className="rounded-[24px] border border-[#dfe3ea] bg-white p-6 sm:p-8">
              <h2 className="text-xl font-extrabold tracking-[-0.03em] sm:text-2xl">
                Research focus
              </h2>
              <p className="mt-4 text-base leading-7 text-[#667085]">
                {profile.researchFocus}
              </p>
              <nav aria-label={`${tenant.title} research paths`} className="mt-6 border-t border-[#e3e6eb]">
                {[
                  ["/categories", "Browse categories"],
                  ["/brands", "Explore brands"],
                  ["/products", "Search products"],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex min-h-12 items-center justify-between border-b border-[#e3e6eb] py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {label}
                    <ArrowRight className="h-4 w-4 text-[#8b95a5] transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </section>

        <aside className="container mx-auto px-4 pb-14 lg:pb-20" aria-labelledby="tenant-guide-notice">
          <div className="rounded-[24px] border border-[#dfe3ea] bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <ExternalLink className="h-5 w-5 text-primary" />
              <h2 id="tenant-guide-notice" className="text-xl font-extrabold tracking-[-0.03em] sm:text-2xl">
                Source and referral notice
              </h2>
            </div>
            <div className="mt-5 grid gap-5 text-sm leading-6 text-[#667085] md:grid-cols-2 md:gap-9">
              <p>
                Product information may come from marketplace listings and may not be independently verified. Confirm current price, availability, materials, images and product options on the destination website.
              </p>
              <p>
                Selected outbound buying links may generate a referral commission. Agent fees, shipping, taxes, delivery terms and final availability must be confirmed on the destination website.
              </p>
            </div>
          </div>
        </aside>

        <section className="container mx-auto px-4 pb-16 lg:pb-24">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
              Questions about {tenant.title}
            </h2>
            <div className="mt-7 overflow-hidden rounded-[24px] border border-[#dfe3ea] bg-white px-5 sm:px-7">
              {faqItems.map((item) => (
                <details key={item.question} className="group border-b border-[#e3e6eb] py-5 last:border-b-0">
                  <summary className="cursor-pointer list-none pr-8 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                    {item.question}
                  </summary>
                  <p className="max-w-3xl pb-1 pt-3 text-sm leading-6 text-[#667085]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
