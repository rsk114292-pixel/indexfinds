/**
 * MobileSortSheet 验证测试
 * - 只渲染传入的 options，不含硬编码选项
 * - 当前选中项高亮
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      label: 'Sort products',
      popular: 'Recommended',
      newest: 'Newest',
      priceAsc: 'Price: Low to High',
      priceDesc: 'Price: High to Low',
      relevance: 'Relevance',
    };
    return map[key] || key;
  },
}));

// Mock framer-motion to avoid animation complexity in tests
jest.mock('framer-motion', () => {
  const filterMotionProps = (
    props: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
  ) => {
    const domProps = { ...props };
    delete domProps.animate;
    delete domProps.exit;
    delete domProps.initial;
    delete domProps.transition;
    delete domProps.drag;
    delete domProps.dragConstraints;
    delete domProps.dragElastic;
    delete domProps.onDragEnd;
    delete domProps.whileTap;
    delete domProps.whileHover;

    return domProps;
  };

  // eslint-disable-next-line react/display-name
  const MotionDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
      <div ref={ref} {...filterMotionProps(props)}>
        {children}
      </div>
    ),
  );
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: { div: MotionDiv },
  };
});

// Mock useBodyScrollLock
jest.mock('@/hooks/useBodyScrollLock', () => ({
  useBodyScrollLock: () => {},
}));

import { MobileSortSheet } from './MobileSortSheet';

const FOUR_OPTIONS = [
  { value: 'popular', tKey: 'popular' },
  { value: 'newest', tKey: 'newest' },
  { value: 'price_asc', tKey: 'priceAsc' },
  { value: 'price_desc', tKey: 'priceDesc' },
] as const;

describe('MobileSortSheet', () => {
  it('只渲染传入的 4 个选项，不含 relevance', () => {
    render(
      <MobileSortSheet
        open={true}
        onClose={() => {}}
        currentSort="popular"
        onSortChange={() => {}}
        options={FOUR_OPTIONS}
      />,
    );

    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('Newest')).toBeInTheDocument();
    expect(screen.getByText('Price: Low to High')).toBeInTheDocument();
    expect(screen.getByText('Price: High to Low')).toBeInTheDocument();
    expect(screen.queryByText('Relevance')).not.toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
  });

  it('当前选中项有 aria-selected=true', () => {
    render(
      <MobileSortSheet
        open={true}
        onClose={() => {}}
        currentSort="newest"
        onSortChange={() => {}}
        options={FOUR_OPTIONS}
      />,
    );

    const options = screen.getAllByRole('option');
    const newestOption = options.find((o) => o.textContent?.includes('Newest'));
    expect(newestOption).toHaveAttribute('aria-selected', 'true');

    const popularOption = options.find((o) => o.textContent?.includes('Recommended'));
    expect(popularOption).toHaveAttribute('aria-selected', 'false');
  });

  it('点击选项触发 onSortChange 并关闭', () => {
    const onSortChange = jest.fn();
    const onClose = jest.fn();

    render(
      <MobileSortSheet
        open={true}
        onClose={onClose}
        currentSort="popular"
        onSortChange={onSortChange}
        options={FOUR_OPTIONS}
      />,
    );

    fireEvent.click(screen.getByText('Newest'));
    expect(onSortChange).toHaveBeenCalledWith('newest');
    expect(onClose).toHaveBeenCalled();
  });
});
