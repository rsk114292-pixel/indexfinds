import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { SeoIndexReviewPanel } from './SeoIndexReviewPanel';

const mockPost = jest.fn();

jest.mock('@/lib/api', () => ({
  post: (...args: unknown[]) => mockPost(...args),
}));

describe('SeoIndexReviewPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({});
  });

  it('requires the three confirmations and review note before approval', async () => {
    const onReviewed = jest.fn();

    render(
      <AntdApp>
        <SeoIndexReviewPanel
          product={{
            id: 'product-1',
            status: 'active',
            seoIndexable: false,
          }}
          onReviewed={onReviewed}
        />
      </AntdApp>,
    );

    const approveButton = screen.getByRole('button', {
      name: '通过审核并允许 Google 收录',
    });
    expect(approveButton).toBeDisabled();

    fireEvent.click(
      screen.getByRole('checkbox', { name: /标题、描述、价格/ }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: /排除重复商品/ }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: /独有信息或判断价值/ }),
    );
    fireEvent.change(
      screen.getByPlaceholderText(/填写本页的独有价值/),
      { target: { value: '已验证来源，并补充了独有的规格对比和选购判断。' } },
    );

    expect(approveButton).toBeEnabled();
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/products/product-1/seo-index', {
        indexable: true,
        verified: true,
        deduplicated: true,
        uniqueValue: true,
        reviewNote: '已验证来源，并补充了独有的规格对比和选购判断。',
      });
    });
    expect(onReviewed).toHaveBeenCalledWith(true);
  });
});
