describe("public feature flags", () => {
  const originalValue = process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED;
  const originalRegistrationValue =
    process.env.NEXT_PUBLIC_REGISTRATION_ENABLED;
  const originalGoogleAuthValue =
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED;

  afterEach(() => {
    jest.resetModules();
    if (originalValue === undefined) {
      delete process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED = originalValue;
    }
    if (originalRegistrationValue === undefined) {
      delete process.env.NEXT_PUBLIC_REGISTRATION_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_REGISTRATION_ENABLED = originalRegistrationValue;
    }
    if (originalGoogleAuthValue === undefined) {
      delete process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED = originalGoogleAuthValue;
    }
  });

  it("keeps public registration disabled by default", async () => {
    delete process.env.NEXT_PUBLIC_REGISTRATION_ENABLED;

    const { PUBLIC_REGISTRATION_ENABLED } = await import("./features");

    expect(PUBLIC_REGISTRATION_ENABLED).toBe(false);
  });

  it("requires a dedicated build flag to enable public registration", async () => {
    process.env.NEXT_PUBLIC_REGISTRATION_ENABLED = "true";

    const { PUBLIC_REGISTRATION_ENABLED } = await import("./features");

    expect(PUBLIC_REGISTRATION_ENABLED).toBe(true);
  });

  it("hides public authentication entry points by default", async () => {
    delete process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED;

    const { PUBLIC_AUTH_ENTRY_ENABLED } = await import("./features");

    expect(PUBLIC_AUTH_ENTRY_ENABLED).toBe(false);
  });

  it("can restore public authentication entry points with one flag", async () => {
    process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED = "true";

    const { PUBLIC_AUTH_ENTRY_ENABLED } = await import("./features");

    expect(PUBLIC_AUTH_ENTRY_ENABLED).toBe(true);
  });

  it("hides Google authentication when its public flag is absent", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED;

    const { PUBLIC_GOOGLE_AUTH_ENABLED } = await import("./features");

    expect(PUBLIC_GOOGLE_AUTH_ENABLED).toBe(false);
  });

  it("shows Google authentication when explicitly enabled", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED = "true";

    const { PUBLIC_GOOGLE_AUTH_ENABLED } = await import("./features");

    expect(PUBLIC_GOOGLE_AUTH_ENABLED).toBe(true);
  });
});
