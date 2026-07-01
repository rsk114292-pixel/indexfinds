import { ProductEventListener } from './product-event.listener';

describe('ProductEventListener', () => {
  let listener: ProductEventListener;
  let productsService: { incrementSalesCount: jest.Mock };
  let productImportService: Record<string, never>;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    productsService = {
      incrementSalesCount: jest.fn().mockResolvedValue(undefined),
    };
    productImportService = {};
    eventEmitter = { emit: jest.fn() };

    listener = new ProductEventListener(
      productImportService as any,
      productsService as any,
      eventEmitter as any,
    );
  });

  describe('handleOutboundClickForSales', () => {
    it('外跳点击事件触发 salesCount 递增', async () => {
      await listener.handleOutboundClickForSales({ productId: 'prod-123' });

      expect(productsService.incrementSalesCount).toHaveBeenCalledWith(
        'prod-123',
      );
    });

    it('递增失败时不抛异常（静默日志）', async () => {
      productsService.incrementSalesCount.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        listener.handleOutboundClickForSales({ productId: 'prod-123' }),
      ).resolves.not.toThrow();
    });
  });
});
