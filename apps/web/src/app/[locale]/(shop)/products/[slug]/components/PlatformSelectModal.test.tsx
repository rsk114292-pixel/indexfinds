import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import PlatformSelectModal from './PlatformSelectModal';

const mockFetchPlatforms = jest.fn().mockResolvedValue(undefined);
const mockOnClose = jest.fn();
const mockOnSelect = jest.fn();
let mockLocale = 'en';

jest.mock('next-intl', () => ({
  useLocale: () => mockLocale,
  useTranslations: () => (key: string, values?: { platform?: string }) => {
    if (key === 'continueTo') {
      return `Continue to ${values?.platform || ''}`.trim();
    }
    return key;
  },
}));

jest.mock('antd', () => ({
  Modal: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title: ReactNode;
    children: ReactNode;
  }) =>
    open ? (
      <div>
        <h1>{title}</h1>
        <div>{children}</div>
      </div>
    ) : null,
}));

jest.mock('@/stores/usePlatformStore', () => {
  const actual = jest.requireActual('@/stores/usePlatformStore');
  return {
    ...actual,
    usePlatformStore: jest.fn(),
  };
});

const { usePlatformStore } = jest.requireMock(
  '@/stores/usePlatformStore',
) as {
  usePlatformStore: jest.Mock;
};

const platforms = [
  {
    id: 'p1',
    key: 'loongbuy',
    name: 'Loongbuy Legacy',
    description: 'Legacy description',
    translations: {
      en: { name: 'Loongbuy EN', description: 'Loongbuy EN description' },
      fr: { name: 'Loongbuy FR', description: 'Loongbuy FR description' },
      ar: { name: 'لونغ باي' },
    },
    isActive: true,
  },
  {
    id: 'p2',
    key: 'sugargoo',
    name: 'Sugargoo Legacy',
    description: 'Sugargoo legacy description',
    translations: {
      en: { name: 'Sugargoo EN', description: 'Sugargoo EN description' },
    },
    isActive: true,
  },
];

describe('PlatformSelectModal locale rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlatformStore.mockReturnValue({
      platforms,
      platformKey: 'loongbuy',
      fetchPlatforms: mockFetchPlatforms,
    });
    mockLocale = 'en';
  });

  it('renders English content for /en', () => {
    mockLocale = 'en';
    render(
      <PlatformSelectModal open onClose={mockOnClose} onSelect={mockOnSelect} />,
    );

    expect(screen.getByText('Loongbuy EN')).toBeInTheDocument();
    expect(screen.getByText('Loongbuy EN description')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue to Loongbuy EN' }),
    ).toBeInTheDocument();
  });

  it('renders French translation for /fr and falls back to English when missing', () => {
    mockLocale = 'fr';
    render(
      <PlatformSelectModal open onClose={mockOnClose} onSelect={mockOnSelect} />,
    );

    expect(screen.getByText('Loongbuy FR')).toBeInTheDocument();
    expect(screen.getByText('Loongbuy FR description')).toBeInTheDocument();
    // sugargoo has no fr translation: fallback to en
    expect(screen.getByText('Sugargoo EN')).toBeInTheDocument();
    expect(screen.getByText('Sugargoo EN description')).toBeInTheDocument();
  });

  it('renders Arabic name for /ar and falls back description to English', () => {
    mockLocale = 'ar';
    render(
      <PlatformSelectModal open onClose={mockOnClose} onSelect={mockOnSelect} />,
    );

    expect(screen.getByText('لونغ باي')).toBeInTheDocument();
    // loongbuy has ar name but no ar description: fallback to en description
    expect(screen.getByText('Loongbuy EN description')).toBeInTheDocument();
    // sugargoo has no ar translation: fallback to en
    expect(screen.getByText('Sugargoo EN')).toBeInTheDocument();
  });
});
