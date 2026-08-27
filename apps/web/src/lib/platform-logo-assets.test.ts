import { statSync } from "node:fs";
import { join } from "node:path";
import { AGENT_PLATFORMS } from "./agent-platforms";
import {
  getOfficialPlatformLogo,
  OFFICIAL_PLATFORM_LOGOS,
} from "./platform-logo-assets";

describe("official platform logos", () => {
  it("has a local official logo for every agent in the directory", () => {
    for (const platform of AGENT_PLATFORMS) {
      const logo = getOfficialPlatformLogo(platform.key);

      expect(logo?.src).toMatch(
        /^\/(?:images\/agents|tenants\/[^/]+)\/[^?#]+\.(?:ico|png|svg)$/,
      );
      expect(logo?.remoteSrc).toMatch(/^https:\/\//);

      const publicAssetPath = join(
        process.cwd(),
        "public",
        logo!.src.replace(/^\//, ""),
      );
      expect(statSync(publicAssetPath).size).toBeGreaterThan(0);
    }
  });

  it("normalizes platform keys", () => {
    expect(getOfficialPlatformLogo("  ESGOBUY ")).toEqual(
      OFFICIAL_PLATFORM_LOGOS.esgobuy,
    );
  });
});
