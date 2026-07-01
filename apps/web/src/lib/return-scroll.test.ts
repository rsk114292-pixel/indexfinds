/**
 * @jest-environment jsdom
 */

import { restoreReturnScroll, saveReturnScroll } from './return-scroll';

describe('return-scroll helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    window.scrollTo = jest.fn();
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(performance.now()), 0)) as typeof window.requestAnimationFrame;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('saves and restores scroll position for a return url', () => {
    saveReturnScroll('/products?page=417', 1800);

    expect(restoreReturnScroll('/products?page=417')).toBe(true);

    jest.runAllTimers();

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 1800, behavior: 'auto' });
    expect(sessionStorage.getItem('return-scroll:/products?page=417')).toBeNull();
  });

  it('returns false when no saved scroll exists', () => {
    expect(restoreReturnScroll('/products?page=1')).toBe(false);
  });
});
