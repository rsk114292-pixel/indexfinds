import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryFilter } from './CategoryFilter';
import type { CategoryFacetItem } from './types';

jest.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

const mockCategories: CategoryFacetItem[] = [
  {
    id: '1',
    name: 'Shoes',
    slug: 'shoes',
    level: 0,
    count: 30,
    children: [
      { id: '1a', name: 'Sneakers', slug: 'sneakers', level: 1, count: 20 },
      { id: '1b', name: 'Boots', slug: 'boots', level: 1, count: 10 },
    ],
  },
  {
    id: '2',
    name: 'Clothing',
    slug: 'clothing',
    level: 0,
    count: 15,
  },
];

describe('CategoryFilter', () => {
  it('渲染顶级分类名称和数量', () => {
    render(
      <CategoryFilter
        categories={mockCategories}
        selectedValues={[]}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByText('Shoes')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Clothing')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('子分类默认收起，点击展开后可见', () => {
    render(
      <CategoryFilter
        categories={mockCategories}
        selectedValues={[]}
        onChange={jest.fn()}
      />,
    );
    // 默认不可见
    expect(screen.queryByText('Sneakers')).not.toBeInTheDocument();
    expect(screen.queryByText('Boots')).not.toBeInTheDocument();

    // 点击展开箭头
    const expandBtn = screen.getByText('Shoes').closest('div')!.querySelector('button')!;
    fireEvent.click(expandBtn);

    expect(screen.getByText('Sneakers')).toBeInTheDocument();
    expect(screen.getByText('Boots')).toBeInTheDocument();
  });

  it('勾选分类时调用 onChange 并传入 slug', () => {
    const onChange = jest.fn();
    render(
      <CategoryFilter
        categories={mockCategories}
        selectedValues={[]}
        onChange={onChange}
      />,
    );

    const checkbox = screen.getByText('Clothing')
      .closest('label')!
      .querySelector('input')!;
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(['clothing']);
  });

  it('取消勾选父分类时同时移除子分类', () => {
    const onChange = jest.fn();
    render(
      <CategoryFilter
        categories={mockCategories}
        selectedValues={['shoes', 'sneakers']}
        onChange={onChange}
      />,
    );

    // 取消勾选 Shoes（父）
    const checkbox = screen.getByText('Shoes')
      .closest('label')!
      .querySelector('input')!;
    fireEvent.click(checkbox);

    // 应该移除 shoes 和它的子分类 sneakers、boots
    const result = onChange.mock.calls[0][0];
    expect(result).not.toContain('shoes');
    expect(result).not.toContain('sneakers');
  });

  it('勾选子分类时自动取消父分类（选子去父）', () => {
    const onChange = jest.fn();
    render(
      <CategoryFilter
        categories={mockCategories}
        selectedValues={['shoes']}
        onChange={onChange}
      />,
    );

    // 展开 Shoes 子分类
    const expandBtn = screen.getByText('Shoes').closest('div')!.querySelector('button')!;
    fireEvent.click(expandBtn);

    // 勾选 Sneakers（子）
    const checkbox = screen.getByText('Sneakers')
      .closest('label')!
      .querySelector('input')!;
    fireEvent.click(checkbox);

    const result = onChange.mock.calls[0][0];
    expect(result).toContain('sneakers');
    expect(result).not.toContain('shoes'); // 父应被移除
  });

  it('选中父分类时移除已选的子分类（选父去子）', () => {
    const onChange = jest.fn();
    render(
      <CategoryFilter
        categories={mockCategories}
        selectedValues={['sneakers']}
        onChange={onChange}
      />,
    );

    // 勾选 Shoes（父）
    const checkbox = screen.getByText('Shoes')
      .closest('label')!
      .querySelector('input')!;
    fireEvent.click(checkbox);

    const result = onChange.mock.calls[0][0];
    expect(result).toContain('shoes');
    expect(result).not.toContain('sneakers'); // 子应被移除
  });

  it('categories 为空时不渲染内容', () => {
    const { container } = render(
      <CategoryFilter
        categories={[]}
        selectedValues={[]}
        onChange={jest.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('超过 5 个大分类时显示"更多"按钮', () => {
    const manyCategories: CategoryFacetItem[] = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      name: `Cat${i}`,
      slug: `cat${i}`,
      level: 0,
      count: 10 - i,
    }));
    render(
      <CategoryFilter categories={manyCategories} selectedValues={[]} onChange={jest.fn()} />,
    );
    // 前 5 个可见
    expect(screen.getByText('Cat0')).toBeInTheDocument();
    expect(screen.getByText('Cat4')).toBeInTheDocument();
    // 第 6 个不可见
    expect(screen.queryByText('Cat5')).not.toBeInTheDocument();
    // 有展开按钮
    expect(screen.getByText('+ 3 more')).toBeInTheDocument();

    // 点击展开
    fireEvent.click(screen.getByText('+ 3 more'));
    expect(screen.getByText('Cat7')).toBeInTheDocument();
  });

  it('支持 translations 国际化显示', () => {
    const categoriesWithTranslations: CategoryFacetItem[] = [
      {
        id: '1',
        name: 'Shoes',
        slug: 'shoes',
        level: 0,
        count: 10,
        translations: { en: { name: 'Footwear' } },
      },
    ];
    render(
      <CategoryFilter
        categories={categoriesWithTranslations}
        selectedValues={[]}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByText('Footwear')).toBeInTheDocument();
  });
});
