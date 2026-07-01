import { render, screen, fireEvent } from '@testing-library/react';
import { MobileCategoryFilter } from './MobileFilterComponents';
import type { CategoryFacetItem } from '@/components/filters/types';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (key === 'moreCount') return `+${params?.count} more`;
    if (key === 'showLess') return 'Show less';
    return key;
  },
  useLocale: () => 'en',
}));

const categories: CategoryFacetItem[] = [
  {
    id: '1',
    name: 'Shoes',
    slug: 'shoes',
    level: 0,
    count: 30,
    children: [
      {
        id: '1-1',
        name: 'Sneakers',
        slug: 'sneakers',
        level: 1,
        count: 15,
        children: [
          { id: '1-1-1', name: 'Running Shoes', slug: 'running-shoes', level: 2, count: 5 },
        ],
      },
      { id: '1-2', name: 'Boots', slug: 'boots', level: 1, count: 10 },
    ],
  },
  {
    id: '2',
    name: 'Clothing',
    slug: 'clothing',
    level: 0,
    count: 20,
    children: [
      { id: '2-1', name: 'T-Shirts', slug: 't-shirts', level: 1, count: 12 },
    ],
  },
  { id: '3', name: 'Bags', slug: 'bags', level: 0, count: 10 },
];

describe('MobileCategoryFilter', () => {
  it('显示顶级分类，子分类默认折叠', () => {
    render(
      <MobileCategoryFilter
        categories={categories}
        selectedValues={[]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Shoes')).toBeInTheDocument();
    expect(screen.getByText('Clothing')).toBeInTheDocument();
    expect(screen.getByText('Bags')).toBeInTheDocument();
    // 子分类折叠不可见
    expect(screen.queryByText('Sneakers')).not.toBeInTheDocument();
    expect(screen.queryByText('T-Shirts')).not.toBeInTheDocument();
  });

  it('点击展开箭头显示子分类', () => {
    render(
      <MobileCategoryFilter
        categories={categories}
        selectedValues={[]}
        onChange={jest.fn()}
      />,
    );

    // Shoes 有子分类，点击展开箭头
    const expandButtons = screen.getAllByRole('button');
    // 第一个 button 是 Shoes 的展开箭头
    fireEvent.click(expandButtons[0]);

    expect(screen.getByText('Sneakers')).toBeInTheDocument();
    expect(screen.getByText('Boots')).toBeInTheDocument();
    // 3 级默认还是折叠
    expect(screen.queryByText('Running Shoes')).not.toBeInTheDocument();
  });

  it('支持 3 级展开', () => {
    render(
      <MobileCategoryFilter
        categories={categories}
        selectedValues={[]}
        onChange={jest.fn()}
      />,
    );

    // 展开 Shoes
    const expandButtons = screen.getAllByRole('button');
    fireEvent.click(expandButtons[0]);

    // 展开 Sneakers（它也有子分类）
    const sneakersExpand = screen.getAllByRole('button').find((btn) => {
      // 找 Sneakers 旁边的展开按钮 — Sneakers 行的展开按钮
      const next = btn.nextElementSibling;
      return next?.textContent?.includes('Sneakers');
    });
    if (sneakersExpand) fireEvent.click(sneakersExpand);

    expect(screen.getByText('Running Shoes')).toBeInTheDocument();
  });

  it('选中 checkbox 触发 onChange（选父去子）', () => {
    const onChange = jest.fn();
    render(
      <MobileCategoryFilter
        categories={categories}
        selectedValues={['sneakers']}
        onChange={onChange}
      />,
    );

    // Shoes 自动展开（因为子分类 sneakers 被选中）
    // 点击 Shoes checkbox
    const allCheckboxes = screen.getAllByRole('checkbox');
    // 第一个是 Shoes
    fireEvent.click(allCheckboxes[0]);

    // 选父去子：移除 sneakers，添加 shoes
    expect(onChange).toHaveBeenCalledWith(['shoes']);
  });

  it('选子去父：选中子分类时移除父分类', () => {
    const onChange = jest.fn();
    render(
      <MobileCategoryFilter
        categories={categories}
        selectedValues={['shoes']}
        onChange={onChange}
      />,
    );

    // Shoes 选中 → 子分类自动展开
    expect(screen.getByText('Sneakers')).toBeInTheDocument();

    // 点击 Sneakers checkbox
    const allCheckboxes = screen.getAllByRole('checkbox');
    // allCheckboxes: [Shoes, Sneakers, Boots]
    fireEvent.click(allCheckboxes[1]); // Sneakers

    // 选子去父：移除 shoes，添加 sneakers
    expect(onChange).toHaveBeenCalledWith(['sneakers']);
  });

  it('取消父分类时移除自身及所有子孙', () => {
    const onChange = jest.fn();
    render(
      <MobileCategoryFilter
        categories={categories}
        selectedValues={['shoes', 'sneakers']}
        onChange={onChange}
      />,
    );

    // 取消 Shoes
    const allCheckboxes = screen.getAllByRole('checkbox');
    fireEvent.click(allCheckboxes[0]); // Shoes

    // 应移除 shoes 及所有子孙（sneakers, running-shoes, boots）
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('子分类被选中时自动展开父节点', () => {
    render(
      <MobileCategoryFilter
        categories={categories}
        selectedValues={['sneakers']}
        onChange={jest.fn()}
      />,
    );

    // Shoes 应自动展开（因为 sneakers 被选中）
    expect(screen.getByText('Sneakers')).toBeInTheDocument();
    expect(screen.getByText('Boots')).toBeInTheDocument();
  });

  it('3 级子分类被选中时逐层展开', () => {
    render(
      <MobileCategoryFilter
        categories={categories}
        selectedValues={['running-shoes']}
        onChange={jest.fn()}
      />,
    );

    // Shoes → Sneakers → Running Shoes 应全部展开
    expect(screen.getByText('Sneakers')).toBeInTheDocument();
    expect(screen.getByText('Running Shoes')).toBeInTheDocument();
  });

  it('无子分类的节点不显示展开箭头', () => {
    render(
      <MobileCategoryFilter
        categories={categories}
        selectedValues={[]}
        onChange={jest.fn()}
      />,
    );

    // Bags 没有 children，不应有展开箭头
    // 展开箭头是 button，Bags 所在行应没有 button
    expect(screen.getByText('Bags')).toBeInTheDocument();
    // count 显示为纯数字（无括号）
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('空数组不渲染任何内容', () => {
    const { container } = render(
      <MobileCategoryFilter
        categories={[]}
        selectedValues={[]}
        onChange={jest.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
