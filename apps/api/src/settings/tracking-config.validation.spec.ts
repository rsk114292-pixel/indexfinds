import { BadRequestException } from '@nestjs/common';
import { validateTrackingSettingValue } from './tracking-config.validation';

describe('validateTrackingSettingValue', () => {
  it('trims and accepts a valid GA4 ID', () => {
    expect(
      validateTrackingSettingValue('tracking_ga_id', '  G-ABC123456  '),
    ).toBe('G-ABC123456');
  });

  it('rejects a pasted GA script snippet', () => {
    expect(() =>
      validateTrackingSettingValue(
        'tracking_ga_id',
        '<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123456"></script>',
      ),
    ).toThrow(BadRequestException);
  });

  it('accepts a valid GTM container ID', () => {
    expect(validateTrackingSettingValue('tracking_gtm_id', 'GTM-ABC1234')).toBe(
      'GTM-ABC1234',
    );
  });

  it('rejects an invalid GTM container ID', () => {
    expect(() =>
      validateTrackingSettingValue('tracking_gtm_id', 'G-ABC123456'),
    ).toThrow(BadRequestException);
  });

  it('leaves unrelated settings untouched', () => {
    expect(
      validateTrackingSettingValue('site_name', 'LoloBuySpreadsheets'),
    ).toBe('LoloBuySpreadsheets');
  });
});
