describe("public feature flags", () => {
  const originalValue = process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED;

  afterEach(() => {
    jest.resetModules();
    if (originalValue === undefined) {
      delete process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED = originalValue;
    }
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
});
