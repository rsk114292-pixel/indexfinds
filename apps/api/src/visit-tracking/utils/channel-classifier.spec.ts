import { ChannelType } from '../enums/channel-type.enum';
import { classifyChannel } from './channel-classifier';

describe('channel-classifier', () => {
  const originalOwnedDomains = process.env.TRAFFIC_OWNED_DOMAINS;

  afterEach(() => {
    if (originalOwnedDomains === undefined) {
      delete process.env.TRAFFIC_OWNED_DOMAINS;
    } else {
      process.env.TRAFFIC_OWNED_DOMAINS = originalOwnedDomains;
    }
  });

  it('treats lolobuyspreadsheets.com as normal referral traffic by default', () => {
    expect(
      classifyChannel({
        referrerDomain: 'lolobuyspreadsheets.com',
      }),
    ).toBe(ChannelType.REFERRAL);
  });

  it('classifies internal domains separately', () => {
    expect(
      classifyChannel({
        referrerDomain: 'lolobuyspreadsheets.com',
      }),
    ).toBe(ChannelType.INTERNAL);
  });

  it('classifies configured owned domains separately', () => {
    process.env.TRAFFIC_OWNED_DOMAINS = 'owned-example.com';

    expect(
      classifyChannel({
        referrerDomain: 'owned-example.com',
      }),
    ).toBe(ChannelType.OWNED_REFERRAL);
  });

  it('keeps search engine traffic as organic search', () => {
    expect(
      classifyChannel({
        referrerDomain: 'google.com',
      }),
    ).toBe(ChannelType.ORGANIC_SEARCH);
  });

  it('keeps external source with referral medium as referral traffic', () => {
    expect(
      classifyChannel({
        utmSource: 'lolobuyspreadsheets.com',
        utmMedium: 'referral',
      }),
    ).toBe(ChannelType.REFERRAL);
  });
});
