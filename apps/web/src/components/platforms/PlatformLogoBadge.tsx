"use client";

import { useEffect, useState } from "react";
import { getOfficialPlatformLogo } from "@/lib/platform-logo-assets";
import { cn } from "@/lib/utils";

const PLATFORM_BADGE_STYLES: Record<
  string,
  { background: string; text: string; label?: string }
> = {
  loongbuy: {
    background: "linear-gradient(135deg, #ff8a38, #ff5f2e)",
    text: "#ffffff",
    label: "L",
  },
  lovegobuy: {
    background: "linear-gradient(135deg, #7bcf52, #4aa838)",
    text: "#ffffff",
    label: "LG",
  },
  kakobuy: {
    background: "linear-gradient(135deg, #ff4d5a, #ff2240)",
    text: "#ffffff",
    label: "K",
  },
  usfans: {
    background: "linear-gradient(135deg, #ffffff, #f4f6fb)",
    text: "#f05a28",
    label: "US",
  },
  oopbuy: {
    background: "linear-gradient(135deg, #3d7cff, #245cff)",
    text: "#ffffff",
    label: "O",
  },
  allchinabuy: {
    background: "linear-gradient(135deg, #30c7d2, #19a8b7)",
    text: "#ffffff",
    label: "AC",
  },
  joyagoo: {
    background: "linear-gradient(135deg, #f5f5f5, #dddddd)",
    text: "#444444",
    label: "J",
  },
  orientdig: {
    background: "linear-gradient(135deg, #2a2d34, #111319)",
    text: "#ffffff",
    label: "OD",
  },
  superbuy: {
    background: "linear-gradient(135deg, #ff5f4d, #e4372b)",
    text: "#ffffff",
    label: "S",
  },
  sugargoo: {
    background: "linear-gradient(135deg, #ffd85a, #ffab1f)",
    text: "#7a3200",
    label: "SG",
  },
  acbuy: {
    background: "linear-gradient(135deg, #f4f8f7, #e8efed)",
    text: "#1db89a",
    label: "B",
  },
  litbuy: {
    background: "linear-gradient(135deg, #444a57, #222733)",
    text: "#ffffff",
    label: "L",
  },
  rizzitgo: {
    background: "linear-gradient(135deg, #151515, #343434)",
    text: "#ffffff",
    label: "R",
  },
  hipobuy: {
    background: "linear-gradient(135deg, #ff7a59, #ff4f78)",
    text: "#ffffff",
    label: "H",
  },
  boonbuy: {
    background: "linear-gradient(135deg, #7559e8, #5236c9)",
    text: "#ffffff",
    label: "B",
  },
  cssbuy: {
    background: "linear-gradient(135deg, #2b80ff, #1457c8)",
    text: "#ffffff",
    label: "CSS",
  },
  pikobuy: {
    background: "linear-gradient(135deg, #ff9f43, #f36b21)",
    text: "#ffffff",
    label: "P",
  },
  esgobuy: {
    background: "linear-gradient(135deg, #18a999, #0b7f75)",
    text: "#ffffff",
    label: "ES",
  },
  hubbuycn: {
    background: "linear-gradient(135deg, #ef3340, #bd1420)",
    text: "#ffffff",
    label: "HC",
  },
  fishgoo: {
    background: "linear-gradient(135deg, #35bde8, #167ac6)",
    text: "#ffffff",
    label: "F",
  },
  mycnbox: {
    background: "linear-gradient(135deg, #ffcf4a, #f49b18)",
    text: "#5d3900",
    label: "MC",
  },
  ootdbuy: {
    background: "linear-gradient(135deg, #7b61ff, #4330c8)",
    text: "#ffffff",
    label: "OO",
  },
  fansbuy: {
    background: "linear-gradient(135deg, #eb4d86, #b52c64)",
    text: "#ffffff",
    label: "F",
  },
  lolobuy: {
    background: "linear-gradient(135deg, #ff7b5c, #ff4d34)",
    text: "#ffffff",
    label: "L",
  },
};

function canUseDirectLogo(logoUrl?: string): boolean {
  if (!logoUrl) return false;
  if (logoUrl.startsWith("/")) return true;
  if (logoUrl.startsWith("data:")) return true;
  return /^https:\/\/[^/]+(?:\/[^?#]*)?\/uploads\/[^/?#]+(?:[?#].*)?$/i.test(
    logoUrl,
  );
}

function getBadgeLabel(platformKey: string, name: string): string {
  const preset = PLATFORM_BADGE_STYLES[platformKey]?.label;
  if (preset) return preset;

  const compact = name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return compact || name.charAt(0).toUpperCase() || "?";
}

interface PlatformLogoBadgeProps {
  platformKey: string;
  name: string;
  logoUrl?: string;
  className?: string;
  imageClassName?: string;
  labelClassName?: string;
}

export default function PlatformLogoBadge({
  platformKey,
  name,
  logoUrl,
  className = "",
  imageClassName = "",
  labelClassName = "",
}: PlatformLogoBadgeProps) {
  const [failedLogoUrls, setFailedLogoUrls] = useState<Set<string>>(
    () => new Set(),
  );
  const normalizedPlatformKey = platformKey.trim().toLowerCase();
  const officialLogo = getOfficialPlatformLogo(normalizedPlatformKey);
  const directLogoUrl = canUseDirectLogo(logoUrl) ? logoUrl : undefined;
  const logoCandidates = [
    officialLogo
      ? { src: officialLogo.src, background: officialLogo.background }
      : undefined,
    directLogoUrl ? { src: directLogoUrl } : undefined,
    officialLogo
      ? { src: officialLogo.remoteSrc, background: officialLogo.background }
      : undefined,
  ].filter(
    (
      candidate,
    ): candidate is {
      src: string;
      background?: string;
    } => Boolean(candidate?.src),
  );
  const logoCandidateKey = logoCandidates
    .map((candidate) => candidate.src)
    .join("\n");
  const resolvedLogo = logoCandidates.find(
    (candidate) => !failedLogoUrls.has(candidate.src),
  );

  useEffect(() => {
    setFailedLogoUrls(new Set());
  }, [logoCandidateKey]);

  if (resolvedLogo) {
    return (
      <span
        className={cn(
          "overflow-hidden bg-white shadow-sm ring-1 ring-black/[0.06]",
          className,
        )}
        style={{
          background: resolvedLogo.background,
        }}
        title={name}
      >
        <img
          src={resolvedLogo.src}
          alt={name}
          loading="lazy"
          decoding="async"
          className={cn("h-full w-full object-contain p-0.5", imageClassName)}
          onError={() => {
            setFailedLogoUrls((current) => {
              const next = new Set(current);
              next.add(resolvedLogo.src);
              return next;
            });
          }}
        />
      </span>
    );
  }

  const style = PLATFORM_BADGE_STYLES[normalizedPlatformKey] || {
    background: "linear-gradient(135deg, #f2f4f7, #dfe5ec)",
    text: "#445066",
  };

  return (
    <div
      className={cn(
        "overflow-hidden shadow-sm ring-1 ring-black/[0.05]",
        className,
      )}
      style={{
        background: style.background,
        color: style.text,
      }}
      aria-label={name}
      title={name}
    >
      <span className={labelClassName}>
        {getBadgeLabel(normalizedPlatformKey, name)}
      </span>
    </div>
  );
}
