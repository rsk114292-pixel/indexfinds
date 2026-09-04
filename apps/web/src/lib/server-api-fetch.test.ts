describe("server-api-fetch", () => {
  const originalNextPhase = process.env.NEXT_PHASE;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalInternalApiToken = process.env.INDEXFINDS_INTERNAL_API_TOKEN;
  const originalFetch = global.fetch;

  const jsonResponse = (value: unknown) =>
    ({
      ok: true,
      status: 200,
      json: async () => value,
    }) as Response;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.env.NEXT_PHASE = originalNextPhase;
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    process.env.INDEXFINDS_INTERNAL_API_TOKEN = originalInternalApiToken;
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as unknown as { fetch?: typeof fetch }).fetch;
    }
  });

  it("skips localhost API requests during production build", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4101";
    const { shouldSkipServerApiFetch } = await import("./server-api-fetch");

    expect(shouldSkipServerApiFetch("/products/slugs?limit=200")).toBe(true);
    expect(shouldSkipServerApiFetch("http://localhost:4101/products")).toBe(
      true,
    );
    expect(shouldSkipServerApiFetch("http://127.0.0.1:4000/products")).toBe(
      true,
    );
  });

  it("keeps remote API requests enabled during production build", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    process.env.NEXT_PUBLIC_API_URL = "https://api.lolobuyspreadsheets.com";
    const { shouldSkipServerApiFetch } = await import("./server-api-fetch");

    expect(shouldSkipServerApiFetch("/products/slugs?limit=200")).toBe(false);
    expect(
      shouldSkipServerApiFetch("https://api.lolobuyspreadsheets.com/products"),
    ).toBe(false);
  });

  it("builds tracking headers for server-side fetches", async () => {
    const { buildServerTrackingHeaders } = await import("./server-api-fetch");

    expect(
      buildServerTrackingHeaders({
        trustedVisitorId: "vid_test",
        sessionId: "sess_test",
        visitId: "visit_test",
      }),
    ).toEqual({
      cookie: "mf_vid=vid_test; session_id=sess_test; mf_visit=visit_test",
      "x-visit-id": "visit_test",
    });
  });

  it("authenticates same-API server requests without exposing the token in input", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.lolobuyspreadsheets.com";
    process.env.INDEXFINDS_INTERNAL_API_TOKEN = "internal-test-token";
    const { fetchServerApiJson } = await import("./server-api-fetch");
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
    global.fetch = fetchMock as typeof fetch;

    await fetchServerApiJson("/products?limit=1");

    const requestHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(requestHeaders.get("x-indexfinds-internal-token")).toBe(
      "internal-test-token",
    );
  });

  it("does not send the internal token to a different origin", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.lolobuyspreadsheets.com";
    process.env.INDEXFINDS_INTERNAL_API_TOKEN = "internal-test-token";
    const { fetchServerApiJson } = await import("./server-api-fetch");
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
    global.fetch = fetchMock as typeof fetch;

    await fetchServerApiJson("https://example.com/products");

    const requestHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(requestHeaders.has("x-indexfinds-internal-token")).toBe(false);
  });

  it("does not trust a hostname that only starts with the API URL text", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.lolobuyspreadsheets.com";
    process.env.INDEXFINDS_INTERNAL_API_TOKEN = "internal-test-token";
    const { fetchServerApiJson } = await import("./server-api-fetch");
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
    global.fetch = fetchMock as typeof fetch;

    await fetchServerApiJson(
      "https://api.lolobuyspreadsheets.com.attacker.example/products",
    );

    const requestHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(requestHeaders.has("x-indexfinds-internal-token")).toBe(false);
  });

  it("returns the last successful public response when the API fails", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.lolobuyspreadsheets.com";
    const { fetchServerApiJson, __resetServerApiFallbackCacheForTests } =
      await import("./server-api-fetch");
    __resetServerApiFallbackCacheForTests();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: ["cached-product"] }))
      .mockRejectedValueOnce(new Error("upstream unavailable"));
    global.fetch = fetchMock as typeof fetch;

    await expect(
      fetchServerApiJson<{ data: string[] }>("/products?limit=1"),
    ).resolves.toEqual({ data: ["cached-product"] });
    await expect(
      fetchServerApiJson<{ data: string[] }>("/products?limit=1"),
    ).resolves.toEqual({ data: ["cached-product"] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not share fallback data for requests with visitor headers", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.lolobuyspreadsheets.com";
    const { fetchServerApiJson, __resetServerApiFallbackCacheForTests } =
      await import("./server-api-fetch");
    __resetServerApiFallbackCacheForTests();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: ["private-result"] }))
      .mockRejectedValueOnce(new Error("upstream unavailable"));
    global.fetch = fetchMock as typeof fetch;
    const init = { headers: { "x-visit-id": "visit-1" } };

    await expect(
      fetchServerApiJson<{ data: string[] }>("/products?search=nike", init),
    ).resolves.toEqual({ data: ["private-result"] });
    await expect(
      fetchServerApiJson<{ data: string[] }>("/products?search=nike", init),
    ).resolves.toBeNull();
  });

  it("aborts an upstream request after the configured deadline", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.lolobuyspreadsheets.com";
    const { fetchServerApiJson, __resetServerApiFallbackCacheForTests } =
      await import("./server-api-fetch");
    __resetServerApiFallbackCacheForTests();
    global.fetch = jest.fn().mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason || new Error("aborted")),
            { once: true },
          );
        }),
    ) as typeof fetch;

    const startedAt = Date.now();
    await expect(
      fetchServerApiJson("/slow-endpoint", {
        timeoutMs: 20,
        staleIfErrorMs: 0,
      }),
    ).resolves.toBeNull();
    expect(Date.now() - startedAt).toBeLessThan(500);
  });

  it("retries transient failures and returns the recovered response", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.lolobuyspreadsheets.com";
    const { fetchServerApiJson } = await import("./server-api-fetch");
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce(jsonResponse({ slug: "recovered-product" }));
    global.fetch = fetchMock as typeof fetch;

    await expect(
      fetchServerApiJson("/products/slug/recovered-product", {
        retryCount: 1,
        throwOnError: true,
        staleIfErrorMs: 0,
      }),
    ).resolves.toEqual({ slug: "recovered-product" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null for a genuine missing resource when errors are surfaced", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.lolobuyspreadsheets.com";
    const { fetchServerApiJson } = await import("./server-api-fetch");
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 404,
      } as Response) as typeof fetch;

    await expect(
      fetchServerApiJson("/products/slug/missing", {
        retryCount: 1,
        throwOnError: true,
        staleIfErrorMs: 0,
      }),
    ).resolves.toBeNull();
  });

  it("surfaces a persistent upstream failure instead of reporting missing data", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.lolobuyspreadsheets.com";
    const { fetchServerApiJson } = await import("./server-api-fetch");
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503 } as Response);
    global.fetch = fetchMock as typeof fetch;

    await expect(
      fetchServerApiJson("/products/slug/unavailable", {
        retryCount: 1,
        throwOnError: true,
        staleIfErrorMs: 0,
      }),
    ).rejects.toThrow("Upstream request failed with status 503");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
