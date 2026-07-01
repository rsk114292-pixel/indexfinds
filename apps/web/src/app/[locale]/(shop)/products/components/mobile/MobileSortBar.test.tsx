import { fireEvent, render, screen } from '@testing-library/react';
import MobileSortBar from './MobileSortBar';

const mockPush = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/products',
}));

let mockParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockParams,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      sortBy: 'Sort',
      popular: 'Recommended',
      newest: 'Newest',
      priceAsc: 'Price: Low to High',
      priceDesc: 'Price: High to Low',
      title: 'Share',
    };
    return map[key] || key;
  },
}));

jest.mock('@/components/mobile/ui/MobileSortSheet', () => ({
  MobileSortSheet: () => null,
}));

jest.mock('@/hooks/useScrollDirection', () => ({
  useScrollDirection: () => ({ headerVisible: true }),
}));

describe('MobileSortBar', () => {
  const defaultProps = { viewMode: 'grid' as const, onViewChange: jest.fn() };

  beforeEach(() => {
    mockParams = new URLSearchParams();
  });

  it('默认显示 Recommended 而非 Newest', () => {
    render(<MobileSortBar {...defaultProps} />);
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.queryByText(/Newest/)).not.toBeInTheDocument();
  });

  it('URL 有 sortBy=newest 时显示 Newest', () => {
    mockParams = new URLSearchParams('sortBy=newest');
    render(<MobileSortBar {...defaultProps} />);
    expect(screen.getByText('Newest')).toBeInTheDocument();
  });

  it('排序选项不包含 relevance', () => {
    render(<MobileSortBar {...defaultProps} />);
    expect(screen.queryByText('Relevance')).not.toBeInTheDocument();
  });

  it('传入 onOpenShare 时显示分享按钮并响应点击', () => {
    const onOpenShare = jest.fn();
    render(<MobileSortBar {...defaultProps} onOpenShare={onOpenShare} />);

    fireEvent.click(screen.getByLabelText('Share'));

    expect(onOpenShare).toHaveBeenCalledTimes(1);
  });
});
