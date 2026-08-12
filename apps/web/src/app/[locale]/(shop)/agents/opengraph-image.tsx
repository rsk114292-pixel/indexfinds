import { ImageResponse } from 'next/og';
import { getSiteName } from '@/lib/site-config';

export const alt = 'IndexFinds buying agent guides';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background:
            'radial-gradient(circle at 82% 18%, rgba(255,90,60,0.34), transparent 28%), linear-gradient(135deg, #11162b 0%, #171a33 100%)',
          color: 'white',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          padding: '72px',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '980px',
            width: '100%',
          }}
        >
          <div style={{ color: '#ff7651', display: 'flex', fontSize: 30, fontWeight: 700 }}>
            {getSiteName()}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: '-3px',
              lineHeight: 1.05,
              marginTop: 34,
            }}
          >
            Find products. Compare buying agents.
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.68)',
              display: 'flex',
              fontSize: 30,
              marginTop: 30,
            }}
          >
            Independent product discovery for global shoppers
          </div>
        </div>
      </div>
    ),
    size,
  );
}
