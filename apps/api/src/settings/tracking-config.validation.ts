import { BadRequestException } from '@nestjs/common';

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
const GTM_CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

export function validateTrackingSettingValue(
  key: string,
  rawValue: string,
): string {
  if (key !== 'tracking_ga_id' && key !== 'tracking_gtm_id') {
    return rawValue;
  }

  const value = rawValue.trim();

  if (!value) {
    return value;
  }

  if (key === 'tracking_ga_id' && !GA_MEASUREMENT_ID_PATTERN.test(value)) {
    throw new BadRequestException(
      'tracking_ga_id: must be a GA4 Measurement ID like G-XXXXXXXXXX, not a full script snippet',
    );
  }

  if (key === 'tracking_gtm_id' && !GTM_CONTAINER_ID_PATTERN.test(value)) {
    throw new BadRequestException(
      'tracking_gtm_id: must be a GTM container ID like GTM-XXXXXXX',
    );
  }

  return value;
}
