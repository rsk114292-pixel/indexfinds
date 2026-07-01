import { render, screen, fireEvent } from '@testing-library/react';
import { PriceRangeFilter } from './PriceRangeFilter';

// Mock useCurrencyStore — 默认 USD，汇率 0.14
let mockCurrency = 'USD';
const mockRates = { CNY: 1, USD: 0.14, EUR: 0.13, GBP: 0.11 };

jest.mock('@/stores/useCurrencyStore', () => ({
  useCurrencyStore: () => ({ currency: mockCurrency, rates: mockRates }),
}));

describe('PriceRangeFilter', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockClear();
    mockCurrency = 'USD';
  });

  it('USD 时显示 $ 符号而非 ¥', () => {
    render(<PriceRangeFilter min={0} max={1000} value={[0, 1000]} onChange={onChange} />);
    const symbols = screen.getAllByText('$');
    expect(symbols.length).toBe(2);
    expect(screen.queryByText('¥')).not.toBeInTheDocument();
  });

  it('CNY 时显示 ¥ 符号', () => {
    mockCurrency = 'CNY';
    render(<PriceRangeFilter min={0} max={1000} value={[0, 1000]} onChange={onChange} />);
    const symbols = screen.getAllByText('¥');
    expect(symbols.length).toBe(2);
  });

  it('EUR 时显示 € 符号', () => {
    mockCurrency = 'EUR';
    render(<PriceRangeFilter min={0} max={1000} value={[0, 1000]} onChange={onChange} />);
    const symbols = screen.getAllByText('€');
    expect(symbols.length).toBe(2);
  });

  it('输入框显示转换后的价格（CNY 1000 → USD 140）', () => {
    render(<PriceRangeFilter min={0} max={1000} value={[100, 500]} onChange={onChange} />);
    const maxInput = screen.getByLabelText('Maximum price input');
    // CNY 500 * 0.14 = 70
    expect(maxInput).toHaveValue(70);
  });

  it('修改最小值输入框回传 CNY 值给 onChange', () => {
    render(<PriceRangeFilter min={0} max={1000} value={[100, 500]} onChange={onChange} />);
    const minInput = screen.getByLabelText('Minimum price input');

    // 用户输入 USD 28 → 反算 CNY = 28 / 0.14 = 200
    fireEvent.change(minInput, { target: { value: '28' } });
    expect(onChange).toHaveBeenCalledWith([200, 500]);
  });

  it('修改最大值输入框回传 CNY 值给 onChange', () => {
    render(<PriceRangeFilter min={0} max={1000} value={[100, 500]} onChange={onChange} />);
    const maxInput = screen.getByLabelText('Maximum price input');

    // 用户输入 USD 56 → 反算 CNY = 56 / 0.14 = 400
    fireEvent.change(maxInput, { target: { value: '56' } });
    expect(onChange).toHaveBeenCalledWith([100, 400]);
  });

  it('拖动滑块回传 CNY 值给 onChange', () => {
    render(<PriceRangeFilter min={0} max={1000} value={[0, 1000]} onChange={onChange} />);
    const minSlider = screen.getByLabelText('Minimum price');

    // 用户拖到 USD 42 → CNY = 42 / 0.14 = 300
    fireEvent.change(minSlider, { target: { value: '42' } });
    expect(onChange).toHaveBeenCalled();
    const [cnyMin] = onChange.mock.calls[0][0];
    expect(cnyMin).toBe(300);
  });

  it('CNY 时输入值直接传递，无转换', () => {
    mockCurrency = 'CNY';
    render(<PriceRangeFilter min={0} max={1000} value={[100, 500]} onChange={onChange} />);
    const minInput = screen.getByLabelText('Minimum price input');
    expect(minInput).toHaveValue(100);

    fireEvent.change(minInput, { target: { value: '200' } });
    expect(onChange).toHaveBeenCalledWith([200, 500]);
  });
});
