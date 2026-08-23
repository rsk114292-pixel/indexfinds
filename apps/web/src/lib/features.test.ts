describe("public feature flags", () => {
  const originalValue = process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED;
  const originalRegistrationValue =
    process.env.NEXT_PUBLIC_REGISTRATION_ENABLED;

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

  it("returns 404 eligibility for every hidden public auth route", async () => {
    const { isDisabledPublicAuthPath } = await import("./features");

    for (const path of [
      "/en/login",
      "/en/register",
      "/en/forgot-password",
      "/en/reset-password",
      "/en/verify-email",
    ]) {
      expect(
        isDisabledPublicAuthPath(path, {
          authEnabled: false,
          registrationEnabled: false,
        }),
      ).toBe(true);
    }
    expect(isDisabledPublicAuthPath("/en/products")).toBe(false);
  });

  it("keeps registration independent from the sign-in flag", async () => {
    const { isDisabledPublicAuthPath } = await import("./features");

    expect(
      isDisabledPublicAuthPath("/en/login", {
        authEnabled: true,
        registrationEnabled: false,
      }),
    ).toBe(false);
    expect(
      isDisabledPublicAuthPath("/en/register", {
        authEnabled: true,
        registrationEnabled: false,
      }),
    ).toBe(true);
  });
});
