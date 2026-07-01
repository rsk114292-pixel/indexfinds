import { UAParser } from 'ua-parser-js';
import { DeviceType } from '../enums/channel-type.enum';

interface ParsedUA {
  deviceType: DeviceType;
  browser: string | null;
  os: string | null;
}

export function parseUserAgent(userAgent: string | undefined): ParsedUA {
  if (!userAgent) {
    return { deviceType: DeviceType.DESKTOP, browser: null, os: null };
  }

  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  const browser = parser.getBrowser();
  const os = parser.getOS();

  let deviceType: DeviceType;
  switch (device.type) {
    case 'mobile':
      deviceType = DeviceType.MOBILE;
      break;
    case 'tablet':
      deviceType = DeviceType.TABLET;
      break;
    default:
      deviceType = DeviceType.DESKTOP;
  }

  const browserStr =
    browser.name && browser.version
      ? `${browser.name} ${browser.version}`
      : browser.name || null;

  const osStr =
    os.name && os.version ? `${os.name} ${os.version}` : os.name || null;

  return { deviceType, browser: browserStr, os: osStr };
}
