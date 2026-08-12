import { fireEvent, render, screen } from '@testing-library/react';
import MobileBuyBar from './MobileBuyBar';

let currentPlatform: { key: string; name: string } | undefined;

jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () =>
    (key: string, values?: Record<string, string>) => {
      const messages: Record<string, string> = {
        changeAgent: 'Change agent',
        chooseAgent: 'Choose agent',
        chooseAgentToBuy: 'Choose agent to buy',
      };
      if (key === 'continueTo') return `Continue to ${values?.platform}`;
      return messages[key] ?? key;
    },
}));

jest.mock('@/components/FavoriteButton', () => {
  function MockFavoriteButton() {
    return <button>Favorite</button>;
  }
  return MockFavoriteButton;
});
jest.mock('@/stores/useCurrencyStore', () => ({
  useCurrencyStore: () => ({ currency: 'USD', rates: { CNY: 7 } }),
}));
jest.mock('@/stores/usePlatformStore', () => ({
  useCurrentPlatform: () => currentPlatform,
  getLocalizedPlatformName: (platform: { name: string }) => platform.name,
}));
jest.mock('@/lib/utils', () => ({
  convertPrice: () => 10,
  formatPrice: () => '$10.00',
}));

const baseProps = {
  productId: 'product-1',
  price: 70,
  sourceCurrency: 'CNY',
  onOpenPlatformSelect: jest.fn(),
  onBuyPreferred: jest.fn(),
};

describe('MobileBuyBar', () => {
  beforeEach(() => {
    currentPlatform = undefined;
    jest.clearAllMocks();
  });

  it('opens agent selection when no preferred agent is set', () => {
    render(<MobileBuyBar {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose agent to buy' }));

    expect(baseProps.onOpenPlatformSelect).toHaveBeenCalledTimes(1);
    expect(baseProps.onBuyPreferred).not.toHaveBeenCalled();
  });

  it('continues with the preferred agent and keeps a separate change action', () => {
    currentPlatform = { key: 'superbuy', name: 'Superbuy' };
    render(<MobileBuyBar {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Superbuy' }));
    expect(baseProps.onBuyPreferred).toHaveBeenCalledWith('superbuy');

    fireEvent.click(screen.getByRole('button', { name: 'Change agent' }));
    expect(baseProps.onOpenPlatformSelect).toHaveBeenCalledTimes(1);
  });
});
