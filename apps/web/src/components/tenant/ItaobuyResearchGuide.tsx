import Image from "next/image";
import { ArrowRight, ExternalLink, FileSearch, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TenantConfig } from "@/lib/tenant-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function ItaobuyResearchGuide({
  tenant,
  faqItems,
}: {
  tenant: TenantConfig;
  faqItems: FaqItem[];
}) {
  const branding = tenant.branding!;

  return (
    <div className="bg-[#f4f1ea] text-[#111827]">
      <section className="border-b border-[#cbd1da] bg-[#0b1727] text-white">
        <div className="container mx-auto grid min-h-[66dvh] items-center gap-10 px-4 py-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:py-24">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#ffb44a]">
              <FileSearch className="h-4 w-4" />
              Independent iTaoBuy research archive
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] sm:text-5xl lg:text-[3.8rem]">
              iTaoBuy guide: keep each claim with its evidence.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
              Use this archive to separate product discovery, source checks,
              safety questions, promo terms and dated community reports. It is
              an independent research guide, not the official iTaoBuy website.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#b7410d] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#9f3d0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb44a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1727]"
              >
                Search products <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://www.itaobuy.com/"
                target="_blank"
                rel="noopener noreferrer external nofollow"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:border-[#ffb44a] hover:text-[#ffb44a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb44a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1727]"
              >
                Check the current platform site <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="border-y border-white/20 py-8 lg:border-l lg:border-y-0 lg:py-4 lg:pl-12">
            <Image
              src={branding.logoPath}
              alt="iTaoBuy platform icon"
              width={96}
              height={96}
              className="h-20 w-20 rounded-2xl bg-white object-contain p-2"
              priority
            />
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-[#ffb44a]">
              Archive index
            </p>
            <nav className="mt-3 border-t border-white/15" aria-label="iTaoBuy research sections">
              {[
                ["#spreadsheet", "01 Spreadsheet"],
                ["#workflow", "02 Source workflow"],
                ["#safety", "03 Safety checks"],
                ["#promo-code", "04 Promo code"],
                ["#reddit", "05 Reddit research"],
                ["#faq", "06 FAQ"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="flex min-h-11 items-center justify-between border-b border-white/15 text-sm font-semibold text-white/76 hover:text-[#ffb44a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb44a]"
                >
                  {label} <ArrowRight className="h-4 w-4" />
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <section id="spreadsheet" className="scroll-mt-24 border-b border-[#cbd1da]">
        <div className="container mx-auto grid gap-8 px-4 py-14 lg:grid-cols-[180px_1fr] lg:gap-16 lg:py-20">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#b7410d]">01 / Spreadsheet</p>
          <div>
            <h2 className="max-w-3xl text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
              Treat an iTaoBuy spreadsheet as a discovery record.
            </h2>
            <div className="mt-7 grid gap-7 text-sm leading-7 text-[#5f6672] md:grid-cols-2">
              <p>
                Begin with a precise product, category or source term. Keep the
                current marketplace URL, visible option, listed price and image
                evidence beside the result.
              </p>
              <p>
                A directory entry can become stale. Reopen the source before
                relying on availability, product options, seller details or a
                price shown in an earlier snapshot.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/products" className="font-bold text-[#b7410d] underline decoration-[#e96517]/35 underline-offset-4 hover:decoration-[#e96517]">Search the product index</Link>
              <Link href="/categories" className="font-bold text-[#b7410d] underline decoration-[#e96517]/35 underline-offset-4 hover:decoration-[#e96517]">Browse categories</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-24 border-b border-[#cbd1da] bg-white">
        <div className="container mx-auto grid gap-8 px-4 py-14 lg:grid-cols-[180px_1fr] lg:gap-16 lg:py-20">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#b7410d]">02 / Workflow</p>
          <div>
            <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">A source-trace workflow for every shortlist.</h2>
            <ol className="mt-8 border-t border-[#cbd1da]">
              {[
                ["Search record", "Write the exact query and why the result matches it."],
                ["Source record", "Keep the original listing, selected option and visible evidence together."],
                ["Open question", "Label missing measurements, materials, availability or seller details instead of guessing."],
                ["External route", "Compare fees, restrictions and service terms only after the product record is stable."],
              ].map(([title, text], index) => (
                <li key={title} className="grid grid-cols-[44px_1fr] gap-5 border-b border-[#cbd1da] py-5 sm:grid-cols-[60px_1fr]">
                  <span className="font-mono text-xs font-bold text-[#b7410d]">0{index + 1}</span>
                  <div><h3 className="font-extrabold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#596174]">{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="safety" className="scroll-mt-24 border-b border-[#cbd1da]">
        <div className="container mx-auto grid gap-8 px-4 py-14 lg:grid-cols-[180px_1fr] lg:gap-16 lg:py-20">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#b7410d]">03 / Safety</p>
          <div>
            <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-[#bd4d0f]" /><h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Is iTaoBuy legit or safe?</h2></div>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#5f6672]">
              No independent directory can certify a platform as risk-free.
              Check the current domain, company and policy information, payment
              flow, support channels, recent order evidence and destination
              rules before deciding. Stop when the domain, payment request or
              order details do not match what you expected.
            </p>
          </div>
        </div>
      </section>

      <section id="promo-code" className="scroll-mt-24 border-b border-[#cbd1da] bg-white">
        <div className="container mx-auto grid gap-8 px-4 py-14 lg:grid-cols-[180px_1fr] lg:gap-16 lg:py-20">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#b7410d]">04 / Promo code</p>
          <div>
            <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Verify an iTaoBuy promo code as a dated offer.</h2>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#5f6672]">
              Confirm the code on the current platform site or inside your
              account. Record the date, eligibility, minimum spend, discount
              cap, route exclusions and stacking rules. This archive does not
              publish an unverified discount as a current offer.
            </p>
          </div>
        </div>
      </section>

      <section id="reddit" className="scroll-mt-24 border-b border-[#cbd1da]">
        <div className="container mx-auto grid gap-8 px-4 py-14 lg:grid-cols-[180px_1fr] lg:gap-16 lg:py-20">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#b7410d]">05 / Reddit</p>
          <div>
            <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Read iTaoBuy Reddit posts as dated reports.</h2>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#5f6672]">
              Check the post date, order stage, route, destination, screenshots,
              account history and later follow-up. One positive or negative
              report does not establish the current result for a different
              product, route or destination.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 bg-white">
        <div className="container mx-auto grid gap-8 px-4 py-14 lg:grid-cols-[180px_1fr] lg:gap-16 lg:py-20">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#b7410d]">06 / FAQ</p>
          <div>
            <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">iTaoBuy research questions</h2>
            <div className="mt-8 border-t border-[#cbd1da]">
              {faqItems.map((item) => (
                <details key={item.question} className="border-b border-[#cbd1da] py-5">
                  <summary className="cursor-pointer list-none pr-8 font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e96517]">
                    {item.question}
                  </summary>
                  <p className="max-w-3xl pt-3 text-sm leading-7 text-[#596174]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
