import { isAllowedCorsOrigin } from './cors.config';

describe('isAllowedCorsOrigin', () => {
  const productionPolicy = {
    isProduction: true,
    allowedOrigins: ['https://indexfinds.com', 'https://www.indexfinds.com'],
    vercelPreviewProject: 'indexfinds',
    vercelPreviewOwner: 'rsk114292-3255s-projects',
  };

  it('allows server-side requests without an Origin header', () => {
    expect(isAllowedCorsOrigin(undefined, productionPolicy)).toBe(true);
  });

  it('allows exact production origins', () => {
    expect(
      isAllowedCorsOrigin('https://indexfinds.com', productionPolicy),
    ).toBe(true);
  });

  it('allows only previews owned by the configured Vercel project and team', () => {
    expect(
      isAllowedCorsOrigin(
        'https://indexfinds-git-feature-rsk114292-3255s-projects.vercel.app',
        productionPolicy,
      ),
    ).toBe(true);
    expect(
      isAllowedCorsOrigin(
        'https://indexfinds-c16yagv73-rsk114292-3255s-projects.vercel.app',
        productionPolicy,
      ),
    ).toBe(true);
  });

  it('rejects lookalike, insecure, and other-team preview origins', () => {
    expect(
      isAllowedCorsOrigin(
        'https://indexfinds-c16yagv73-attacker-projects.vercel.app',
        productionPolicy,
      ),
    ).toBe(false);
    expect(
      isAllowedCorsOrigin(
        'https://indexfinds-c16yagv73-rsk114292-3255s-projects.vercel.app.evil.test',
        productionPolicy,
      ),
    ).toBe(false);
    expect(
      isAllowedCorsOrigin(
        'http://indexfinds-c16yagv73-rsk114292-3255s-projects.vercel.app',
        productionPolicy,
      ),
    ).toBe(false);
  });

  it('allows localhost only outside production', () => {
    expect(
      isAllowedCorsOrigin('http://localhost:3103', {
        ...productionPolicy,
        isProduction: false,
      }),
    ).toBe(true);
    expect(isAllowedCorsOrigin('http://localhost:3103', productionPolicy)).toBe(
      false,
    );
  });
});
