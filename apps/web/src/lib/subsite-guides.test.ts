import { AGENT_PLATFORMS } from "./agent-platforms";
import {
  SUBSITE_GUIDES,
  getSubsiteGuideByDomain,
  getSubsiteGuidesForAgent,
  resolveSubsiteAgentKey,
} from "./subsite-guides";

describe("subsite guide registry", () => {
  it("contains the 58 active subsites and excludes independent projects", () => {
    expect(SUBSITE_GUIDES).toHaveLength(58);
    expect(
      SUBSITE_GUIDES.some((guide) => guide.domain === "xiangshoe.net"),
    ).toBe(false);
    expect(
      SUBSITE_GUIDES.some((guide) => guide.domain === "1to1reps.com"),
    ).toBe(true);
  });

  it("uses unique domains and only configured agent keys", () => {
    expect(new Set(SUBSITE_GUIDES.map((guide) => guide.domain)).size).toBe(58);

    const configuredKeys = new Set(AGENT_PLATFORMS.map((agent) => agent.key));
    const missingKeys = SUBSITE_GUIDES.flatMap((guide) =>
      guide.agentKey && !configuredKeys.has(guide.agentKey)
        ? [guide.agentKey]
        : [],
    );
    expect(missingKeys).toEqual([]);
  });

  it("maps direct-product guide sites back to their agent", () => {
    expect(
      getSubsiteGuideByDomain("https://www.cssbuyitems.com/a/b")?.agentKey,
    ).toBe("cssbuy");
    expect(
      getSubsiteGuidesForAgent("litbuy").map((guide) => guide.domain),
    ).toEqual(
      expect.arrayContaining([
        "litbuyindex.com",
        "litbuyitems.com",
        "litbuyproducts.com",
      ]),
    );
  });

  it("supports one shared local preview server for every tenant", () => {
    expect(
      getSubsiteGuideByDomain("http://fishgooindex.com.localhost:3103/en")
        ?.domain,
    ).toBe("fishgooindex.com");
    expect(
      getSubsiteGuideByDomain("goatedbuyindex.com.localhost:3103")?.agentKey,
    ).toBe("goatedbuy");
  });

  it("prioritizes explicit agent and falls back to source or referrer", () => {
    expect(
      resolveSubsiteAgentKey({
        explicitAgent: "KAKOBUY",
        utmSource: "cssbuyitems.com",
      }),
    ).toBe("kakobuy");
    expect(resolveSubsiteAgentKey({ utmSource: "bbdbuyeusheet.com" })).toBe(
      "bbdbuy",
    );
    expect(
      resolveSubsiteAgentKey({ referrer: "https://orientdigindex.com/page" }),
    ).toBe("orientdig");
    expect(
      resolveSubsiteAgentKey({ referrer: "https://xiangshoe.net" }),
    ).toBeNull();
  });
});
