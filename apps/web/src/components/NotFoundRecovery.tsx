import BrandLogo from '@/components/brands/BrandLogo';
import NotFoundRedirectLink from '@/components/NotFoundRedirectLink';
import type { FeaturedBrand } from '@/lib/not-found';

type NotFoundRecoveryMessages = {
  notFound: string;
  notFoundDesc: string;
  backHome: string;
  redirectNotice: string;
  searchTitle: string;
  searchPlaceholder: string;
  searchAction: string;
  popularBrands: string;
};

type NotFoundRecoveryProps = {
  locale: string;
  messages: NotFoundRecoveryMessages;
  featuredBrands: FeaturedBrand[];
};

export default function NotFoundRecovery({
  locale,
  messages,
  featuredBrands,
}: NotFoundRecoveryProps) {
  return (
    <div className="min-h-[72vh] px-4 py-10 sm:py-14">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="rounded-[2rem] border border-border bg-surface px-6 py-10 text-center shadow-sm sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">
            404
          </p>
          <h1 className="mt-4 text-5xl font-bold text-primary sm:text-6xl">404</h1>
          <h2 className="mt-5 text-2xl font-semibold text-foreground sm:text-3xl">
            {messages.notFound}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            {messages.notFoundDesc}
          </p>
          <p className="mt-4 text-sm font-medium text-primary/80">
            {messages.redirectNotice}
          </p>
          <div className="mt-7 flex justify-center">
            <NotFoundRedirectLink
              href={`/${locale}`}
              className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              {messages.backHome}
            </NotFoundRedirectLink>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <form
            action={`/${locale}/search`}
            className="rounded-[1.5rem] border border-border bg-surface px-6 py-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-foreground">
              {messages.searchTitle}
            </h3>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                name="q"
                required
                placeholder={messages.searchPlaceholder}
                className="h-12 flex-1 rounded-full border border-border bg-white px-5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary"
              />
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                {messages.searchAction}
              </button>
            </div>
          </form>

          {featuredBrands.length > 0 ? (
            <div className="rounded-[1.5rem] border border-border bg-surface px-6 py-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">
                {messages.popularBrands}
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {featuredBrands.map((brand) => (
                  <a
                    key={brand.slug}
                    href={`/${locale}/brands/${brand.slug}`}
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-white px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                  >
                    <BrandLogo name={brand.name} logoUrl={brand.logoUrl} size="sm" />
                    <span className="min-w-0 truncate text-sm font-medium text-foreground group-hover:text-primary">
                      {brand.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
