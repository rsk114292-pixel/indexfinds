// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock next-intl (ESM modules that Jest can't transform)
jest.mock('next-intl', () => ({
  useTranslations: () => (key) => key,
  useLocale: () => 'en',
}));

jest.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: ({ children, prefetch, replace, scroll, locale, ...props }) => (
      <a {...props}>{children}</a>
    ),
    redirect: jest.fn(),
    usePathname: () => '/',
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }),
  }),
}));

jest.mock('next-intl/routing', () => ({
  defineRouting: (config) => config,
}));

// Mock isomorphic-dompurify (ESM dependencies incompatible with Jest)
jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: (html) => html,
  },
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill, priority, placeholder, blurDataURL, ...props }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock Next.js Script component
jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ children, dangerouslySetInnerHTML, ...props }) => {
    if (dangerouslySetInnerHTML?.__html) {
      return <script {...props} dangerouslySetInnerHTML={dangerouslySetInnerHTML} />;
    }
    return <script {...props}>{children}</script>;
  },
}));
