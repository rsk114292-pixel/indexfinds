import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(SCRIPT_DIR, "../public/images/agents");

// Keep these sources on the platforms' own domains. The UI serves local copies
// so opening the agent picker never depends on 21 third-party requests.
const LOGO_SOURCES = {
  loongbuy: {
    source: "https://www.loongbuy.com/favicon.ico",
    filename: "loongbuy.ico",
  },
  kakobuy: {
    source: "https://kakobuy.com/favicon.ico",
    filename: "kakobuy.ico",
  },
  lovegobuy: {
    source: "https://www.lovegobuy.com/favicon.ico",
    filename: "lovegobuy.ico",
  },
  litbuy: {
    source: "https://litbuy.com/favicon-new.ico",
    filename: "litbuy.png",
  },
  joyagoo: {
    source:
      "https://mgt.joyagoo.com/wp-content/themes/joyabuy/assets/img/joyagoo-logo.png",
    filename: "joyagoo.png",
  },
  sugargoo: {
    source: "https://www.sugargoo.com/favicon.ico",
    filename: "sugargoo.png",
  },
  rizzitgo: {
    source: "https://rizzitgo.com/favicon.png",
    filename: "rizzitgo.png",
  },
  oopbuy: {
    source: "https://oopbuy.com/favicon.png",
    filename: "oopbuy.png",
  },
  superbuy: {
    source:
      "https://cdn.superbuy.com/starit-superbuy/dist/img/favicon/favicon.svg",
    filename: "superbuy.svg",
  },
  usfans: {
    source: "https://www.usfans.com/favicon.png",
    filename: "usfans.png",
  },
  hipobuy: {
    source: "https://hipobuy.com/static/favicon/64x64.png",
    filename: "hipobuy.png",
  },
  boonbuy: {
    source: "https://boonbuy.com/favicon.ico",
    filename: "boonbuy.png",
  },
  cssbuy: {
    source: "https://www.cssbuy.com/favicon.ico",
    filename: "cssbuy.ico",
  },
  pikobuy: {
    source: "https://www.pikobuy.com/favicon.ico",
    filename: "pikobuy.ico",
  },
  esgobuy: {
    source: "https://www.esgobuy.com/img/es-logo-white.DWuBym1F.svg",
    filename: "esgobuy.svg",
  },
  hubbuycn: {
    source: "https://www.hubbuycn.com/favicon.ico",
    filename: "hubbuycn.png",
  },
  fishgoo: {
    source: "https://www.fishgoo.com/favicon.ico",
    filename: "fishgoo.ico",
  },
  mycnbox: {
    source: "https://mycnbox.com/logo.ico",
    filename: "mycnbox.ico",
  },
  ootdbuy: {
    source: "https://ootdbuy.com/favicon.ico",
    filename: "ootdbuy.ico",
  },
  fansbuy: {
    source: "https://fansbuy.com/favicon2.ico",
    filename: "fansbuy.png",
  },
  lolobuy: {
    source: "https://www.lolobuy.com/loloBuyIcon.png",
    filename: "lolobuy.png",
  },
};

function detectExtension(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    return ".png";
  }
  if (bytes.subarray(0, 4).equals(Buffer.from("00000100", "hex"))) {
    return ".ico";
  }
  if (bytes.subarray(0, 512).toString("utf8").includes("<svg")) {
    return ".svg";
  }
  return undefined;
}

await mkdir(OUTPUT_DIR, { recursive: true });

for (const [platformKey, { source, filename }] of Object.entries(LOGO_SOURCES)) {
  const response = await fetch(source, {
    headers: {
      Accept: "image/avif,image/webp,image/svg+xml,image/png,image/*,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127 Safari/537.36",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`${platformKey}: ${response.status} ${response.statusText}`);
  }

  let bytes = Buffer.from(await response.arrayBuffer());
  const detectedExtension = detectExtension(bytes);
  if (!detectedExtension) {
    throw new Error(`${platformKey}: official URL did not return a supported image`);
  }

  if (platformKey === "joyagoo") {
    // The official file includes large decorative arrows on both sides. Keep
    // the central official wordmark so it remains legible inside a square badge.
    bytes = await sharp(bytes)
      .extract({ left: 480, top: 0, width: 640, height: 320 })
      .png()
      .toBuffer();
  } else if (path.extname(filename) !== detectedExtension) {
    throw new Error(
      `${platformKey}: expected ${path.extname(filename)}, received ${detectedExtension}`,
    );
  }

  await writeFile(path.join(OUTPUT_DIR, filename), bytes);
  console.log(`${filename} <- ${source}`);
}
