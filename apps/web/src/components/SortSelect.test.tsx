import { render, screen, fireEvent } from '@testing-library/react';
import SortSelect from './SortSelect';

const mockPush = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/products',
}));

let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      label: '排序商品',
      popular: '综合排序',
      newest: '最新上架',
      priceAsc: '价格从低到高',
      priceDesc: '价格从高到低',
    };
    return map[key] || key;
  },
}));

describe('SortSelect', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it('默认显示综合排序', () => {
    render(<SortSelect />);
    expect(screen.getByRole('button')).toHaveTextContent('综合排序');
  });

  it('URL 有 sortBy=newest 时显示最新上架', () => {
    mockSearchParams = new URLSearchParams('sortBy=newest');
    render(<SortSelect />);
    expect(screen.getByRole('button')).toHaveTextContent('最新上架');
  });

  it('点击按钮展开下拉菜单', () => {
    render(<SortSelect />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('选择非默认选项跳转并带 sortBy 参数', () => {
    render(<SortSelect />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('最新上架'));

    expect(mockPush).toHaveBeenCalledWith('/products?sortBy=newest&page=1');
  });

  it('选择默认选项（popular）时删除 sortBy 参数', () => {
    mockSearchParams = new URLSearchParams('sortBy=newest');
    render(<SortSelect />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('综合排序'));

    expect(mockPush).toHaveBeenCalledWith('/products?page=1');
  });

  it('点击当前已选中的非默认选项回到默认排序', () => {
    mockSearchParams = new URLSearchParams('sortBy=newest');
    render(<SortSelect />);
    fireEvent.click(screen.getByRole('button'));
    // 按钮和列表都有"最新上架"，用 aria-selected 定位列表中的选中项
    const activeOption = screen.getByRole('option', { selected: true });
    fireEvent.click(activeOption);

    // 点击已选中项 → 回到默认，删除 sortBy
    expect(mockPush).toHaveBeenCalledWith('/products?page=1');
  });

  it('ESC 键关闭下拉菜单', () => {
    render(<SortSelect />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('点击外部区域关闭下拉菜单', () => {
    render(<SortSelect />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('保留其他 URL 参数不丢失', () => {
    mockSearchParams = new URLSearchParams('brand=nike&page=3');
    render(<SortSelect />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('价格从低到高'));

    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('brand=nike');
    expect(url).toContain('sortBy=price_asc');
    expect(url).toContain('page=1'); // page 重置为 1
  });
});
