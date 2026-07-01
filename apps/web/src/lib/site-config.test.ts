describe('site-config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadModule() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./site-config') as typeof import('./site-config');
  }

  describe('getSiteUrl', () => {
    it('环境变量设置时返回对应值', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://mysite.com';
      const { getSiteUrl } = loadModule();
      expect(getSiteUrl()).toBe('https://mysite.com');
    });

    it('环境变量未设置时返回 fallback', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      const { getSiteUrl } = loadModule();
      expect(getSiteUrl()).toBe('https://example.com');
    });
  });

  describe('getSiteName', () => {
    it('SITE_NAME 优先于 APP_NAME', () => {
      process.env.NEXT_PUBLIC_SITE_NAME = 'NewSite';
      process.env.NEXT_PUBLIC_APP_NAME = 'OldSite';
      const { getSiteName } = loadModule();
      expect(getSiteName()).toBe('NewSite');
    });

    it('SITE_NAME 未设置时回退到 APP_NAME', () => {
      delete process.env.NEXT_PUBLIC_SITE_NAME;
      process.env.NEXT_PUBLIC_APP_NAME = 'OldSite';
      const { getSiteName } = loadModule();
      expect(getSiteName()).toBe('OldSite');
    });

    it('都未设置时返回默认值', () => {
      delete process.env.NEXT_PUBLIC_SITE_NAME;
      delete process.env.NEXT_PUBLIC_APP_NAME;
      const { getSiteName } = loadModule();
      expect(getSiteName()).toBe('MySite');
    });
  });

  describe('getContactEmail', () => {
    it('返回环境变量值', () => {
      process.env.NEXT_PUBLIC_CONTACT_EMAIL = 'help@test.com';
      const { getContactEmail } = loadModule();
      expect(getContactEmail()).toBe('help@test.com');
    });

    it('未设置时返回 fallback', () => {
      delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
      const { getContactEmail } = loadModule();
      expect(getContactEmail()).toBe('support@example.com');
    });
  });

  describe('getPrivacyEmail', () => {
    it('返回环境变量值', () => {
      process.env.NEXT_PUBLIC_PRIVACY_EMAIL = 'priv@test.com';
      const { getPrivacyEmail } = loadModule();
      expect(getPrivacyEmail()).toBe('priv@test.com');
    });
  });

  describe('getLegalEmail', () => {
    it('返回环境变量值', () => {
      process.env.NEXT_PUBLIC_LEGAL_EMAIL = 'law@test.com';
      const { getLegalEmail } = loadModule();
      expect(getLegalEmail()).toBe('law@test.com');
    });
  });

  describe('getThemeVars', () => {
    it('仅返回非空的 CSS 变量', () => {
      process.env.NEXT_PUBLIC_PRIMARY_COLOR = '#FF0000';
      process.env.NEXT_PUBLIC_PRIMARY_HOVER = '';
      delete process.env.NEXT_PUBLIC_SECONDARY_COLOR;
      const { getThemeVars } = loadModule();
      const vars = getThemeVars();

      expect(vars['--color-primary']).toBe('#FF0000');
      expect(vars).not.toHaveProperty('--color-primary-hover');
      expect(vars).not.toHaveProperty('--color-secondary');
    });

    it('所有变量为空时返回空对象', () => {
      delete process.env.NEXT_PUBLIC_PRIMARY_COLOR;
      delete process.env.NEXT_PUBLIC_PRIMARY_HOVER;
      delete process.env.NEXT_PUBLIC_SECONDARY_COLOR;
      delete process.env.NEXT_PUBLIC_ACCENT_COLOR;
      delete process.env.NEXT_PUBLIC_BG_COLOR;
      const { getThemeVars } = loadModule();
      expect(getThemeVars()).toEqual({});
    });
  });

  describe('getPrimaryColor', () => {
    it('返回环境变量值', () => {
      process.env.NEXT_PUBLIC_PRIMARY_COLOR = '#00FF00';
      const { getPrimaryColor } = loadModule();
      expect(getPrimaryColor()).toBe('#00FF00');
    });

    it('未设置时返回默认珊瑚橙', () => {
      delete process.env.NEXT_PUBLIC_PRIMARY_COLOR;
      const { getPrimaryColor } = loadModule();
      expect(getPrimaryColor()).toBe('#FF6B47');
    });
  });
});
