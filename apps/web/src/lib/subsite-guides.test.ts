import { AGENT_PLATFORMS } from "./agent-platforms";
import {
  SUBSITE_GUIDES,
  getSubsiteGuideByDomain,
  getSubsiteGuidesForAgent,
  resolveSubsiteAgentKey,
} from "./subsite-guides";

describe("subsite guide registry", () => {
  it("contains the 41 in-scope subsites and excludes independent projects", () => {
    expect(SUBSITE_GUIDES).toHaveLength(41);
    expect(
      SUBSITE_GUIDES.some((guide) => guide.domain === "xiangshoe.net"),
    ).toBe(false);
  });

  it("uses unique domains and only configured agent keys", () => {
    expect(new Set(SUBSITE_GUIDES.map((guide) => guide.domain)).size).toBe(41);

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
