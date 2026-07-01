import { isLikelyBotUserAgent } from './traffic-bot';

describe('traffic-bot', () => {
  it('detects preview bots and crawlers', () => {
    expect(
      isLikelyBotUserAgent(
        'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      ),
    ).toBe(true);
    expect(isLikelyBotUserAgent('Twitterbot/1.0')).toBe(true);
    expect(
      isLikelyBotUserAgent(
        'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      ),
    ).toBe(true);
  });

  it('keeps a normal browser as real traffic', () => {
    expect(
      isLikelyBotUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
  });
});
